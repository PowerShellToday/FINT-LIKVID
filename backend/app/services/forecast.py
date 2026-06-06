import calendar
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.crud.settings import (
    get_manual_balance,
    get_or_create_defaults,
    list_expenses,
    list_future_invoices,
    list_periodic_expenses,
    list_recurring,
    list_salary,
    list_tax_social,
)
from app.schemas.forecast import ForecastCategory, ForecastEntry, ForecastResponse
from app.schemas.wint import AccountBalance, IncomingInvoice, Invoice
from app.services import cache_service, recurring as recurring_svc, vat as vat_svc


def _salary_pay_day(year: int, month: int) -> date:
    return date(year, month, 25)


def _tax_pay_day(year: int, month: int) -> date:
    """Return the 12th of the given month, or 17th if August."""
    return date(year, month, 17 if month == 8 else 12)


def _add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def build_forecast(db: Session, horizon_months: int, today: date | None = None) -> ForecastResponse:
    today = today or date.today()
    horizon_end = _add_months(today, horizon_months)

    # ── Load from cache ────────────────────────────────────────────────────────
    inv_result = cache_service.read_cache(db, "invoices")
    inc_result = cache_service.read_cache(db, "incoming_invoices")
    bal_result = cache_service.read_cache(db, "account_balance")

    if not all([inv_result, inc_result, bal_result]):
        raise HTTPException(
            503,
            "Cache not yet populated — trigger POST /api/cache/refresh first.",
        )

    inv_data, inv_fetched = inv_result
    inc_data, inc_fetched = inc_result
    bal_data, bal_fetched = bal_result

    invoices = [Invoice.model_validate(i) for i in inv_data]
    incoming = [IncomingInvoice.model_validate(i) for i in inc_data]
    balance = AccountBalance.model_validate(bal_data)
    data_last_fetched_at = min(inv_fetched, inc_fetched)

    entries: list[ForecastEntry] = []

    # Pre-load future invoice plans — used in both section 3 (VAT) and section 5
    future_invoice_plans = list_future_invoices(db)

    # ── Suppress plans that are covered by actual outgoing invoices ────────────
    # When a planned invoice has turned into a real invoice (same customer, same
    # payment month), the actual entry supersedes the forecast entry.  We compute
    # the suppressed set once here so both the VAT section and the plan section
    # can skip those plans consistently.
    suppressed_plan_ids: set[int] = set()
    for plan in future_invoice_plans:
        if not plan.customer_name:
            continue
        plan_payment_date = plan.invoice_date + timedelta(days=plan.payment_delay_days)
        for inv in invoices:
            if (
                inv.CustomerName
                and inv.CustomerName.strip().lower() == plan.customer_name.strip().lower()
                and inv.DueDate is not None
                and inv.DueDate.year == plan_payment_date.year
                and inv.DueDate.month == plan_payment_date.month
            ):
                suppressed_plan_ids.add(plan.id)
                break

    # ── 1. Actual incoming invoices ────────────────────────────────────────────
    for inv in incoming:
        entry_date = inv.PaymentDate or inv.DueDate or inv.InvoiceDate
        if entry_date is None or entry_date > horizon_end:
            continue
        entries.append(ForecastEntry(
            date=entry_date,
            amount=-inv.Amount,
            category=ForecastCategory.incoming_invoice,
            type="actual",
            label=inv.SupplierName or "Leverantör",
            source_id=inv.Id,
        ))

    # ── 2. Actual outgoing invoices ────────────────────────────────────────────
    for inv in invoices:
        if inv.LeftToPay <= 0 or inv.DueDate is None or inv.DueDate > horizon_end:
            continue
        entries.append(ForecastEntry(
            date=inv.DueDate,
            amount=inv.LeftToPay,
            category=ForecastCategory.outgoing_invoice,
            type="actual",
            label=inv.CustomerName or "Kund",
            source_id=inv.Id,
        ))

    # ── 3. VAT entries ─────────────────────────────────────────────────────────
    # Group by posting quarter → compute net VAT per due date
    outgoing_vat: dict[date, Decimal] = defaultdict(Decimal)
    incoming_vat: dict[date, Decimal] = defaultdict(Decimal)

    for inv in invoices:
        if inv.PostingDate:
            due = vat_svc.vat_due_date(inv.PostingDate)
            outgoing_vat[due] += inv.TotalTax

    for inv in incoming:
        if inv.InvoiceDate:
            due = vat_svc.vat_due_date(inv.InvoiceDate)
            incoming_vat[due] += inv.Tax

    # VAT collected on planned future invoices (invoice_date determines the VAT quarter)
    # Skip plans that are already covered by an actual invoice — the real invoice's
    # TotalTax is already counted in the outgoing_vat loop above.
    for plan in future_invoice_plans:
        if plan.id in suppressed_plan_ids:
            continue
        vat_amount = plan.billable_hours * plan.hourly_rate * Decimal("0.25")
        due = vat_svc.vat_due_date(plan.invoice_date)
        outgoing_vat[due] += vat_amount

    for due_date in set(outgoing_vat) | set(incoming_vat):
        if due_date > horizon_end:
            continue
        # Net: incoming VAT we reclaim offsets outgoing VAT we owe → outflow is negative
        net = incoming_vat.get(due_date, Decimal(0)) - outgoing_vat.get(due_date, Decimal(0))
        entries.append(ForecastEntry(
            date=due_date,
            amount=net,
            category=ForecastCategory.vat,
            type="actual",
            label="Moms",
        ))

    # ── 4. Recurring invoice forecasts ─────────────────────────────────────────
    recurring_configs = list_recurring(db)
    for raw in recurring_svc.project_recurring_invoices(recurring_configs, incoming, horizon_end, today):
        entries.append(ForecastEntry(
            date=raw["date"],
            amount=raw["amount"],
            category=ForecastCategory.recurring_invoice,
            type="forecast",
            label=raw["label"],
            source_id=raw["source_id"],
        ))

    # ── 5. Future outgoing invoice plans ──────────────────────────────────────
    for plan in future_invoice_plans:
        if plan.id in suppressed_plan_ids:
            continue  # actual invoice already covers this plan
        amount = plan.billable_hours * plan.hourly_rate * Decimal("1.25")
        payment_date = plan.invoice_date + timedelta(days=plan.payment_delay_days)
        if payment_date > horizon_end:
            continue
        entries.append(ForecastEntry(
            date=payment_date,
            amount=amount,
            category=ForecastCategory.future_invoice,
            type="forecast",
            label=f"Planerad faktura – {plan.customer_name or plan.plan_month.strftime('%Y-%m')}",
            source_id=plan.id,
        ))

    # ── 6. One-off expenses ────────────────────────────────────────────────────
    for expense in list_expenses(db):
        if expense.planned_date > horizon_end:
            continue
        entries.append(ForecastEntry(
            date=expense.planned_date,
            amount=-expense.amount,
            category=ForecastCategory.one_off_expense,
            type="forecast",
            label=expense.label,
            source_id=expense.id,
        ))

    # ── 7a. Periodic expenses ──────────────────────────────────────────────────
    for pe in list_periodic_expenses(db):
        cutoff = min(pe.end_date, horizon_end) if pe.end_date else horizon_end
        if pe.recurrence_type == "days" and pe.interval_days:
            cursor = pe.start_date
            while cursor <= cutoff:
                if cursor >= today:
                    entries.append(ForecastEntry(
                        date=cursor,
                        amount=-pe.amount,
                        category=ForecastCategory.periodic_expense,
                        type="forecast",
                        label=pe.label,
                        source_id=pe.id,
                    ))
                cursor += timedelta(days=pe.interval_days)
        elif pe.recurrence_type == "monthly" and pe.day_of_month:
            cursor = date(pe.start_date.year, pe.start_date.month, 1)
            while cursor <= cutoff:
                day = min(pe.day_of_month, calendar.monthrange(cursor.year, cursor.month)[1])
                entry_date = date(cursor.year, cursor.month, day)
                if pe.start_date <= entry_date <= cutoff and entry_date >= today:
                    entries.append(ForecastEntry(
                        date=entry_date,
                        amount=-pe.amount,
                        category=ForecastCategory.periodic_expense,
                        type="forecast",
                        label=pe.label,
                        source_id=pe.id,
                    ))
                cursor = _add_months(cursor, 1)

    # ── 7. Salary ──────────────────────────────────────────────────────────────
    salary_settings = list_salary(db)
    if salary_settings:
        cursor = date(today.year, today.month, 1)
        while cursor <= horizon_end:
            active = [s for s in salary_settings if s.effective_from <= cursor]
            if active:
                setting = max(active, key=lambda s: s.effective_from)
                pay_date = _salary_pay_day(cursor.year, cursor.month)
                if pay_date <= horizon_end:
                    entries.append(ForecastEntry(
                        date=pay_date,
                        amount=-setting.net_monthly_amount,
                        category=ForecastCategory.salary,
                        type="forecast",
                        label="Lön",
                        source_id=setting.id,
                    ))
            cursor = _add_months(cursor, 1)

    # ── 8. Tax / social costs ──────────────────────────────────────────────────
    tax_settings = list_tax_social(db)
    if tax_settings:
        cursor = date(today.year, today.month, 1)
        while cursor <= horizon_end:
            active = [s for s in tax_settings if s.effective_from <= cursor]
            if active:
                setting = max(active, key=lambda s: s.effective_from)
                pay_date = _tax_pay_day(cursor.year, cursor.month)
                if pay_date <= horizon_end:
                    entries.append(ForecastEntry(
                        date=pay_date,
                        amount=-setting.net_monthly_amount,
                        category=ForecastCategory.tax_social,
                        type="forecast",
                        label="Skatt & sociala avgifter",
                        source_id=setting.id,
                    ))
            cursor = _add_months(cursor, 1)

    entries.sort(key=lambda e: e.date)

    # ── Balance: manual override takes precedence over API ─────────────────────
    manual = get_manual_balance(db)
    if manual:
        account_balance = manual.amount
        balance_source = "manual"
        balance_updated_at = manual.set_at
    else:
        account_balance = balance.Balance
        balance_source = "api"
        balance_updated_at = bal_fetched

    return ForecastResponse(
        entries=entries,
        account_balance=account_balance,
        balance_source=balance_source,
        balance_updated_at=balance_updated_at,
        generated_at=datetime.now(timezone.utc).replace(tzinfo=None),
        horizon_months=horizon_months,
        data_last_fetched_at=data_last_fetched_at,
    )

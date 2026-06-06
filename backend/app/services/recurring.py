from datetime import date, timedelta
from decimal import Decimal

from app.models.settings import RecurringInvoiceConfig
from app.schemas.wint import IncomingInvoice


def _add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    import calendar
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def project_recurring_invoices(
    configs: list[RecurringInvoiceConfig],
    actual_invoices: list[IncomingInvoice],
    horizon_end: date,
    today: date,
) -> list[dict]:
    """Return forecast entry dicts for all enabled recurring invoice configs."""
    min_future = today + timedelta(days=14)
    entries = []

    for cfg in configs:
        if not cfg.enabled:
            continue

        # Find the most recent actual invoice matching this supplier.
        # If match_amount is set, narrow to invoices within ±25 % of that amount
        # so two configs for the same supplier (e.g. car vs. company insurance
        # at different intervals) each anchor to their own invoice series.
        matching = [
            inv for inv in actual_invoices
            if inv.SupplierName and cfg.supplier_name.lower() in inv.SupplierName.lower()
            and inv.InvoiceDate is not None
            and (
                cfg.match_amount is None
                or (cfg.match_amount > 0 and abs(inv.Amount - cfg.match_amount) / cfg.match_amount <= Decimal("0.25"))
            )
        ]
        if not matching:
            continue

        last_actual = max(matching, key=lambda inv: inv.InvoiceDate)
        base_amount = cfg.override_total if cfg.override_total is not None else last_actual.Amount
        base_vat = cfg.override_vat if cfg.override_vat is not None else last_actual.Tax

        # Base on payment/due date so projected dates match actual cash-out timing
        base_date = last_actual.PaymentDate or last_actual.DueDate or last_actual.InvoiceDate
        next_date = _add_months(base_date, cfg.interval_months)
        while next_date <= horizon_end:
            if next_date >= min_future:
                entries.append({
                    "date": next_date,
                    "amount": -base_amount,  # outflow
                    "category": "recurring_invoice",
                    "type": "forecast",
                    "label": cfg.supplier_name,
                    "source_id": cfg.id,
                    "vat": base_vat,
                })
            next_date = _add_months(next_date, cfg.interval_months)

    return entries

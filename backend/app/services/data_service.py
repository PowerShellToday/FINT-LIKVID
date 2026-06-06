"""
data_service.py — JSON export / import for all user settings.

NEVER exports: Wint API credentials, auth password hash, cache data.
"""
import logging
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.crud.app_config import get_value, set_many
from app.models.settings import (
    FutureInvoicePlan,
    InvoiceCustomer,
    ManualBalanceOverride,
    OneOffExpense,
    PeriodicExpense,
    RecurringInvoiceConfig,
    SalarySetting,
    TaxSocialSetting,
    UserDefaults,
)

logger = logging.getLogger(__name__)

# Safe app_config keys — credentials and auth hash are intentionally excluded
EXPORT_CONFIG_KEYS = (
    "wint_api_base_url",
    "wint_bank_account_number",
    "wint_api_timeout_seconds",
    "cache_refresh_interval_hours",
    "default_forecast_months",
    "max_forecast_months",
    "currency",
    "demo_mode",
)


def _get_schema_version(db: Session) -> str:
    row = db.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).fetchone()
    return row[0] if row else "unknown"


def _str(val) -> str | None:
    return str(val) if val is not None else None


# ── Export ────────────────────────────────────────────────────────────────────

def export_data(db: Session) -> dict:
    """Build the full export payload. Never includes credentials or auth hash."""

    # App config — safe keys only
    app_config: dict = {}
    for key in EXPORT_CONFIG_KEYS:
        raw = get_value(db, key, None)
        # Coerce numeric-looking values to their proper types for readability
        if raw is not None and key in (
            "wint_api_timeout_seconds",
            "cache_refresh_interval_hours",
            "default_forecast_months",
            "max_forecast_months",
        ):
            app_config[key] = int(raw)
        elif raw is not None and key == "demo_mode":
            app_config[key] = raw == "true"
        else:
            app_config[key] = raw

    # Salary settings
    salary = [
        {"net_monthly_amount": str(r.net_monthly_amount), "effective_from": str(r.effective_from)}
        for r in db.query(SalarySetting).order_by(SalarySetting.effective_from).all()
    ]

    # Tax / social settings
    tax_social = [
        {"net_monthly_amount": str(r.net_monthly_amount), "effective_from": str(r.effective_from)}
        for r in db.query(TaxSocialSetting).order_by(TaxSocialSetting.effective_from).all()
    ]

    # Recurring invoice configs
    recurring = [
        {
            "supplier_name": r.supplier_name,
            "interval_months": r.interval_months,
            "override_total": _str(r.override_total),
            "override_vat": _str(r.override_vat),
            "match_amount": _str(r.match_amount),
            "enabled": r.enabled,
        }
        for r in db.query(RecurringInvoiceConfig).all()
    ]

    # Invoice customers — include `id` so future_invoice_plans FK can be remapped on import
    customers = [
        {
            "id": r.id,
            "name": r.name,
            "hourly_rate": str(r.hourly_rate),
            "payment_delay_days": r.payment_delay_days,
            "invoice_day_rule": r.invoice_day_rule,
        }
        for r in db.query(InvoiceCustomer).order_by(InvoiceCustomer.id).all()
    ]

    # Future invoice plans
    plans = [
        {
            "plan_month": str(r.plan_month),
            "billable_hours": str(r.billable_hours),
            "hourly_rate": str(r.hourly_rate),
            "invoice_date": str(r.invoice_date),
            "payment_delay_days": r.payment_delay_days,
            "customer_id": r.customer_id,   # remapped on import
            "customer_name": r.customer_name,
            "day_fractions": r.day_fractions,
        }
        for r in db.query(FutureInvoicePlan).order_by(FutureInvoicePlan.plan_month).all()
    ]

    # One-off expenses
    expenses = [
        {
            "label": r.label,
            "amount": str(r.amount),
            "planned_date": str(r.planned_date),
        }
        for r in db.query(OneOffExpense).order_by(OneOffExpense.planned_date).all()
    ]

    # Periodic expenses
    periodic = [
        {
            "label": r.label,
            "amount": str(r.amount),
            "recurrence_type": r.recurrence_type,
            "interval_days": r.interval_days,
            "day_of_month": r.day_of_month,
            "start_date": str(r.start_date),
            "end_date": str(r.end_date) if r.end_date else None,
        }
        for r in db.query(PeriodicExpense).order_by(PeriodicExpense.label).all()
    ]

    # User defaults (singleton)
    ud = db.query(UserDefaults).filter_by(id=1).first()
    user_defaults = (
        {
            "default_hourly_rate": _str(ud.default_hourly_rate),
            "default_payment_delay_days": ud.default_payment_delay_days,
        }
        if ud else None
    )

    # Manual balance override (singleton)
    mbo = db.query(ManualBalanceOverride).filter_by(id=1).first()
    manual_balance = (
        {"amount": str(mbo.amount), "set_at": mbo.set_at.isoformat()}
        if mbo else None
    )

    return {
        "schema_version": _get_schema_version(db),
        "exported_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
        "app_config": app_config,
        "salary_settings": salary,
        "tax_social_settings": tax_social,
        "recurring_invoice_configs": recurring,
        "invoice_customers": customers,
        "future_invoice_plans": plans,
        "one_off_expenses": expenses,
        "periodic_expenses": periodic,
        "user_defaults": user_defaults,
        "manual_balance_override": manual_balance,
    }


# ── Import ────────────────────────────────────────────────────────────────────

def import_data(db: Session, payload: dict) -> dict:
    """
    Validate and restore settings from an export payload.
    Runs entirely in one transaction — rolls back on any error.
    Returns counts of imported rows per table.
    """
    # ── Validate schema version ───────────────────────────────────────────────
    current = _get_schema_version(db)
    backup_version = payload.get("schema_version", "")

    if backup_version > current:
        raise ValueError(
            f"Säkerhetskopian är gjord med en nyare version av appen "
            f"({backup_version}) än den installerade ({current}). "
            f"Uppdatera appen och försök igen."
        )

    counts: dict[str, int] = {}

    # ── Wipe existing settings ────────────────────────────────────────────────
    for model in (
        FutureInvoicePlan, InvoiceCustomer, OneOffExpense, PeriodicExpense,
        RecurringInvoiceConfig, SalarySetting, TaxSocialSetting,
        UserDefaults, ManualBalanceOverride,
    ):
        db.query(model).delete()

    # ── Salary ────────────────────────────────────────────────────────────────
    salary_rows = payload.get("salary_settings", [])
    for r in salary_rows:
        db.add(SalarySetting(
            net_monthly_amount=Decimal(r["net_monthly_amount"]),
            effective_from=r["effective_from"],
        ))
    counts["salary_settings"] = len(salary_rows)

    # ── Tax / social ──────────────────────────────────────────────────────────
    tax_rows = payload.get("tax_social_settings", [])
    for r in tax_rows:
        db.add(TaxSocialSetting(
            net_monthly_amount=Decimal(r["net_monthly_amount"]),
            effective_from=r["effective_from"],
        ))
    counts["tax_social_settings"] = len(tax_rows)

    # ── Recurring invoice configs ─────────────────────────────────────────────
    recurring_rows = payload.get("recurring_invoice_configs", [])
    for r in recurring_rows:
        db.add(RecurringInvoiceConfig(
            supplier_name=r["supplier_name"],
            interval_months=r["interval_months"],
            override_total=Decimal(r["override_total"]) if r.get("override_total") else None,
            override_vat=Decimal(r["override_vat"]) if r.get("override_vat") else None,
            match_amount=Decimal(r["match_amount"]) if r.get("match_amount") else None,
            enabled=r.get("enabled", True),
        ))
    counts["recurring_invoice_configs"] = len(recurring_rows)

    # ── Invoice customers — insert first and record old→new ID map ────────────
    customer_rows = payload.get("invoice_customers", [])
    old_to_new_id: dict[int, int] = {}
    for r in customer_rows:
        obj = InvoiceCustomer(
            name=r["name"],
            hourly_rate=Decimal(r["hourly_rate"]),
            payment_delay_days=r["payment_delay_days"],
            invoice_day_rule=r.get("invoice_day_rule", "last_day"),
        )
        db.add(obj)
        db.flush()  # get auto-generated id
        if r.get("id") is not None:
            old_to_new_id[r["id"]] = obj.id
    counts["invoice_customers"] = len(customer_rows)

    # ── Future invoice plans — remap customer_id ──────────────────────────────
    plan_rows = payload.get("future_invoice_plans", [])
    for r in plan_rows:
        old_cid = r.get("customer_id")
        new_cid = old_to_new_id.get(old_cid) if old_cid is not None else None
        db.add(FutureInvoicePlan(
            plan_month=r["plan_month"],
            billable_hours=Decimal(r["billable_hours"]),
            hourly_rate=Decimal(r["hourly_rate"]),
            invoice_date=r["invoice_date"],
            payment_delay_days=r["payment_delay_days"],
            customer_id=new_cid,
            customer_name=r.get("customer_name"),
            day_fractions=r.get("day_fractions"),
        ))
    counts["future_invoice_plans"] = len(plan_rows)

    # ── One-off expenses ──────────────────────────────────────────────────────
    expense_rows = payload.get("one_off_expenses", [])
    for r in expense_rows:
        db.add(OneOffExpense(
            label=r["label"],
            amount=Decimal(r["amount"]),
            planned_date=r["planned_date"],
        ))
    counts["one_off_expenses"] = len(expense_rows)

    # ── Periodic expenses ─────────────────────────────────────────────────────
    periodic_rows = payload.get("periodic_expenses", [])
    for r in periodic_rows:
        db.add(PeriodicExpense(
            label=r["label"],
            amount=Decimal(r["amount"]),
            recurrence_type=r["recurrence_type"],
            interval_days=r.get("interval_days"),
            day_of_month=r.get("day_of_month"),
            start_date=r["start_date"],
            end_date=r.get("end_date"),
        ))
    counts["periodic_expenses"] = len(periodic_rows)

    # ── User defaults (singleton) ─────────────────────────────────────────────
    ud = payload.get("user_defaults")
    if ud is not None:
        db.add(UserDefaults(
            id=1,
            default_hourly_rate=Decimal(ud["default_hourly_rate"]) if ud.get("default_hourly_rate") else None,
            default_payment_delay_days=ud.get("default_payment_delay_days"),
        ))
        counts["user_defaults"] = 1

    # ── Manual balance override (singleton) ───────────────────────────────────
    mbo = payload.get("manual_balance_override")
    if mbo is not None:
        db.add(ManualBalanceOverride(
            id=1,
            amount=Decimal(mbo["amount"]),
            set_at=datetime.fromisoformat(mbo["set_at"]),
        ))
        counts["manual_balance_override"] = 1

    # ── App config (safe keys only) ───────────────────────────────────────────
    config_payload = payload.get("app_config", {})
    safe_pairs: dict[str, str] = {}
    for key in EXPORT_CONFIG_KEYS:
        if key in config_payload and config_payload[key] is not None:
            safe_pairs[key] = str(config_payload[key]).lower() if isinstance(config_payload[key], bool) else str(config_payload[key])
    if safe_pairs:
        set_many(db, safe_pairs)

    db.commit()
    logger.info("Import complete: %s", counts)
    return {"imported": counts}

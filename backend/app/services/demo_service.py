"""
demo_service.py — seeds all settings and cache tables with demo data.

Called on POST /api/setup/demo (initial seeding) and on every cache refresh
when demo_mode is active (re-seeds with fresh date-relative values).
"""
import logging
from decimal import Decimal

from sqlalchemy.orm import Session

from app.data import demo_data
from app.models.settings import (
    FutureInvoicePlan,
    InvoiceCustomer,
    ManualBalanceOverride,
    OneOffExpense,
    PeriodicExpense,
    RecurringInvoiceConfig,
    SalarySetting,
    TaxSocialSetting,
)
from app.services import cache_service

logger = logging.getLogger(__name__)


def _truncate_settings(db: Session) -> None:
    """Delete all rows from every user-editable settings table."""
    for model in (
        SalarySetting,
        TaxSocialSetting,
        RecurringInvoiceConfig,
        InvoiceCustomer,
        FutureInvoicePlan,
        OneOffExpense,
        PeriodicExpense,
        ManualBalanceOverride,
    ):
        db.query(model).delete()
    db.commit()


def seed_demo(db: Session) -> None:
    """
    Fully re-seeds all demo settings and cache data.
    Safe to call repeatedly — truncates settings tables first.
    Does NOT touch app_config or credentials.
    """
    logger.info("Seeding demo data...")
    _truncate_settings(db)

    # Salary
    s = demo_data.DEMO_SALARY
    db.add(SalarySetting(
        net_monthly_amount=Decimal(s["net_monthly_amount"]),
        effective_from=s["effective_from"],
    ))

    # Tax / Social
    ts = demo_data.DEMO_TAX_SOCIAL
    db.add(TaxSocialSetting(
        net_monthly_amount=Decimal(ts["net_monthly_amount"]),
        effective_from=ts["effective_from"],
    ))

    # Recurring invoice configs
    for r in demo_data.DEMO_RECURRING:
        db.add(RecurringInvoiceConfig(
            supplier_name=r["supplier_name"],
            interval_months=r["interval_months"],
            override_total=Decimal(r["override_total"]) if r["override_total"] else None,
            override_vat=Decimal(r["override_vat"]) if r["override_vat"] else None,
            match_amount=Decimal(r["match_amount"]) if r["match_amount"] else None,
            enabled=r["enabled"],
        ))

    # Invoice customer
    c = demo_data.DEMO_INVOICE_CUSTOMER
    db.add(InvoiceCustomer(
        name=c["name"],
        hourly_rate=Decimal(c["hourly_rate"]),
        payment_delay_days=c["payment_delay_days"],
        invoice_day_rule=c["invoice_day_rule"],
    ))

    # Future invoice plans
    for fp in demo_data.build_demo_future_invoice_plans():
        db.add(FutureInvoicePlan(
            plan_month=fp["plan_month"],
            billable_hours=Decimal(fp["billable_hours"]),
            hourly_rate=Decimal(fp["hourly_rate"]),
            invoice_date=fp["invoice_date"],
            payment_delay_days=fp["payment_delay_days"],
            customer_name=fp["customer_name"],
            day_fractions=fp["day_fractions"],
        ))

    # One-off expenses
    for exp in demo_data.build_demo_one_off_expenses():
        db.add(OneOffExpense(
            label=exp["label"],
            amount=Decimal(exp["amount"]),
            planned_date=exp["planned_date"],
        ))

    # Periodic expenses
    for pe in demo_data.build_demo_periodic_expenses():
        db.add(PeriodicExpense(
            label=pe["label"],
            amount=Decimal(pe["amount"]),
            recurrence_type=pe["recurrence_type"],
            interval_days=pe["interval_days"],
            day_of_month=pe["day_of_month"],
            start_date=pe["start_date"],
            end_date=pe["end_date"],
        ))

    db.commit()

    # Seed Wint API cache with fresh date-relative demo data
    cache_service.write_cache(db, "invoices", demo_data.build_demo_invoices())
    cache_service.write_cache(db, "incoming_invoices", demo_data.build_demo_incoming_invoices())
    cache_service.write_cache(db, "account_balance", demo_data.build_demo_account_balance())

    logger.info("Demo data seeded successfully.")

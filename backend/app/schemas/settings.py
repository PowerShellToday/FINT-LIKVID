from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Salary ────────────────────────────────────────────────────────────────────

class SalarySettingCreate(_Base):
    net_monthly_amount: Decimal
    effective_from: date


class SalarySettingUpdate(_Base):
    net_monthly_amount: Decimal | None = None
    effective_from: date | None = None


class SalarySettingResponse(SalarySettingCreate):
    id: int
    created_at: datetime
    updated_at: datetime


# ── Tax / Social ──────────────────────────────────────────────────────────────

class TaxSocialSettingCreate(_Base):
    net_monthly_amount: Decimal
    effective_from: date


class TaxSocialSettingUpdate(_Base):
    net_monthly_amount: Decimal | None = None
    effective_from: date | None = None


class TaxSocialSettingResponse(TaxSocialSettingCreate):
    id: int
    created_at: datetime
    updated_at: datetime


# ── Recurring invoice config ──────────────────────────────────────────────────

class RecurringInvoiceConfigCreate(_Base):
    supplier_name: str
    interval_months: int
    override_total: Decimal | None = None
    override_vat: Decimal | None = None
    match_amount: Decimal | None = None
    enabled: bool = True


class RecurringInvoiceConfigUpdate(_Base):
    supplier_name: str | None = None
    interval_months: int | None = None
    override_total: Decimal | None = None
    override_vat: Decimal | None = None
    match_amount: Decimal | None = None
    enabled: bool | None = None


class RecurringInvoiceConfigResponse(RecurringInvoiceConfigCreate):
    id: int
    created_at: datetime
    updated_at: datetime


# ── Invoice customer ──────────────────────────────────────────────────────────

class InvoiceCustomerCreate(_Base):
    name: str
    hourly_rate: Decimal
    payment_delay_days: int
    invoice_day_rule: str  # last_day | last_working_day | first_day_next_month | first_working_day_next_month


class InvoiceCustomerUpdate(_Base):
    name: str | None = None
    hourly_rate: Decimal | None = None
    payment_delay_days: int | None = None
    invoice_day_rule: str | None = None


class InvoiceCustomerResponse(InvoiceCustomerCreate):
    id: int
    created_at: datetime
    updated_at: datetime


# ── Future invoice plan ───────────────────────────────────────────────────────

class FutureInvoicePlanCreate(_Base):
    plan_month: date
    billable_hours: Decimal
    hourly_rate: Decimal
    invoice_date: date
    payment_delay_days: int
    customer_id: int | None = None
    customer_name: str | None = None
    day_fractions: str | None = None


class FutureInvoicePlanUpdate(_Base):
    plan_month: date | None = None
    billable_hours: Decimal | None = None
    hourly_rate: Decimal | None = None
    invoice_date: date | None = None
    payment_delay_days: int | None = None
    customer_id: int | None = None
    customer_name: str | None = None
    day_fractions: str | None = None


class FutureInvoicePlanResponse(FutureInvoicePlanCreate):
    id: int
    created_at: datetime
    updated_at: datetime


# ── One-off expense ───────────────────────────────────────────────────────────

class OneOffExpenseCreate(_Base):
    label: str
    amount: Decimal
    planned_date: date


class OneOffExpenseUpdate(_Base):
    label: str | None = None
    amount: Decimal | None = None
    planned_date: date | None = None


class OneOffExpenseResponse(OneOffExpenseCreate):
    id: int
    created_at: datetime
    updated_at: datetime


# ── User defaults ─────────────────────────────────────────────────────────────

class UserDefaultsUpdate(_Base):
    default_hourly_rate: Decimal | None = None
    default_payment_delay_days: int | None = None


class UserDefaultsResponse(_Base):
    id: int
    default_hourly_rate: Decimal | None
    default_payment_delay_days: int | None
    updated_at: datetime


# ── Periodic expense ──────────────────────────────────────────────────────────

class PeriodicExpenseCreate(_Base):
    label: str
    amount: Decimal
    recurrence_type: str          # "days" | "monthly"
    interval_days: int | None = None
    day_of_month: int | None = None
    start_date: date
    end_date: date | None = None


class PeriodicExpenseUpdate(_Base):
    label: str | None = None
    amount: Decimal | None = None
    recurrence_type: str | None = None
    interval_days: int | None = None
    day_of_month: int | None = None
    start_date: date | None = None
    end_date: date | None = None


class PeriodicExpenseResponse(PeriodicExpenseCreate):
    id: int
    created_at: datetime
    updated_at: datetime

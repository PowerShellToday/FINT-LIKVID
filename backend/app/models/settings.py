from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SalarySetting(Base):
    __tablename__ = "salary_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    net_monthly_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    effective_from: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class TaxSocialSetting(Base):
    __tablename__ = "tax_social_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    net_monthly_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    effective_from: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class RecurringInvoiceConfig(Base):
    __tablename__ = "recurring_invoice_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_name: Mapped[str] = mapped_column(String(255))
    interval_months: Mapped[int] = mapped_column(Integer)
    override_total: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    override_vat: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    match_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class InvoiceCustomer(Base):
    __tablename__ = "invoice_customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    hourly_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    payment_delay_days: Mapped[int] = mapped_column(Integer)
    invoice_day_rule: Mapped[str] = mapped_column(String(50), default="last_day")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class FutureInvoicePlan(Base):
    __tablename__ = "future_invoice_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_month: Mapped[date] = mapped_column(Date)
    billable_hours: Mapped[Decimal] = mapped_column(Numeric(8, 2))
    hourly_rate: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    invoice_date: Mapped[date] = mapped_column(Date)
    payment_delay_days: Mapped[int] = mapped_column(Integer)
    customer_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    day_fractions: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class OneOffExpense(Base):
    __tablename__ = "one_off_expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(String(255))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    planned_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class UserDefaults(Base):
    __tablename__ = "user_defaults"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    default_hourly_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    default_payment_delay_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class ManualBalanceOverride(Base):
    __tablename__ = "manual_balance_override"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    set_at: Mapped[datetime] = mapped_column(DateTime)


class PeriodicExpense(Base):
    __tablename__ = "periodic_expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(String(255))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    recurrence_type: Mapped[str] = mapped_column(String(10))  # "days" | "monthly"
    interval_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    day_of_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Literal

from pydantic import BaseModel


class ForecastCategory(str, Enum):
    incoming_invoice = "incoming_invoice"
    outgoing_invoice = "outgoing_invoice"
    recurring_invoice = "recurring_invoice"
    future_invoice = "future_invoice"
    one_off_expense = "one_off_expense"
    periodic_expense = "periodic_expense"
    salary = "salary"
    tax_social = "tax_social"
    vat = "vat"


class ForecastEntry(BaseModel):
    date: date
    amount: Decimal
    category: ForecastCategory
    type: Literal["actual", "forecast"]
    label: str
    source_id: int | None = None


class ForecastResponse(BaseModel):
    entries: list[ForecastEntry]
    account_balance: Decimal
    balance_source: Literal["api", "manual"] = "api"
    balance_updated_at: datetime | None = None
    generated_at: datetime
    horizon_months: int
    data_last_fetched_at: datetime | None = None

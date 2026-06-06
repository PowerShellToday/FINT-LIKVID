from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_validator


def _date_coerce(v: object) -> object:
    """Strip time component from datetime strings returned by the Wint API."""
    if isinstance(v, str) and "T" in v:
        return v.split("T")[0]
    return v


class Invoice(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    Id: int
    SerialNumber: str | None = None
    OcrText: str | None = None
    Status: str | None = None
    PostingDate: date | None = None
    DueDate: date | None = None
    TotalAmount: Decimal = Decimal("0")
    TotalTax: Decimal = Decimal("0")
    LeftToPay: Decimal = Decimal("0")
    IsTaxInvoice: bool = False
    CustomerName: str | None = None

    @field_validator("PostingDate", "DueDate", mode="before")
    @classmethod
    def coerce_date(cls, v: object) -> object:
        return _date_coerce(v)

    @field_validator("SerialNumber", "OcrText", "Status", "CustomerName", mode="before")
    @classmethod
    def coerce_str(cls, v: object) -> object:
        return None if v is None else str(v)


class IncomingInvoice(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    Id: int
    SupplierName: str | None = None
    InvoiceDate: date | None = None
    DueDate: date | None = None
    PaymentDate: date | None = None
    Amount: Decimal = Decimal("0")
    Tax: Decimal = Decimal("0")
    AmountExcludingTax: Decimal = Decimal("0")
    IsTaxInvoice: bool = False

    @field_validator("InvoiceDate", "DueDate", "PaymentDate", mode="before")
    @classmethod
    def coerce_date(cls, v: object) -> object:
        return _date_coerce(v)


class AccountBalance(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    Balance: Decimal = Decimal("0")

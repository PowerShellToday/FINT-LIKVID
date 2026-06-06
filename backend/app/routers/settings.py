import json
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.crud import settings as crud
from app.database import get_db
from app.models.cache import ApiCacheEntry
from app.schemas.settings import (
    FutureInvoicePlanCreate,
    FutureInvoicePlanResponse,
    FutureInvoicePlanUpdate,
    InvoiceCustomerCreate,
    InvoiceCustomerResponse,
    InvoiceCustomerUpdate,
    OneOffExpenseCreate,
    OneOffExpenseResponse,
    OneOffExpenseUpdate,
    PeriodicExpenseCreate,
    PeriodicExpenseResponse,
    PeriodicExpenseUpdate,
    RecurringInvoiceConfigCreate,
    RecurringInvoiceConfigResponse,
    RecurringInvoiceConfigUpdate,
    SalarySettingCreate,
    SalarySettingResponse,
    SalarySettingUpdate,
    TaxSocialSettingCreate,
    TaxSocialSettingResponse,
    TaxSocialSettingUpdate,
    UserDefaultsResponse,
    UserDefaultsUpdate,
)
from app.services.holiday_service import compute_invoice_date

router = APIRouter(prefix="/api/settings")


def _404(entity: str):
    raise HTTPException(404, f"{entity} not found")


# ── Salary ────────────────────────────────────────────────────────────────────

@router.get("/salary", response_model=list[SalarySettingResponse])
def list_salary(db: Session = Depends(get_db)):
    return crud.list_salary(db)

@router.post("/salary", response_model=SalarySettingResponse, status_code=201)
def create_salary(data: SalarySettingCreate, db: Session = Depends(get_db)):
    return crud.create_salary(db, data)

@router.put("/salary/{id}", response_model=SalarySettingResponse)
def update_salary(id: int, data: SalarySettingUpdate, db: Session = Depends(get_db)):
    row = crud.update_salary(db, id, data)
    return row or _404("Salary setting")

@router.delete("/salary/{id}", status_code=204)
def delete_salary(id: int, db: Session = Depends(get_db)):
    if not crud.delete_salary(db, id):
        _404("Salary setting")


# ── Tax / Social ──────────────────────────────────────────────────────────────

@router.get("/tax-social", response_model=list[TaxSocialSettingResponse])
def list_tax_social(db: Session = Depends(get_db)):
    return crud.list_tax_social(db)

@router.post("/tax-social", response_model=TaxSocialSettingResponse, status_code=201)
def create_tax_social(data: TaxSocialSettingCreate, db: Session = Depends(get_db)):
    return crud.create_tax_social(db, data)

@router.put("/tax-social/{id}", response_model=TaxSocialSettingResponse)
def update_tax_social(id: int, data: TaxSocialSettingUpdate, db: Session = Depends(get_db)):
    row = crud.update_tax_social(db, id, data)
    return row or _404("Tax/social setting")

@router.delete("/tax-social/{id}", status_code=204)
def delete_tax_social(id: int, db: Session = Depends(get_db)):
    if not crud.delete_tax_social(db, id):
        _404("Tax/social setting")


# ── Recurring invoice configs ─────────────────────────────────────────────────

@router.get("/recurring-invoices", response_model=list[RecurringInvoiceConfigResponse])
def list_recurring(db: Session = Depends(get_db)):
    return crud.list_recurring(db)

@router.post("/recurring-invoices", response_model=RecurringInvoiceConfigResponse, status_code=201)
def create_recurring(data: RecurringInvoiceConfigCreate, db: Session = Depends(get_db)):
    return crud.create_recurring(db, data)

@router.put("/recurring-invoices/{id}", response_model=RecurringInvoiceConfigResponse)
def update_recurring(id: int, data: RecurringInvoiceConfigUpdate, db: Session = Depends(get_db)):
    row = crud.update_recurring(db, id, data)
    return row or _404("Recurring invoice config")

@router.delete("/recurring-invoices/{id}", status_code=204)
def delete_recurring(id: int, db: Session = Depends(get_db)):
    if not crud.delete_recurring(db, id):
        _404("Recurring invoice config")


# ── Invoice customers ─────────────────────────────────────────────────────────

@router.get("/invoice-customers/names")
def invoice_customer_names(db: Session = Depends(get_db)):
    entry = db.query(ApiCacheEntry).filter_by(cache_key="invoices").first()
    if not entry:
        return []
    try:
        invoices = json.loads(entry.payload)
        names = sorted({inv["CustomerName"] for inv in invoices if inv.get("CustomerName")})
        return names
    except Exception:
        return []

@router.get("/invoice-customers/compute-date")
def compute_date(
    plan_month: date = Query(...),
    rule: str = Query(...),
):
    d = compute_invoice_date(plan_month, rule)
    return {"invoice_date": d.isoformat()}

@router.get("/holidays")
def list_holidays(year: int = Query(...)):
    from app.services.holiday_service import get_se_holiday_names
    names = get_se_holiday_names(year)
    return [{"date": d.isoformat(), "name": n} for d, n in sorted(names.items())]

@router.get("/invoice-customers", response_model=list[InvoiceCustomerResponse])
def list_invoice_customers(db: Session = Depends(get_db)):
    return crud.list_customers(db)

@router.post("/invoice-customers", response_model=InvoiceCustomerResponse, status_code=201)
def create_invoice_customer(data: InvoiceCustomerCreate, db: Session = Depends(get_db)):
    return crud.create_customer(db, data)

@router.put("/invoice-customers/{id}", response_model=InvoiceCustomerResponse)
def update_invoice_customer(id: int, data: InvoiceCustomerUpdate, db: Session = Depends(get_db)):
    row = crud.update_customer(db, id, data)
    return row or _404("Invoice customer")

@router.delete("/invoice-customers/{id}", status_code=204)
def delete_invoice_customer(id: int, db: Session = Depends(get_db)):
    if not crud.delete_customer(db, id):
        _404("Invoice customer")


# ── Future invoice plans ──────────────────────────────────────────────────────

@router.get("/future-invoices", response_model=list[FutureInvoicePlanResponse])
def list_future_invoices(db: Session = Depends(get_db)):
    return crud.list_future_invoices(db)

@router.post("/future-invoices", response_model=FutureInvoicePlanResponse, status_code=201)
def create_future_invoice(data: FutureInvoicePlanCreate, db: Session = Depends(get_db)):
    return crud.create_future_invoice(db, data)

@router.put("/future-invoices/{id}", response_model=FutureInvoicePlanResponse)
def update_future_invoice(id: int, data: FutureInvoicePlanUpdate, db: Session = Depends(get_db)):
    row = crud.update_future_invoice(db, id, data)
    return row or _404("Future invoice plan")

@router.delete("/future-invoices/{id}", status_code=204)
def delete_future_invoice(id: int, db: Session = Depends(get_db)):
    if not crud.delete_future_invoice(db, id):
        _404("Future invoice plan")


# ── One-off expenses ──────────────────────────────────────────────────────────

@router.get("/one-off-expenses", response_model=list[OneOffExpenseResponse])
def list_expenses(db: Session = Depends(get_db)):
    return crud.list_expenses(db)

@router.post("/one-off-expenses", response_model=OneOffExpenseResponse, status_code=201)
def create_expense(data: OneOffExpenseCreate, db: Session = Depends(get_db)):
    return crud.create_expense(db, data)

@router.put("/one-off-expenses/{id}", response_model=OneOffExpenseResponse)
def update_expense(id: int, data: OneOffExpenseUpdate, db: Session = Depends(get_db)):
    row = crud.update_expense(db, id, data)
    return row or _404("One-off expense")

@router.delete("/one-off-expenses/{id}", status_code=204)
def delete_expense(id: int, db: Session = Depends(get_db)):
    if not crud.delete_expense(db, id):
        _404("One-off expense")


# ── User defaults ─────────────────────────────────────────────────────────────

@router.get("/defaults", response_model=UserDefaultsResponse)
def get_defaults(db: Session = Depends(get_db)):
    return crud.get_or_create_defaults(db)

@router.put("/defaults", response_model=UserDefaultsResponse)
def update_defaults(data: UserDefaultsUpdate, db: Session = Depends(get_db)):
    return crud.update_defaults(db, data)


# ── Manual balance override ───────────────────────────────────────────────────

class BalanceOverrideBody(BaseModel):
    amount: float

class BalanceOverrideResponse(BaseModel):
    amount: float
    set_at: datetime

@router.put("/balance-override", response_model=BalanceOverrideResponse, status_code=200)
def set_balance_override(data: BalanceOverrideBody, db: Session = Depends(get_db)):
    row = crud.set_manual_balance(db, data.amount)
    return {"amount": float(row.amount), "set_at": row.set_at}

@router.delete("/balance-override", status_code=204)
def clear_balance_override(db: Session = Depends(get_db)):
    crud.clear_manual_balance(db)


# ── Periodic expenses ─────────────────────────────────────────────────────────

@router.get("/periodic-expenses", response_model=list[PeriodicExpenseResponse])
def list_periodic_expenses(db: Session = Depends(get_db)):
    return crud.list_periodic_expenses(db)

@router.post("/periodic-expenses", response_model=PeriodicExpenseResponse, status_code=201)
def create_periodic_expense(data: PeriodicExpenseCreate, db: Session = Depends(get_db)):
    return crud.create_periodic_expense(db, data)

@router.put("/periodic-expenses/{id}", response_model=PeriodicExpenseResponse)
def update_periodic_expense(id: int, data: PeriodicExpenseUpdate, db: Session = Depends(get_db)):
    row = crud.update_periodic_expense(db, id, data)
    if not row:
        _404("PeriodicExpense")
    return row

@router.delete("/periodic-expenses/{id}", status_code=204)
def delete_periodic_expense(id: int, db: Session = Depends(get_db)):
    if not crud.delete_periodic_expense(db, id):
        _404("PeriodicExpense")

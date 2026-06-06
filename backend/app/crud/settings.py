from datetime import datetime, timezone

from sqlalchemy.orm import Session

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
from app.schemas.settings import (
    FutureInvoicePlanCreate,
    FutureInvoicePlanUpdate,
    InvoiceCustomerCreate,
    InvoiceCustomerUpdate,
    OneOffExpenseCreate,
    OneOffExpenseUpdate,
    PeriodicExpenseCreate,
    PeriodicExpenseUpdate,
    RecurringInvoiceConfigCreate,
    RecurringInvoiceConfigUpdate,
    SalarySettingCreate,
    SalarySettingUpdate,
    TaxSocialSettingCreate,
    TaxSocialSettingUpdate,
    UserDefaultsUpdate,
)


# ── Generic helpers ───────────────────────────────────────────────────────────

def _update(db: Session, row, data) -> None:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)


# ── Salary ────────────────────────────────────────────────────────────────────

def list_salary(db: Session) -> list[SalarySetting]:
    return db.query(SalarySetting).order_by(SalarySetting.effective_from).all()

def get_salary(db: Session, id: int) -> SalarySetting | None:
    return db.query(SalarySetting).filter_by(id=id).first()

def create_salary(db: Session, data: SalarySettingCreate) -> SalarySetting:
    row = SalarySetting(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

def update_salary(db: Session, id: int, data: SalarySettingUpdate) -> SalarySetting | None:
    row = get_salary(db, id)
    if row:
        _update(db, row, data)
    return row

def delete_salary(db: Session, id: int) -> bool:
    row = get_salary(db, id)
    if row:
        db.delete(row)
        db.commit()
        return True
    return False


# ── Tax / Social ──────────────────────────────────────────────────────────────

def list_tax_social(db: Session) -> list[TaxSocialSetting]:
    return db.query(TaxSocialSetting).order_by(TaxSocialSetting.effective_from).all()

def get_tax_social(db: Session, id: int) -> TaxSocialSetting | None:
    return db.query(TaxSocialSetting).filter_by(id=id).first()

def create_tax_social(db: Session, data: TaxSocialSettingCreate) -> TaxSocialSetting:
    row = TaxSocialSetting(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

def update_tax_social(db: Session, id: int, data: TaxSocialSettingUpdate) -> TaxSocialSetting | None:
    row = get_tax_social(db, id)
    if row:
        _update(db, row, data)
    return row

def delete_tax_social(db: Session, id: int) -> bool:
    row = get_tax_social(db, id)
    if row:
        db.delete(row)
        db.commit()
        return True
    return False


# ── Recurring invoice config ──────────────────────────────────────────────────

def list_recurring(db: Session) -> list[RecurringInvoiceConfig]:
    return db.query(RecurringInvoiceConfig).all()

def get_recurring(db: Session, id: int) -> RecurringInvoiceConfig | None:
    return db.query(RecurringInvoiceConfig).filter_by(id=id).first()

def create_recurring(db: Session, data: RecurringInvoiceConfigCreate) -> RecurringInvoiceConfig:
    row = RecurringInvoiceConfig(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

def update_recurring(db: Session, id: int, data: RecurringInvoiceConfigUpdate) -> RecurringInvoiceConfig | None:
    row = get_recurring(db, id)
    if row:
        _update(db, row, data)
    return row

def delete_recurring(db: Session, id: int) -> bool:
    row = get_recurring(db, id)
    if row:
        db.delete(row)
        db.commit()
        return True
    return False


# ── Invoice customers ─────────────────────────────────────────────────────────

def list_customers(db: Session) -> list[InvoiceCustomer]:
    return db.query(InvoiceCustomer).order_by(InvoiceCustomer.name).all()

def get_customer(db: Session, id: int) -> InvoiceCustomer | None:
    return db.query(InvoiceCustomer).filter_by(id=id).first()

def create_customer(db: Session, data: InvoiceCustomerCreate) -> InvoiceCustomer:
    row = InvoiceCustomer(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

def update_customer(db: Session, id: int, data: InvoiceCustomerUpdate) -> InvoiceCustomer | None:
    row = get_customer(db, id)
    if row:
        _update(db, row, data)
    return row

def delete_customer(db: Session, id: int) -> bool:
    row = get_customer(db, id)
    if row:
        db.delete(row)
        db.commit()
        return True
    return False


# ── Future invoice plans ──────────────────────────────────────────────────────

def list_future_invoices(db: Session) -> list[FutureInvoicePlan]:
    return db.query(FutureInvoicePlan).order_by(FutureInvoicePlan.plan_month).all()

def get_future_invoice(db: Session, id: int) -> FutureInvoicePlan | None:
    return db.query(FutureInvoicePlan).filter_by(id=id).first()

def create_future_invoice(db: Session, data: FutureInvoicePlanCreate) -> FutureInvoicePlan:
    row = FutureInvoicePlan(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

def update_future_invoice(db: Session, id: int, data: FutureInvoicePlanUpdate) -> FutureInvoicePlan | None:
    row = get_future_invoice(db, id)
    if row:
        _update(db, row, data)
    return row

def delete_future_invoice(db: Session, id: int) -> bool:
    row = get_future_invoice(db, id)
    if row:
        db.delete(row)
        db.commit()
        return True
    return False


# ── One-off expenses ──────────────────────────────────────────────────────────

def list_expenses(db: Session) -> list[OneOffExpense]:
    return db.query(OneOffExpense).order_by(OneOffExpense.planned_date).all()

def get_expense(db: Session, id: int) -> OneOffExpense | None:
    return db.query(OneOffExpense).filter_by(id=id).first()

def create_expense(db: Session, data: OneOffExpenseCreate) -> OneOffExpense:
    row = OneOffExpense(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

def update_expense(db: Session, id: int, data: OneOffExpenseUpdate) -> OneOffExpense | None:
    row = get_expense(db, id)
    if row:
        _update(db, row, data)
    return row

def delete_expense(db: Session, id: int) -> bool:
    row = get_expense(db, id)
    if row:
        db.delete(row)
        db.commit()
        return True
    return False


# ── User defaults ─────────────────────────────────────────────────────────────

def get_or_create_defaults(db: Session) -> UserDefaults:
    row = db.query(UserDefaults).filter_by(id=1).first()
    if row is None:
        row = UserDefaults(id=1)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row

def update_defaults(db: Session, data: UserDefaultsUpdate) -> UserDefaults:
    row = get_or_create_defaults(db)
    _update(db, row, data)
    return row


# ── Manual balance override ───────────────────────────────────────────────────

def get_manual_balance(db: Session) -> ManualBalanceOverride | None:
    return db.query(ManualBalanceOverride).filter_by(id=1).first()

def set_manual_balance(db: Session, amount: float) -> ManualBalanceOverride:
    row = db.query(ManualBalanceOverride).filter_by(id=1).first()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if row:
        row.amount = amount
        row.set_at = now
    else:
        row = ManualBalanceOverride(id=1, amount=amount, set_at=now)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row

def clear_manual_balance(db: Session) -> None:
    row = db.query(ManualBalanceOverride).filter_by(id=1).first()
    if row:
        db.delete(row)
        db.commit()


# ── Periodic expenses ─────────────────────────────────────────────────────────

def list_periodic_expenses(db: Session) -> list[PeriodicExpense]:
    return db.query(PeriodicExpense).order_by(PeriodicExpense.label).all()

def get_periodic_expense(db: Session, id: int) -> PeriodicExpense | None:
    return db.query(PeriodicExpense).filter_by(id=id).first()

def create_periodic_expense(db: Session, data: PeriodicExpenseCreate) -> PeriodicExpense:
    row = PeriodicExpense(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

def update_periodic_expense(db: Session, id: int, data: PeriodicExpenseUpdate) -> PeriodicExpense | None:
    row = get_periodic_expense(db, id)
    if row:
        _update(db, row, data)
    return row

def delete_periodic_expense(db: Session, id: int) -> bool:
    row = get_periodic_expense(db, id)
    if row:
        db.delete(row)
        db.commit()
        return True
    return False

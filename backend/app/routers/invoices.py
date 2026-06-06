from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.wint import AccountBalance, IncomingInvoice, Invoice
from app.services.cache_service import read_cache

router = APIRouter(prefix="/api")

_CACHE_EMPTY_MSG = (
    "Cache not yet populated — please wait for the scheduled refresh "
    "or trigger one via POST /api/cache/refresh."
)


@router.get("/invoices", response_model=list[Invoice])
def get_invoices(db: Session = Depends(get_db)):
    result = read_cache(db, "invoices")
    if result is None:
        raise HTTPException(503, _CACHE_EMPTY_MSG)
    data, _ = result
    return [Invoice.model_validate(item) for item in data]


@router.get("/incoming-invoices", response_model=list[IncomingInvoice])
def get_incoming_invoices(db: Session = Depends(get_db)):
    result = read_cache(db, "incoming_invoices")
    if result is None:
        raise HTTPException(503, _CACHE_EMPTY_MSG)
    data, _ = result
    return [IncomingInvoice.model_validate(item) for item in data]


@router.get("/account-balance", response_model=AccountBalance)
def get_account_balance(db: Session = Depends(get_db)):
    result = read_cache(db, "account_balance")
    if result is None:
        raise HTTPException(503, _CACHE_EMPTY_MSG)
    data, _ = result
    return AccountBalance.model_validate(data)

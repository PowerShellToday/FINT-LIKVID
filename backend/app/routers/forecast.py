from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.forecast import ForecastResponse
from app.services.forecast import build_forecast

router = APIRouter(prefix="/api")


@router.get("/forecast", response_model=ForecastResponse)
def get_forecast(
    months: int = Query(default=6, ge=1, le=24, description="Forecast horizon in months"),
    db: Session = Depends(get_db),
):
    return build_forecast(db, horizon_months=months)

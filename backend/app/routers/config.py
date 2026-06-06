from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import app_config_service

router = APIRouter(prefix="/api")


class AppConfigResponse(BaseModel):
    default_forecast_months: int
    max_forecast_months: int
    currency: str


@router.get("/config", response_model=AppConfigResponse)
def get_config(db: Session = Depends(get_db)):
    return AppConfigResponse(
        default_forecast_months=app_config_service.get_default_forecast_months(db),
        max_forecast_months=app_config_service.get_max_forecast_months(db),
        currency=app_config_service.get_currency(db),
    )

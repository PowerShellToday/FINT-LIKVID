import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import app_config_service
from app.services.bootstrap import clear_credentials, store_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/setup")


class SetupStatusResponse(BaseModel):
    configured: bool
    auth_enabled: bool


class SetupCompleteRequest(BaseModel):
    wint_api_username: str
    wint_api_password: str
    wint_bank_account_number: str = "1930"
    wint_api_base_url: str = "https://superkollapi.wint.se"
    cache_refresh_interval_hours: int = 6
    default_forecast_months: int = 6
    max_forecast_months: int = 24
    currency: str = "SEK"
    auth_enabled: bool = False
    auth_password: str | None = None


@router.get("/status", response_model=SetupStatusResponse)
def setup_status(db: Session = Depends(get_db)):
    return SetupStatusResponse(
        configured=app_config_service.is_setup_complete(db),
        auth_enabled=app_config_service.is_auth_enabled(db),
    )


@router.post("/complete")
def setup_complete(body: SetupCompleteRequest, db: Session = Depends(get_db)):
    if app_config_service.is_setup_complete(db):
        raise HTTPException(409, detail="Setup already completed")

    if body.auth_enabled and not body.auth_password:
        raise HTTPException(422, detail="auth_password is required when auth_enabled is true")

    store_credentials(db, body.wint_api_username, body.wint_api_password)

    payload = app_config_service.SetupPayload(
        wint_api_username=body.wint_api_username,
        wint_api_password=body.wint_api_password,
        wint_bank_account_number=body.wint_bank_account_number,
        wint_api_base_url=body.wint_api_base_url,
        cache_refresh_interval_hours=body.cache_refresh_interval_hours,
        default_forecast_months=body.default_forecast_months,
        max_forecast_months=body.max_forecast_months,
        currency=body.currency,
        auth_enabled=body.auth_enabled,
        auth_password=body.auth_password,
    )
    app_config_service.complete_setup(db, payload)

    # Activate full app: load credentials and start cache scheduler
    from app.services.bootstrap import load_credentials
    from app.services.app_config_service import get_cache_interval
    import app.main as _main
    load_credentials(db)
    if _main._scheduler is None:
        _main._start_scheduler(get_cache_interval(db))

    logger.info("Setup completed successfully")
    return {"message": "Setup complete"}


@router.post("/demo")
def setup_demo(db: Session = Depends(get_db)):
    """Activate demo mode — seeds fake data, no Wint credentials required."""
    if app_config_service.is_setup_complete(db):
        raise HTTPException(409, detail="Setup already completed")

    from app.crud.app_config import set_many
    from app.services.app_config_service import DEFAULTS, KEY_SETUP_COMPLETE, KEY_DEMO_MODE
    from app.services.demo_service import seed_demo
    from app.services.app_config_service import get_cache_interval
    import app.main as _main

    # Write minimal config — use defaults plus demo flags
    pairs = {
        **DEFAULTS,
        KEY_SETUP_COMPLETE: "true",
        KEY_DEMO_MODE: "true",
    }
    set_many(db, pairs)

    # Seed all demo data (settings + cache)
    seed_demo(db)

    # Start the scheduler so cache refreshes re-seed demo data on interval
    if _main._scheduler is None:
        _main._start_scheduler(get_cache_interval(db))

    logger.info("Demo mode setup completed.")
    return {"message": "Demo mode activated"}


@router.post("/reset", status_code=204)
def setup_reset(db: Session = Depends(get_db)):
    """Full reset — wipes all config, credentials, settings and cache. Returns to setup wizard."""
    import app.main as _main
    from app.models.settings import (
        SalarySetting, TaxSocialSetting, RecurringInvoiceConfig,
        InvoiceCustomer, FutureInvoicePlan, OneOffExpense,
        PeriodicExpense, ManualBalanceOverride, UserDefaults,
    )
    from app.models.credentials import StoredCredential
    from app.models.cache import ApiCacheEntry
    from app.models.app_config import AppConfig

    # Stop scheduler
    if _main._scheduler is not None:
        _main._scheduler.shutdown(wait=False)
        _main._scheduler = None

    # Clear in-memory credentials
    clear_credentials()

    # Wipe all tables
    for model in (
        SalarySetting, TaxSocialSetting, RecurringInvoiceConfig,
        InvoiceCustomer, FutureInvoicePlan, OneOffExpense,
        PeriodicExpense, ManualBalanceOverride, UserDefaults,
        StoredCredential, ApiCacheEntry, AppConfig,
    ):
        db.query(model).delete()
    db.commit()

    logger.info("Full reset completed — app returned to pre-setup state.")

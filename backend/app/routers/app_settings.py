import httpx
import bcrypt
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.bootstrap import get_credentials, store_credentials
from app.services.app_config_service import (
    get_wint_settings, get_cache_interval, get_default_forecast_months,
    get_max_forecast_months, get_currency, is_auth_enabled, get_auth_password_hash,
    is_demo_mode,
    set_wint_base_url, set_wint_bank_account, set_cache_interval,
    set_default_forecast_months, set_max_forecast_months, set_currency,
    set_auth_enabled, set_auth_password_hash,
)

router = APIRouter(prefix="/api/app-settings")


class AppSettingsResponse(BaseModel):
    wint_api_base_url: str
    wint_bank_account_number: str
    wint_username: str
    cache_refresh_interval_hours: int
    default_forecast_months: int
    max_forecast_months: int
    currency: str
    auth_enabled: bool
    is_demo_mode: bool


class AppSettingsUpdate(BaseModel):
    wint_api_base_url: str
    wint_bank_account_number: str
    cache_refresh_interval_hours: int
    default_forecast_months: int
    max_forecast_months: int
    currency: str


class WintCredentialsUpdate(BaseModel):
    username: str
    password: str


class WintConnectionTest(BaseModel):
    username: str | None = None
    password: str | None = None
    base_url: str | None = None


class AuthSettingsUpdate(BaseModel):
    auth_enabled: bool
    new_password: str | None = None
    confirm_password: str | None = None


@router.get("", response_model=AppSettingsResponse)
def get_app_settings(db: Session = Depends(get_db)):
    wint = get_wint_settings(db)
    demo = is_demo_mode(db)
    username = "demo" if demo else get_credentials()[0]
    return AppSettingsResponse(
        wint_api_base_url=wint.base_url,
        wint_bank_account_number=wint.bank_account,
        wint_username=username,
        cache_refresh_interval_hours=get_cache_interval(db),
        default_forecast_months=get_default_forecast_months(db),
        max_forecast_months=get_max_forecast_months(db),
        currency=get_currency(db),
        auth_enabled=is_auth_enabled(db),
        is_demo_mode=demo,
    )


@router.put("")
def update_app_settings(body: AppSettingsUpdate, db: Session = Depends(get_db)):
    import app.main as _main

    old_interval = get_cache_interval(db)
    set_wint_base_url(db, body.wint_api_base_url)
    set_wint_bank_account(db, body.wint_bank_account_number)
    set_cache_interval(db, body.cache_refresh_interval_hours)
    set_default_forecast_months(db, body.default_forecast_months)
    set_max_forecast_months(db, body.max_forecast_months)
    set_currency(db, body.currency)

    if body.cache_refresh_interval_hours != old_interval:
        if _main._scheduler is not None:
            _main._scheduler.shutdown(wait=False)
        _main._start_scheduler(body.cache_refresh_interval_hours)

    return {"ok": True}


@router.put("/credentials")
def update_credentials(body: WintCredentialsUpdate, db: Session = Depends(get_db)):
    if is_demo_mode(db):
        raise HTTPException(400, detail="Cannot update credentials in demo mode.")
    store_credentials(db, body.username, body.password)
    return {"ok": True}


@router.post("/test-connection")
def test_connection(body: WintConnectionTest, db: Session = Depends(get_db)):
    if is_demo_mode(db):
        raise HTTPException(400, detail="No Wint connection available in demo mode.")
    stored_username, stored_password = get_credentials()
    wint = get_wint_settings(db)
    username = body.username or stored_username
    password = body.password or stored_password
    base_url = body.base_url or wint.base_url

    url = f"{base_url.rstrip('/')}/admin/host/ping"
    try:
        r = httpx.get(url, auth=(username, password), timeout=10)
        if r.is_success:
            return {"ok": True}
        return JSONResponse(
            status_code=400,
            content={"detail": f"Wint API returnerade {r.status_code}"},
        )
    except httpx.TimeoutException:
        return JSONResponse(status_code=400, content={"detail": "Anslutningen tog för lång tid"})
    except Exception:
        return JSONResponse(status_code=400, content={"detail": "Kunde inte nå Wint API"})


@router.put("/auth")
def update_auth(body: AuthSettingsUpdate, db: Session = Depends(get_db)):
    if body.auth_enabled:
        if body.new_password:
            if body.new_password != body.confirm_password:
                return JSONResponse(
                    status_code=422,
                    content={"detail": "Lösenorden matchar inte"},
                )
            hashed = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
            set_auth_password_hash(db, hashed)
        elif not get_auth_password_hash(db):
            return JSONResponse(
                status_code=422,
                content={"detail": "Ange ett lösenord för att aktivera inloggning"},
            )
    set_auth_enabled(db, body.auth_enabled)
    return {"ok": True}

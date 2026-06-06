from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.crud.app_config import get_value, set_many, set_value

# Key constants
KEY_SETUP_COMPLETE = "setup_complete"
KEY_WINT_API_BASE_URL = "wint_api_base_url"
KEY_WINT_BANK_ACCOUNT = "wint_bank_account_number"
KEY_WINT_TIMEOUT = "wint_api_timeout_seconds"
KEY_WINT_USE_INTERNAL = "wint_use_internal_api"
KEY_CACHE_INTERVAL = "cache_refresh_interval_hours"
KEY_DEFAULT_FORECAST_MONTHS = "default_forecast_months"
KEY_MAX_FORECAST_MONTHS = "max_forecast_months"
KEY_CURRENCY = "currency"
KEY_AUTH_ENABLED = "auth_enabled"
KEY_AUTH_PASSWORD_HASH = "auth_password_hash"
KEY_DEMO_MODE = "demo_mode"

DEFAULTS: dict[str, str] = {
    KEY_WINT_API_BASE_URL: "https://superkollapi.wint.se",
    KEY_WINT_BANK_ACCOUNT: "1930",
    KEY_WINT_TIMEOUT: "30",
    KEY_WINT_USE_INTERNAL: "false",
    KEY_CACHE_INTERVAL: "6",
    KEY_DEFAULT_FORECAST_MONTHS: "6",
    KEY_MAX_FORECAST_MONTHS: "24",
    KEY_CURRENCY: "SEK",
    KEY_AUTH_ENABLED: "false",
    KEY_AUTH_PASSWORD_HASH: "",
}


def is_setup_complete(db: Session) -> bool:
    return get_value(db, KEY_SETUP_COMPLETE, "false") == "true"


def is_demo_mode(db: Session) -> bool:
    return get_value(db, KEY_DEMO_MODE, "false") == "true"


def get_cache_interval(db: Session) -> int:
    return int(get_value(db, KEY_CACHE_INTERVAL, DEFAULTS[KEY_CACHE_INTERVAL]))


def get_default_forecast_months(db: Session) -> int:
    return int(get_value(db, KEY_DEFAULT_FORECAST_MONTHS, DEFAULTS[KEY_DEFAULT_FORECAST_MONTHS]))


def get_max_forecast_months(db: Session) -> int:
    return int(get_value(db, KEY_MAX_FORECAST_MONTHS, DEFAULTS[KEY_MAX_FORECAST_MONTHS]))


def get_currency(db: Session) -> str:
    return get_value(db, KEY_CURRENCY, DEFAULTS[KEY_CURRENCY])


def is_auth_enabled(db: Session) -> bool:
    return get_value(db, KEY_AUTH_ENABLED, "false") == "true"


def get_auth_password_hash(db: Session) -> str:
    return get_value(db, KEY_AUTH_PASSWORD_HASH, "") or ""


def set_auth_password_hash(db: Session, hashed: str) -> None:
    set_value(db, KEY_AUTH_PASSWORD_HASH, hashed)


def set_auth_enabled(db: Session, enabled: bool) -> None:
    set_value(db, KEY_AUTH_ENABLED, "true" if enabled else "false")


@dataclass
class WintSettings:
    base_url: str
    bank_account: str
    timeout: int
    use_internal: bool


def set_wint_base_url(db: Session, url: str) -> None:
    set_value(db, KEY_WINT_API_BASE_URL, url)


def set_wint_bank_account(db: Session, account: str) -> None:
    set_value(db, KEY_WINT_BANK_ACCOUNT, account)


def set_cache_interval(db: Session, hours: int) -> None:
    set_value(db, KEY_CACHE_INTERVAL, str(hours))


def set_default_forecast_months(db: Session, months: int) -> None:
    set_value(db, KEY_DEFAULT_FORECAST_MONTHS, str(months))


def set_max_forecast_months(db: Session, months: int) -> None:
    set_value(db, KEY_MAX_FORECAST_MONTHS, str(months))


def set_currency(db: Session, currency: str) -> None:
    set_value(db, KEY_CURRENCY, currency)


def get_wint_settings(db: Session) -> WintSettings:
    return WintSettings(
        base_url=get_value(db, KEY_WINT_API_BASE_URL, DEFAULTS[KEY_WINT_API_BASE_URL]),
        bank_account=get_value(db, KEY_WINT_BANK_ACCOUNT, DEFAULTS[KEY_WINT_BANK_ACCOUNT]),
        timeout=int(get_value(db, KEY_WINT_TIMEOUT, DEFAULTS[KEY_WINT_TIMEOUT])),
        use_internal=get_value(db, KEY_WINT_USE_INTERNAL, "false") == "true",
    )


@dataclass
class SetupPayload:
    wint_api_username: str
    wint_api_password: str
    wint_bank_account_number: str
    wint_api_base_url: str
    cache_refresh_interval_hours: int
    default_forecast_months: int
    max_forecast_months: int
    currency: str
    auth_enabled: bool
    auth_password: str | None = None


def complete_setup(db: Session, payload: SetupPayload) -> None:
    pairs: dict[str, str | None] = {
        KEY_WINT_API_BASE_URL: payload.wint_api_base_url,
        KEY_WINT_BANK_ACCOUNT: payload.wint_bank_account_number,
        KEY_CACHE_INTERVAL: str(payload.cache_refresh_interval_hours),
        KEY_DEFAULT_FORECAST_MONTHS: str(payload.default_forecast_months),
        KEY_MAX_FORECAST_MONTHS: str(payload.max_forecast_months),
        KEY_CURRENCY: payload.currency,
        KEY_AUTH_ENABLED: "true" if payload.auth_enabled else "false",
        KEY_SETUP_COMPLETE: "true",
    }

    if payload.auth_enabled and payload.auth_password:
        import bcrypt
        hashed = bcrypt.hashpw(payload.auth_password.encode(), bcrypt.gensalt()).decode()
        pairs[KEY_AUTH_PASSWORD_HASH] = hashed
    else:
        pairs[KEY_AUTH_PASSWORD_HASH] = ""

    set_many(db, pairs)

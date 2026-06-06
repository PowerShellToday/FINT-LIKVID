import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.clients.wint_client import WintClient
from app.models.cache import ApiCacheEntry

logger = logging.getLogger(__name__)

CACHE_KEYS = ("invoices", "incoming_invoices", "account_balance")


def read_cache(db: Session, key: str) -> tuple[Any, datetime] | None:
    row = db.query(ApiCacheEntry).filter_by(cache_key=key).first()
    if row is None:
        return None
    return json.loads(row.payload), row.fetched_at


def write_cache(db: Session, key: str, data: Any) -> datetime:
    payload = json.dumps(data, default=str)
    fetched_at = datetime.now(timezone.utc).replace(tzinfo=None)
    row = db.query(ApiCacheEntry).filter_by(cache_key=key).first()
    if row:
        row.payload = payload
        row.fetched_at = fetched_at
    else:
        row = ApiCacheEntry(cache_key=key, payload=payload, fetched_at=fetched_at)
        db.add(row)
    db.commit()
    return fetched_at


def refresh_all(db: Session, client: WintClient | None = None) -> datetime:
    # In demo mode: re-seed from static demo data instead of calling Wint API
    from app.services.app_config_service import is_demo_mode
    if is_demo_mode(db):
        logger.info("Demo mode: re-seeding cache from demo data...")
        from app.services.demo_service import seed_demo
        seed_demo(db)
        result = read_cache(db, "account_balance")
        return result[1] if result else datetime.now(timezone.utc).replace(tzinfo=None)

    if client is None:
        from app.clients.wint_client import get_wint_client
        client = get_wint_client(db)

    logger.info("Starting Wint API cache refresh...")

    invoices = client.get_invoices()
    write_cache(db, "invoices", [inv.model_dump(mode="json") for inv in invoices])

    incoming = client.get_incoming_invoices()
    write_cache(db, "incoming_invoices", [inv.model_dump(mode="json") for inv in incoming])

    balance = client.get_account_balance()

    # Only update balance cache (and its timestamp) if the value changed
    from app.crud.settings import clear_manual_balance
    previous = read_cache(db, "account_balance")
    if previous:
        from app.schemas.wint import AccountBalance
        prev_balance = AccountBalance.model_validate(previous[0]).Balance
        if prev_balance != balance.Balance:
            logger.info("Balance changed %s → %s, updating cache and clearing manual override", prev_balance, balance.Balance)
            fetched_at = write_cache(db, "account_balance", balance.model_dump(mode="json"))
            clear_manual_balance(db)
        else:
            fetched_at = previous[1]  # preserve original timestamp
            logger.info("Balance unchanged (%s), keeping existing timestamp", balance.Balance)
    else:
        fetched_at = write_cache(db, "account_balance", balance.model_dump(mode="json"))
        clear_manual_balance(db)

    logger.info(
        "Cache refresh complete — invoices: %d, incoming: %d, balance: %s",
        len(invoices),
        len(incoming),
        balance.Balance,
    )
    return fetched_at

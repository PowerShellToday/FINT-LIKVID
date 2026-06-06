import logging

from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from app.config_file import get_encryption_key
from app.models.credentials import StoredCredential

logger = logging.getLogger(__name__)

_credentials: tuple[str, str] | None = None


def get_credentials() -> tuple[str, str]:
    if _credentials is None:
        raise RuntimeError("Credentials not loaded — call load_credentials() first.")
    return _credentials


def _encrypt(value: str) -> str:
    return Fernet(get_encryption_key()).encrypt(value.encode()).decode()


def _decrypt(value: str) -> str:
    return Fernet(get_encryption_key()).decrypt(value.encode()).decode()


def _load_from_db(db: Session) -> tuple[str, str] | None:
    username_row = db.query(StoredCredential).filter_by(key_name="wint_username").first()
    password_row = db.query(StoredCredential).filter_by(key_name="wint_password").first()
    if username_row and password_row:
        return _decrypt(username_row.encrypted_value), _decrypt(password_row.encrypted_value)
    return None


def _upsert(db: Session, key_name: str, encrypted_value: str) -> None:
    row = db.query(StoredCredential).filter_by(key_name=key_name).first()
    if row:
        row.encrypted_value = encrypted_value
    else:
        db.add(StoredCredential(key_name=key_name, encrypted_value=encrypted_value))
    db.commit()


def load_credentials(db: Session) -> None:
    global _credentials
    creds = _load_from_db(db)
    if not creds:
        raise RuntimeError("No credentials in database — setup wizard has not been completed.")
    _credentials = creds
    logger.info("Wint credentials loaded from database.")


def clear_credentials() -> None:
    global _credentials
    _credentials = None
    logger.info("In-memory credentials cleared.")


def store_credentials(db: Session, username: str, password: str) -> None:
    global _credentials
    _upsert(db, "wint_username", _encrypt(username))
    _upsert(db, "wint_password", _encrypt(password))
    _credentials = (username, password)
    logger.info("Wint credentials stored in database.")

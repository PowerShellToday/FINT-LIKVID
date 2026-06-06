from sqlalchemy.orm import Session

from app.models.app_config import AppConfig


def get_value(db: Session, key: str, default: str | None = None) -> str | None:
    row = db.get(AppConfig, key)
    if row is None:
        return default
    return row.value


def set_value(db: Session, key: str, value: str | None) -> None:
    row = db.get(AppConfig, key)
    if row is None:
        db.add(AppConfig(key=key, value=value))
    else:
        row.value = value
    db.commit()


def set_many(db: Session, pairs: dict[str, str | None]) -> None:
    for key, value in pairs.items():
        row = db.get(AppConfig, key)
        if row is None:
            db.add(AppConfig(key=key, value=value))
        else:
            row.value = value
    db.commit()

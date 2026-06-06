from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import cache_service

router = APIRouter(prefix="/api/cache")


@router.post("/refresh")
def refresh_cache(db: Session = Depends(get_db)):
    fetched_at = cache_service.refresh_all(db)
    return {"fetched_at": fetched_at.isoformat(), "message": "Cache refreshed successfully"}


@router.get("/status")
def cache_status(db: Session = Depends(get_db)):
    status = {}
    for key in cache_service.CACHE_KEYS:
        result = cache_service.read_cache(db, key)
        status[key] = {"fetched_at": result[1].isoformat() if result else None}
    return status

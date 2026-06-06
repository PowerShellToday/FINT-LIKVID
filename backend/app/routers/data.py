"""
data.py — Export / import router.

GET  /api/data/export  → JSON attachment with all safe settings
POST /api/data/import  → restore from JSON payload
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.database import get_db
from app.services.data_service import export_data, import_data
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data", tags=["data"])


@router.get("/export")
def export_settings(db: Session = Depends(get_db)):
    payload = export_data(db)
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": 'attachment; filename="fint_backup.json"'},
    )


@router.post("/import")
def import_settings(payload: dict, db: Session = Depends(get_db)):
    try:
        result = import_data(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Import failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Import misslyckades: {exc}") from exc
    return result

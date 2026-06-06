import os

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "env": os.environ.get("APP_ENV", "development")}

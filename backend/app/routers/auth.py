import bcrypt
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import create_session, delete_session, is_valid_session
from app.services.app_config_service import get_auth_password_hash, is_auth_enabled

router = APIRouter(prefix="/api/auth")


class LoginRequest(BaseModel):
    password: str


@router.get("/status")
def auth_status(request: Request, db: Session = Depends(get_db)):
    enabled = is_auth_enabled(db)
    token = request.cookies.get("session")
    authenticated = not enabled or (bool(token) and is_valid_session(token))
    return {"auth_enabled": enabled, "authenticated": authenticated}


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    if not is_auth_enabled(db):
        return {"ok": True}

    stored_hash = get_auth_password_hash(db)
    if not stored_hash or not bcrypt.checkpw(body.password.encode(), stored_hash.encode()):
        return JSONResponse(status_code=401, content={"detail": "Fel lösenord"})

    token = create_session()
    response = JSONResponse(content={"ok": True})
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 7,  # 7 days
    )
    return response


@router.post("/logout")
def logout(request: Request):
    token = request.cookies.get("session")
    if token:
        delete_session(token)
    response = JSONResponse(content={"ok": True})
    response.delete_cookie(key="session", path="/")
    return response

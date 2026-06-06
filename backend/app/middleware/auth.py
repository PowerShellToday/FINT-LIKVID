import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.database import SessionLocal
from app.services.app_config_service import is_auth_enabled

_EXEMPT_PREFIXES = ("/api/setup", "/api/config", "/api/auth", "/health")

SESSION_TTL_DAYS = 7
_sessions: dict[str, datetime] = {}  # token → expiry (UTC)


def create_session() -> str:
    token = secrets.token_urlsafe(32)
    _sessions[token] = datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)
    return token


def delete_session(token: str) -> None:
    _sessions.pop(token, None)


def is_valid_session(token: str) -> bool:
    expiry = _sessions.get(token)
    if expiry is None:
        return False
    if datetime.now(timezone.utc) >= expiry:
        _sessions.pop(token, None)
        return False
    return True


class SessionAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if any(path.startswith(p) for p in _EXEMPT_PREFIXES):
            return await call_next(request)

        db = SessionLocal()
        try:
            if not is_auth_enabled(db):
                return await call_next(request)
        finally:
            db.close()

        token = request.cookies.get("session")
        if token and is_valid_session(token):
            return await call_next(request)

        return JSONResponse(status_code=401, content={"detail": "Ej inloggad"})

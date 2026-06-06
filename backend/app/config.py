import os

APP_ENV: str = os.environ.get("APP_ENV", "development")
LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "info")

_pg_host = os.environ.get("POSTGRES_HOST", "db")
_pg_port = os.environ.get("POSTGRES_PORT", "5432")
_pg_db = os.environ.get("POSTGRES_DB", "wintstatus")
_pg_user = os.environ.get("POSTGRES_USER", "wintstatus")
_pg_pass = os.environ.get("POSTGRES_PASSWORD", "")

DATABASE_URL: str = f"postgresql://{_pg_user}:{_pg_pass}@{_pg_host}:{_pg_port}/{_pg_db}"

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

from alembic import command
from alembic.config import Config
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import SessionLocal
from app.middleware.auth import SessionAuthMiddleware
from app.routers import auth as auth_router, cache, config as config_router, forecast, health, invoices, setup
from app.routers import settings as settings_router
from app.routers import app_settings as app_settings_router
from app.routers import data as data_router
from app.services import app_config_service
from app.services.bootstrap import load_credentials

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "info").upper())
logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _run_migrations() -> None:
    cfg = Config("alembic.ini")
    command.upgrade(cfg, "head")
    logger.info("Database migrations applied.")


def _cache_refresh_job() -> None:
    from app.services import cache_service
    db = SessionLocal()
    try:
        cache_service.refresh_all(db)
    except Exception as exc:
        logger.error("Scheduled cache refresh failed: %s", exc)
    finally:
        db.close()


def _start_scheduler(interval_hours: int) -> None:
    global _scheduler
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _cache_refresh_job,
        trigger=IntervalTrigger(hours=interval_hours),
        id="cache_refresh",
        next_run_time=datetime.now(),
    )
    _scheduler.start()
    logger.info("Cache refresh scheduled every %d hour(s).", interval_hours)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _run_migrations()

    db = SessionLocal()
    try:
        if app_config_service.is_setup_complete(db):
            if app_config_service.is_demo_mode(db):
                logger.info("Demo mode active — skipping credential load.")
                from app.services import cache_service
                if cache_service.read_cache(db, "account_balance") is None:
                    from app.services.demo_service import seed_demo
                    seed_demo(db)
            else:
                load_credentials(db)
            interval = app_config_service.get_cache_interval(db)
            _start_scheduler(interval)
        else:
            logger.info("Setup not complete — running in setup mode. Open the app to configure.")
    finally:
        db.close()

    yield

    if _scheduler is not None:
        _scheduler.shutdown(wait=False)


app = FastAPI(title="Wint Liquidity Visualizer", lifespan=lifespan)

app_env = os.environ.get("APP_ENV", "development")
if app_env == "development":
    cors_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
else:
    cors_origins = []
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionAuthMiddleware)

app.include_router(health.router)
app.include_router(auth_router.router)
app.include_router(setup.router)
app.include_router(config_router.router)
app.include_router(invoices.router)
app.include_router(cache.router)
app.include_router(settings_router.router)
app.include_router(app_settings_router.router)
app.include_router(forecast.router)
app.include_router(data_router.router)

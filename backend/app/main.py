from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.db.init_db import init_db

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.db_init_on_startup:
        try:
            await init_db()
        except Exception as exc:
            if settings.db_init_strict:
                raise
            logger.warning("DB init skipped on startup: %s", exc)
    yield


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

raw_origins = [origin.strip() for origin in settings.cors_allow_origins.split(",") if origin.strip()]
allow_all_origins = "*" in raw_origins or not raw_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else raw_origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"message": f"{settings.app_name} is running"}

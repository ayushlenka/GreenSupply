from collections.abc import AsyncGenerator
import ssl
from urllib.parse import urlparse, urlunparse

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

database_url = settings.database_url
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

parsed = urlparse(database_url)
is_supabase_pooler = (parsed.hostname or "").endswith(".pooler.supabase.com")
if is_supabase_pooler and parsed.port == 5432:
    # Supabase session pooler uses 6543; auto-correct common copy/paste mismatch.
    netloc = parsed.netloc.replace(":5432", ":6543")
    database_url = urlunparse(parsed._replace(netloc=netloc))

connect_args: dict[str, object] = {"timeout": settings.db_connect_timeout_seconds}
if "supabase.com" in (parsed.hostname or ""):
    ssl_context = ssl.create_default_context()
    if not settings.db_ssl_verify:
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ssl_context

engine = create_async_engine(
    database_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    connect_args=connect_args,
)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, autoflush=False, expire_on_commit=False)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def check_db_connection() -> tuple[bool, str]:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True, "ok"
    except Exception as exc:
        detail = str(exc).strip() or repr(exc)
        return False, f"{type(exc).__name__}: {detail}"

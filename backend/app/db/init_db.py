from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.db.models import Business, BuyingGroup, GroupCommitment, Product
from app.db.seed import seed_products
from app.db.session import SessionLocal, engine


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:  # type: AsyncSession
        await seed_products(session)

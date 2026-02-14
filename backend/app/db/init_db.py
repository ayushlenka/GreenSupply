from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.db.models import (
    Business,
    BuyingGroup,
    GroupCommitment,
    Product,
    Region,
    SupplierConfirmedOrder,
    SupplierProduct,
)
from app.db.seed import seed_products, seed_regions
from app.db.session import SessionLocal, engine


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Lightweight schema evolution for existing dev databases without migrations.
        statements = [
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS account_type VARCHAR(30) DEFAULT 'business' NOT NULL",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address VARCHAR(255)",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS state VARCHAR(50)",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS region_id INTEGER",
            "ALTER TABLE buying_groups ADD COLUMN IF NOT EXISTS region_id INTEGER",
            "ALTER TABLE buying_groups ADD COLUMN IF NOT EXISTS supplier_business_id VARCHAR(36)",
            "ALTER TABLE buying_groups ADD COLUMN IF NOT EXISTS supplier_product_id VARCHAR(36)",
            "ALTER TABLE buying_groups ADD COLUMN IF NOT EXISTS min_businesses_required INTEGER DEFAULT 5",
            "ALTER TABLE buying_groups ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ",
            "ALTER TABLE supplier_confirmed_orders ADD COLUMN IF NOT EXISTS supplier_product_id VARCHAR(36)",
        ]
        for ddl in statements:
            try:
                await conn.execute(text(ddl))
            except Exception:
                pass

    async with SessionLocal() as session:  # type: AsyncSession
        await seed_regions(session)
        await seed_products(session)

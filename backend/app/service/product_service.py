from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.product import Product


async def list_products(session: AsyncSession) -> list[Product]:
    result = await session.execute(select(Product).order_by(Product.category.asc(), Product.name.asc()))
    return list(result.scalars().all())

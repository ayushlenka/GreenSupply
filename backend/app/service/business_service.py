from datetime import datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.business import Business


async def create_business(
    session: AsyncSession,
    *,
    name: str | None,
    business_type: str,
    neighborhood: str,
    zip_code: str | None,
) -> Business:
    business = Business(
        id=str(uuid4()),
        name=name,
        business_type=business_type,
        neighborhood=neighborhood,
        zip=zip_code,
        created_at=datetime.utcnow(),
    )
    session.add(business)
    await session.commit()
    await session.refresh(business)
    return business


async def get_business_by_id(session: AsyncSession, business_id: str) -> Business | None:
    result = await session.execute(select(Business).where(Business.id == business_id))
    return result.scalar_one_or_none()

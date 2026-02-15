from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.region import Region

DAVIS_ZIP_REGION_FALLBACK: dict[str, str] = {
    "94102": "SF-2-2",
    "94103": "SF-2-3",
    "94107": "SF-3-3",
    "94109": "SF-1-2",
    "94110": "SF-3-2",
    "94114": "SF-2-1",
    "94117": "SF-2-1",
    "94118": "SF-1-1",
}


async def find_region_by_lat_lng(session: AsyncSession, latitude: float, longitude: float) -> Region | None:
    stmt = select(Region).where(
        Region.min_lat <= latitude,
        Region.max_lat >= latitude,
        Region.min_lng <= longitude,
        Region.max_lng >= longitude,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def find_region_by_zip_fallback(session: AsyncSession, zip_code: str | None) -> Region | None:
    if not zip_code:
        return None
    code = DAVIS_ZIP_REGION_FALLBACK.get(zip_code.strip())
    if not code:
        return None
    result = await session.execute(select(Region).where(Region.code == code))
    return result.scalar_one_or_none()

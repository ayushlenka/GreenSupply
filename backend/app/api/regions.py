from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.region import Region
from app.db.session import get_db_session

router = APIRouter(prefix="/regions")


@router.get("")
async def list_regions(db: AsyncSession = Depends(get_db_session)) -> list[dict[str, object]]:
    result = await db.execute(select(Region).order_by(Region.row_index.asc(), Region.col_index.asc()))
    regions = result.scalars().all()
    return [
        {
            "id": region.id,
            "code": region.code,
            "name": region.name,
            "row_index": region.row_index,
            "col_index": region.col_index,
            "bounds": {
                "min_lat": region.min_lat,
                "max_lat": region.max_lat,
                "min_lng": region.min_lng,
                "max_lng": region.max_lng,
            },
        }
        for region in regions
    ]

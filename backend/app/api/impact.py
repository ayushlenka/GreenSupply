from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.domain import ImpactRead
from app.service.group_service import get_group_impact

router = APIRouter(prefix="/groups")


@router.get("/{group_id}/impact", response_model=ImpactRead)
async def get_group_impact_endpoint(group_id: str, db: AsyncSession = Depends(get_db_session)) -> ImpactRead:
    impact = await get_group_impact(db, group_id)
    if not impact:
        raise HTTPException(status_code=404, detail="Group not found")
    return ImpactRead(**impact)

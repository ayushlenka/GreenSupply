from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.domain import GroupCreate, GroupDetailRead, GroupJoinCreate, GroupRead
from app.service.group_service import create_group, get_group_details, join_group, list_active_groups

router = APIRouter(prefix="/groups")


@router.get("", response_model=list[GroupRead])
async def list_groups_endpoint(db: AsyncSession = Depends(get_db_session)) -> list[GroupRead]:
    groups = await list_active_groups(db)
    return [GroupRead(**group) for group in groups]


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
async def create_group_endpoint(payload: GroupCreate, db: AsyncSession = Depends(get_db_session)) -> GroupRead:
    try:
        group = await create_group(
            db,
            product_id=payload.product_id,
            created_by_business_id=payload.created_by_business_id,
            target_units=payload.target_units,
            deadline=payload.deadline,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    details = await get_group_details(db, group.id)
    if not details:
        raise HTTPException(status_code=500, detail="Failed to load created group")
    return GroupRead(**details)


@router.post("/{group_id}/join", response_model=GroupDetailRead)
async def join_group_endpoint(group_id: str, payload: GroupJoinCreate, db: AsyncSession = Depends(get_db_session)) -> GroupDetailRead:
    try:
        await join_group(db, group_id=group_id, business_id=payload.business_id, units=payload.units)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    details = await get_group_details(db, group_id)
    if not details:
        raise HTTPException(status_code=404, detail="Group not found")
    return GroupDetailRead(**details)


@router.get("/{group_id}", response_model=GroupDetailRead)
async def get_group_endpoint(group_id: str, db: AsyncSession = Depends(get_db_session)) -> GroupDetailRead:
    details = await get_group_details(db, group_id)
    if not details:
        raise HTTPException(status_code=404, detail="Group not found")
    return GroupDetailRead(**details)

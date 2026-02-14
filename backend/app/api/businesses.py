from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.domain import BusinessCreate, BusinessRead
from app.service.business_service import create_business, get_business_by_id

router = APIRouter(prefix="/businesses")


@router.post("", response_model=BusinessRead, status_code=status.HTTP_201_CREATED)
async def create_business_endpoint(payload: BusinessCreate, db: AsyncSession = Depends(get_db_session)) -> BusinessRead:
    try:
        business = await create_business(
            db,
            name=payload.name,
            email=payload.email,
            business_type=payload.business_type,
            account_type=payload.account_type,
            address=payload.address,
            neighborhood=payload.neighborhood,
            zip_code=payload.zip_code,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessRead.model_validate(business)


@router.get("/{business_id}", response_model=BusinessRead)
async def get_business_endpoint(business_id: str, db: AsyncSession = Depends(get_db_session)) -> BusinessRead:
    business = await get_business_by_id(db, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return BusinessRead.model_validate(business)

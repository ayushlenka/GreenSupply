from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.domain import BusinessOrderRead
from app.service.business_order_service import list_business_orders

router = APIRouter(prefix="/business-orders")


@router.get("", response_model=list[BusinessOrderRead])
async def list_business_orders_endpoint(
    db: AsyncSession = Depends(get_db_session),
    business_id: str = Query(...),
) -> list[BusinessOrderRead]:
    rows = await list_business_orders(db, business_id=business_id)
    return [BusinessOrderRead(**row) for row in rows]

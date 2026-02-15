from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.domain import BusinessDashboardSummaryRead
from app.service.dashboard_service import get_business_dashboard_summary

router = APIRouter(prefix="/dashboard")


@router.get("/business-summary", response_model=BusinessDashboardSummaryRead)
async def business_summary(
    db: AsyncSession = Depends(get_db_session),
    business_id: str = Query(...),
) -> BusinessDashboardSummaryRead:
    data = await get_business_dashboard_summary(db, business_id=business_id)
    return BusinessDashboardSummaryRead(**data)

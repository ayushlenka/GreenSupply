from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.recommendation import (
    DashboardRecommendationRequest,
    DashboardRecommendationResponse,
    RecommendationRequest,
    RecommendationResponse,
)
from app.service.recommendation_service import build_dashboard_recommendation, build_group_recommendation

router = APIRouter(prefix="/recommend")


@router.post("", response_model=RecommendationResponse)
async def recommend_endpoint(
    payload: RecommendationRequest,
    db: AsyncSession = Depends(get_db_session),
) -> RecommendationResponse:
    try:
        recommendation = await build_group_recommendation(
            db,
            group_id=payload.group_id,
            constraints=payload.constraints,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return RecommendationResponse(**recommendation)


@router.post("/dashboard", response_model=DashboardRecommendationResponse)
async def recommend_dashboard_endpoint(
    payload: DashboardRecommendationRequest,
    db: AsyncSession = Depends(get_db_session),
) -> DashboardRecommendationResponse:
    recommendation = await build_dashboard_recommendation(
        db,
        business_name=payload.business_name,
        city_businesses=payload.city_businesses,
    )
    return DashboardRecommendationResponse(**recommendation)

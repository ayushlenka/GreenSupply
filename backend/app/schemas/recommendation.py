from pydantic import BaseModel


class RecommendationRequest(BaseModel):
    group_id: str
    constraints: str | None = None


class RecommendationResponse(BaseModel):
    group_id: str
    source: str
    recommended_packaging: str
    tradeoffs: str
    sustainability_report: str


class DashboardRecommendationRequest(BaseModel):
    business_name: str | None = None
    city_businesses: int | None = None


class DashboardRecommendationResponse(BaseModel):
    source: str
    executive_summary: str
    key_insight: str
    action_plan: str
    city_scale_projection: str

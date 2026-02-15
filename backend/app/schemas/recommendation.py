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


class GroupOpportunitiesRequest(BaseModel):
    business_id: str
    max_results: int = 3
    constraints: str | None = None


class GroupOpportunity(BaseModel):
    supplier_business_id: str
    supplier_business_name: str | None = None
    supplier_product_id: str
    product_name: str
    category: str
    material: str
    recommended_target_units: int
    recommended_min_businesses_required: int
    recommended_deadline_days: int
    recommended_initial_commitment_units: int
    outreach_copy: str
    reasoning: str
    evidence_used: str
    risk_note: str


class GroupOpportunitiesResponse(BaseModel):
    source: str
    region_id: int | None = None
    opportunities: list[GroupOpportunity]

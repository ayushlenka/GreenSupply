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

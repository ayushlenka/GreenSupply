from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class BusinessCreate(BaseModel):
    name: str | None = None
    business_type: str
    neighborhood: str
    zip_code: str | None = Field(default=None, alias="zip")


class BusinessRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str | None = None
    business_type: str
    neighborhood: str
    zip: str | None = None
    created_at: datetime


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: str
    material: str
    certifications: list[str]
    retail_unit_price: float
    bulk_unit_price: float
    min_bulk_units: int
    co2_per_unit_kg: float
    plastic_avoided_per_unit_kg: float


class GroupCreate(BaseModel):
    product_id: str
    created_by_business_id: str
    target_units: int | None = None
    deadline: datetime | None = None


class GroupJoinCreate(BaseModel):
    business_id: str
    units: int


class GroupCommitmentRead(BaseModel):
    id: str
    business_id: str
    units: int
    created_at: datetime


class GroupRead(BaseModel):
    id: str
    status: str
    deadline: datetime | None = None
    target_units: int
    current_units: int
    business_count: int
    progress_pct: float
    estimated_savings_usd: float
    estimated_savings_pct: float
    estimated_co2_saved_kg: float
    estimated_plastic_avoided_kg: float
    delivery_trips_reduced: int
    delivery_miles_saved: float
    product: dict[str, Any]


class GroupDetailRead(GroupRead):
    created_by_business_id: str
    commitments: list[GroupCommitmentRead]


class ImpactRead(BaseModel):
    group_id: str
    current_units: int
    estimated_savings_usd: float
    estimated_co2_saved_kg: float
    estimated_plastic_avoided_kg: float
    delivery_miles_saved: float
    delivery_trips_reduced: int
    city_scale_projection: dict[str, float | int]

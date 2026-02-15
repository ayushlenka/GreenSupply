from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class BusinessCreate(BaseModel):
    name: str | None = None
    email: str | None = None
    business_type: str | None = None
    account_type: str = "business"
    address: str | None = None
    city: str | None = None
    state: str | None = None
    neighborhood: str | None = None
    zip_code: str | None = Field(default=None, alias="zip")
    latitude: float | None = None
    longitude: float | None = None


class BusinessRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str | None = None
    email: str | None = None
    business_type: str
    account_type: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    neighborhood: str
    zip: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    region_id: int | None = None
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
    supplier_business_id: str | None = None
    supplier_product_id: str | None = None
    target_units: int | None = None
    min_businesses_required: int | None = None
    deadline: datetime | None = None


class GroupJoinCreate(BaseModel):
    business_id: str
    units: int


class SupplierGroupApproveCreate(BaseModel):
    supplier_business_id: str


class GroupCommitmentRead(BaseModel):
    id: str
    business_id: str
    business_name: str | None = None
    business_address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    units: int
    created_at: datetime


class GroupRead(BaseModel):
    id: str
    status: str
    created_by_business_id: str | None = None
    region_id: int | None = None
    group_center_latitude: float | None = None
    group_center_longitude: float | None = None
    supplier_business_id: str | None = None
    supplier_product_id: str | None = None
    supplier_available_units: int | None = None
    min_businesses_required: int | None = None
    confirmed_at: datetime | None = None
    scheduled_start_at: datetime | None = None
    estimated_end_at: datetime | None = None
    deadline: datetime | None = None
    target_units: int
    remaining_units: int | None = None
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
    confirmed_order: dict[str, Any] | None = None


class ImpactRead(BaseModel):
    group_id: str
    current_units: int
    estimated_savings_usd: float
    estimated_co2_saved_kg: float
    estimated_plastic_avoided_kg: float
    delivery_miles_saved: float
    delivery_trips_reduced: int
    city_scale_projection: dict[str, float | int]


class SupplierProductCreate(BaseModel):
    supplier_business_id: str
    name: str
    category: str
    material: str
    available_units: int
    unit_price: float
    min_order_units: int = 1


class SupplierProductRead(BaseModel):
    id: str
    supplier_business_id: str
    supplier_business_name: str | None = None
    name: str
    category: str
    material: str
    available_units: int
    unit_price: float
    min_order_units: int
    status: str
    created_at: datetime
    updated_at: datetime


class SupplierConfirmedOrderRead(BaseModel):
    id: str
    supplier_business_id: str
    supplier_product_id: str | None = None
    group_id: str
    total_units: int
    business_count: int
    status: str
    scheduled_start_at: datetime | None = None
    estimated_end_at: datetime | None = None
    route_total_miles: float | None = None
    route_total_minutes: float | None = None
    route_points: list[list[float]] | None = None
    group_display_name: str | None = None
    product_name: str | None = None
    created_at: datetime


class BusinessOrderParticipantRead(BaseModel):
    business_id: str
    business_name: str | None = None
    business_address: str | None = None
    units: int


class BusinessOrderRead(BaseModel):
    id: str
    group_id: str
    group_display_name: str
    product_name: str | None = None
    status: str
    scheduled_start_at: datetime | None = None
    estimated_end_at: datetime | None = None
    total_units: int
    business_count: int
    your_units: int
    participants: list[BusinessOrderParticipantRead]
    created_at: datetime


class BusinessDashboardSummaryRead(BaseModel):
    your_total_savings_usd: float
    your_weighted_savings_pct: float
    your_groups_joined: int
    your_group_conversion_rate: float
    your_median_time_to_confirmation_hours: float | None = None
    your_units_committed: int
    your_co2_saved_kg: float
    your_plastic_avoided_kg: float

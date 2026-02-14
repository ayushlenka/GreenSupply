from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SupplierConfirmedOrder(Base):
    __tablename__ = "supplier_confirmed_orders"
    __table_args__ = (UniqueConstraint("group_id", name="uq_supplier_confirmed_orders_group_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    supplier_business_id: Mapped[str] = mapped_column(String(36), ForeignKey("businesses.id"), nullable=False)
    supplier_product_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("supplier_products.id"), nullable=True)
    group_id: Mapped[str] = mapped_column(String(36), ForeignKey("buying_groups.id"), nullable=False)
    total_units: Mapped[int] = mapped_column(Integer, nullable=False)
    business_count: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="confirmed")
    scheduled_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    estimated_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    route_total_miles: Mapped[float | None] = mapped_column(Float, nullable=True)
    route_total_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)
    route_points: Mapped[list[list[float]] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

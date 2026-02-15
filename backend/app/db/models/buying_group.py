from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BuyingGroup(Base):
    __tablename__ = "buying_groups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False)
    created_by_business_id: Mapped[str] = mapped_column(String(36), ForeignKey("businesses.id"), nullable=False)
    supplier_business_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("businesses.id"), nullable=True)
    supplier_product_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("supplier_products.id"), nullable=True)
    region_id: Mapped[int] = mapped_column(Integer, ForeignKey("regions.id"), nullable=False)
    target_units: Mapped[int] = mapped_column(Integer, nullable=False)
    min_businesses_required: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, JSON, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    material: Mapped[str] = mapped_column(String(100), nullable=False)
    certifications: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    retail_unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    bulk_unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    min_bulk_units: Mapped[int] = mapped_column(Integer, nullable=False)
    co2_per_unit_kg: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False)
    plastic_avoided_per_unit_kg: Mapped[Decimal] = mapped_column(Numeric(10, 6), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

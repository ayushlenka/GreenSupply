from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    business_type: Mapped[str] = mapped_column(String(100), nullable=False)
    account_type: Mapped[str] = mapped_column(String(30), nullable=False, default="business")
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    neighborhood: Mapped[str] = mapped_column(String(100), nullable=False)
    zip: Mapped[str | None] = mapped_column(String(20), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    region_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("regions.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GroupCommitment(Base):
    __tablename__ = "group_commitments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    group_id: Mapped[str] = mapped_column(String(36), ForeignKey("buying_groups.id"), nullable=False)
    business_id: Mapped[str] = mapped_column(String(36), ForeignKey("businesses.id"), nullable=False)
    units: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

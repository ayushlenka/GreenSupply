from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.supplier_confirmed_order import SupplierConfirmedOrder


async def list_supplier_confirmed_orders(
    session: AsyncSession, supplier_business_id: str | None = None
) -> list[SupplierConfirmedOrder]:
    stmt = select(SupplierConfirmedOrder).order_by(SupplierConfirmedOrder.created_at.desc())
    if supplier_business_id:
        stmt = stmt.where(SupplierConfirmedOrder.supplier_business_id == supplier_business_id)
    result = await session.execute(stmt)
    return list(result.scalars().all())

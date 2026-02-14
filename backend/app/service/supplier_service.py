from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.business import Business
from app.db.models.buying_group import BuyingGroup
from app.db.models.group_commitment import GroupCommitment
from app.db.models.supplier_product import SupplierProduct


async def create_supplier_product(
    session: AsyncSession,
    *,
    supplier_business_id: str,
    name: str,
    category: str,
    material: str,
    available_units: int,
    unit_price: float,
    min_order_units: int,
) -> SupplierProduct:
    supplier = await session.get(Business, supplier_business_id)
    if not supplier:
        raise ValueError("Supplier business not found")
    if supplier.account_type != "supplier":
        raise ValueError("Business account is not a supplier")
    if available_units <= 0:
        raise ValueError("available_units must be greater than 0")
    if unit_price <= 0:
        raise ValueError("unit_price must be greater than 0")
    if min_order_units <= 0:
        raise ValueError("min_order_units must be greater than 0")

    item = SupplierProduct(
        id=str(uuid4()),
        supplier_business_id=supplier_business_id,
        name=name,
        category=category,
        material=material,
        available_units=available_units,
        unit_price=Decimal(str(unit_price)),
        min_order_units=min_order_units,
        status="active",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


async def list_supplier_products(session: AsyncSession, supplier_business_id: str | None = None) -> list[SupplierProduct]:
    stmt = select(SupplierProduct).where(SupplierProduct.status == "active").order_by(SupplierProduct.created_at.desc())
    if supplier_business_id:
        stmt = stmt.where(SupplierProduct.supplier_business_id == supplier_business_id)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_reserved_units_by_supplier_product(
    session: AsyncSession,
    supplier_product_ids: list[str],
    *,
    exclude_group_id: str | None = None,
) -> dict[str, int]:
    if not supplier_product_ids:
        return {}

    stmt = (
        select(
            BuyingGroup.supplier_product_id,
            func.coalesce(func.sum(GroupCommitment.units), 0).label("reserved_units"),
        )
        .join(GroupCommitment, GroupCommitment.group_id == BuyingGroup.id)
        .where(
            BuyingGroup.status == "active",
            BuyingGroup.supplier_product_id.in_(supplier_product_ids),
        )
        .group_by(BuyingGroup.supplier_product_id)
    )
    if exclude_group_id:
        stmt = stmt.where(BuyingGroup.id != exclude_group_id)

    result = await session.execute(stmt)
    return {str(supplier_product_id): int(reserved_units or 0) for supplier_product_id, reserved_units in result.all()}

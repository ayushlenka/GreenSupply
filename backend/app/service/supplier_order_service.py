from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.buying_group import BuyingGroup
from app.db.models.product import Product
from app.db.models.supplier_confirmed_order import SupplierConfirmedOrder
from app.db.models.supplier_product import SupplierProduct


async def list_supplier_confirmed_orders(
    session: AsyncSession, supplier_business_id: str | None = None
) -> list[dict[str, object]]:
    stmt = (
        select(SupplierConfirmedOrder, BuyingGroup, Product, SupplierProduct)
        .outerjoin(BuyingGroup, BuyingGroup.id == SupplierConfirmedOrder.group_id)
        .outerjoin(Product, Product.id == BuyingGroup.product_id)
        .outerjoin(SupplierProduct, SupplierProduct.id == SupplierConfirmedOrder.supplier_product_id)
        .order_by(SupplierConfirmedOrder.created_at.desc())
    )
    if supplier_business_id:
        stmt = stmt.where(SupplierConfirmedOrder.supplier_business_id == supplier_business_id)
    result = await session.execute(stmt)

    payload: list[dict[str, object]] = []
    for order, group, product, supplier_product in result.all():
        product_name = None
        if supplier_product is not None:
            product_name = supplier_product.name
        elif product is not None:
            product_name = product.name

        short_group_id = str(order.group_id)[:8]
        group_display_name = f"{product_name or 'Group Order'} - {short_group_id}"

        payload.append(
            {
                "id": order.id,
                "supplier_business_id": order.supplier_business_id,
                "supplier_product_id": order.supplier_product_id,
                "group_id": order.group_id,
                "total_units": order.total_units,
                "business_count": order.business_count,
                "status": order.status,
                "scheduled_start_at": order.scheduled_start_at,
                "estimated_end_at": order.estimated_end_at,
                "route_total_miles": order.route_total_miles,
                "route_total_minutes": order.route_total_minutes,
                "route_points": order.route_points,
                "group_display_name": group_display_name,
                "product_name": product_name,
                "created_at": order.created_at,
            }
        )
    return payload

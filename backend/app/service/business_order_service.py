from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.business import Business
from app.db.models.buying_group import BuyingGroup
from app.db.models.group_commitment import GroupCommitment
from app.db.models.product import Product
from app.db.models.supplier_confirmed_order import SupplierConfirmedOrder
from app.db.models.supplier_product import SupplierProduct
from app.service.supplier_order_service import reconcile_completed_orders


async def list_business_orders(session: AsyncSession, business_id: str) -> list[dict[str, object]]:
    base_stmt = (
        select(
            SupplierConfirmedOrder,
            BuyingGroup,
            Product,
            SupplierProduct,
            GroupCommitment,
        )
        .join(BuyingGroup, BuyingGroup.id == SupplierConfirmedOrder.group_id)
        .join(GroupCommitment, GroupCommitment.group_id == BuyingGroup.id)
        .outerjoin(Product, Product.id == BuyingGroup.product_id)
        .outerjoin(SupplierProduct, SupplierProduct.id == SupplierConfirmedOrder.supplier_product_id)
        .where(GroupCommitment.business_id == business_id)
        .order_by(SupplierConfirmedOrder.created_at.desc())
    )
    result = await session.execute(base_stmt)
    rows = result.all()

    order_rows_for_reconcile = [(order, group, product, supplier_product) for order, group, product, supplier_product, _ in rows]
    await reconcile_completed_orders(session, order_rows_for_reconcile)

    group_ids = sorted({str(group.id) for _, group, _, _, _ in rows if group is not None})
    participants_by_group: dict[str, list[dict[str, object]]] = {}
    if group_ids:
        participants_result = await session.execute(
            select(GroupCommitment.group_id, Business.id, Business.name, Business.address, GroupCommitment.units)
            .join(Business, Business.id == GroupCommitment.business_id)
            .where(GroupCommitment.group_id.in_(group_ids))
            .order_by(GroupCommitment.created_at.asc())
        )
        for group_id, participant_id, participant_name, participant_address, units in participants_result.all():
            gid = str(group_id)
            participants_by_group.setdefault(gid, []).append(
                {
                    "business_id": str(participant_id),
                    "business_name": participant_name,
                    "business_address": participant_address,
                    "units": int(units or 0),
                }
            )

    payload: list[dict[str, object]] = []
    for order, group, product, supplier_product, your_commitment in rows:
        product_name = None
        if supplier_product is not None:
            product_name = supplier_product.name
        elif product is not None:
            product_name = product.name
        group_display_name = f"{product_name or 'Group Order'} - {str(order.group_id)[:8]}"
        payload.append(
            {
                "id": order.id,
                "group_id": order.group_id,
                "group_display_name": group_display_name,
                "product_name": product_name,
                "status": order.status,
                "scheduled_start_at": order.scheduled_start_at,
                "estimated_end_at": order.estimated_end_at,
                "total_units": order.total_units,
                "business_count": order.business_count,
                "your_units": int(your_commitment.units or 0),
                "participants": participants_by_group.get(str(order.group_id), []),
                "created_at": order.created_at,
            }
        )
    return payload

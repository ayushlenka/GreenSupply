from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.domain import SupplierConfirmedOrderRead
from app.service.supplier_order_service import list_supplier_confirmed_orders

router = APIRouter(prefix="/supplier-orders")


@router.get("", response_model=list[SupplierConfirmedOrderRead])
async def list_supplier_orders_endpoint(
    db: AsyncSession = Depends(get_db_session),
    supplier_business_id: str | None = Query(default=None),
) -> list[SupplierConfirmedOrderRead]:
    rows = await list_supplier_confirmed_orders(db, supplier_business_id=supplier_business_id)
    return [
        SupplierConfirmedOrderRead(
            id=row.id,
            supplier_business_id=row.supplier_business_id,
            supplier_product_id=row.supplier_product_id,
            group_id=row.group_id,
            total_units=row.total_units,
            business_count=row.business_count,
            status=row.status,
            created_at=row.created_at,
        )
        for row in rows
    ]

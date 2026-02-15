from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.business import Business
from app.db.session import get_db_session
from app.schemas.domain import SupplierProductCreate, SupplierProductRead
from app.service.supplier_service import (
    create_supplier_product,
    get_reserved_units_by_supplier_product,
    list_supplier_products,
)
from app.service.utils import to_float

router = APIRouter(prefix="/supplier-products")


@router.post("", response_model=SupplierProductRead, status_code=status.HTTP_201_CREATED)
async def create_supplier_product_endpoint(
    payload: SupplierProductCreate,
    db: AsyncSession = Depends(get_db_session),
) -> SupplierProductRead:
    try:
        item = await create_supplier_product(
            db,
            supplier_business_id=payload.supplier_business_id,
            name=payload.name,
            category=payload.category,
            material=payload.material,
            available_units=payload.available_units,
            unit_price=payload.unit_price,
            min_order_units=payload.min_order_units,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SupplierProductRead(
        id=item.id,
        supplier_business_id=item.supplier_business_id,
        supplier_business_name=None,
        name=item.name,
        category=item.category,
        material=item.material,
        available_units=item.available_units,
        unit_price=to_float(item.unit_price),
        min_order_units=item.min_order_units,
        status=item.status,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=list[SupplierProductRead])
async def list_supplier_products_endpoint(
    db: AsyncSession = Depends(get_db_session),
    supplier_business_id: str | None = Query(default=None),
) -> list[SupplierProductRead]:
    items = await list_supplier_products(db, supplier_business_id=supplier_business_id)
    reserved_by_product = await get_reserved_units_by_supplier_product(db, [item.id for item in items])
    supplier_ids = sorted({item.supplier_business_id for item in items if item.supplier_business_id})
    supplier_names_by_id: dict[str, str | None] = {}
    if supplier_ids:
        supplier_result = await db.execute(select(Business.id, Business.name).where(Business.id.in_(supplier_ids)))
        supplier_names_by_id = {str(sid): name for sid, name in supplier_result.all()}

    return [
        SupplierProductRead(
            id=item.id,
            supplier_business_id=item.supplier_business_id,
            supplier_business_name=supplier_names_by_id.get(item.supplier_business_id),
            name=item.name,
            category=item.category,
            material=item.material,
            available_units=max(0, int(item.available_units) - int(reserved_by_product.get(item.id, 0))),
            unit_price=to_float(item.unit_price),
            min_order_units=item.min_order_units,
            status=item.status,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in items
    ]

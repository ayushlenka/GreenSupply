from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.domain import SupplierProductCreate, SupplierProductRead
from app.service.supplier_service import create_supplier_product, list_supplier_products
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
    return [
        SupplierProductRead(
            id=item.id,
            supplier_business_id=item.supplier_business_id,
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
        for item in items
    ]

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.domain import ProductRead
from app.service.product_service import list_products
from app.service.utils import to_float

router = APIRouter(prefix="/products")


@router.get("", response_model=list[ProductRead])
async def list_products_endpoint(db: AsyncSession = Depends(get_db_session)) -> list[ProductRead]:
    products = await list_products(db)
    return [
        ProductRead(
            id=product.id,
            name=product.name,
            category=product.category,
            material=product.material,
            certifications=product.certifications,
            retail_unit_price=to_float(product.retail_unit_price),
            bulk_unit_price=to_float(product.bulk_unit_price),
            min_bulk_units=product.min_bulk_units,
            co2_per_unit_kg=to_float(product.co2_per_unit_kg),
            plastic_avoided_per_unit_kg=to_float(product.plastic_avoided_per_unit_kg),
        )
        for product in products
    ]

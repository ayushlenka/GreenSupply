from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.businesses import router as businesses_router
from app.api.groups import router as groups_router
from app.api.health import router as health_router
from app.api.impact import router as impact_router
from app.api.products import router as products_router
from app.api.regions import router as regions_router
from app.api.recommend import router as recommend_router
from app.api.supplier_products import router as supplier_products_router
from app.api.supplier_orders import router as supplier_orders_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(businesses_router, tags=["businesses"])
api_router.include_router(products_router, tags=["products"])
api_router.include_router(regions_router, tags=["regions"])
api_router.include_router(groups_router, tags=["groups"])
api_router.include_router(impact_router, tags=["impact"])
api_router.include_router(recommend_router, tags=["recommend"])
api_router.include_router(supplier_products_router, tags=["supplier-products"])
api_router.include_router(supplier_orders_router, tags=["supplier-orders"])

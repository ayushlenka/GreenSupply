from fastapi import APIRouter

from app.service.health_service import build_health_payload

router = APIRouter(prefix="/health")


@router.get("", summary="Health check")
async def health_check() -> dict[str, str]:
    return build_health_payload()

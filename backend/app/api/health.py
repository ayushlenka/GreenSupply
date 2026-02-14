from fastapi import APIRouter, HTTPException

from app.db.session import check_db_connection
from app.service.health_service import build_health_payload

router = APIRouter(prefix="/health")


@router.get("", summary="Health check")
async def health_check() -> dict[str, str]:
    return build_health_payload()


@router.get("/db", summary="Database health check")
async def db_health_check() -> dict[str, str]:
    ok, detail = await check_db_connection()
    if ok:
        return {"status": "ok", "db": "connected"}
    raise HTTPException(status_code=503, detail={"status": "error", "db": "disconnected", "reason": detail})

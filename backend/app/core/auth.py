import asyncio
import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.config import Settings, get_settings

security = HTTPBearer()


class AuthenticatedUser(BaseModel):
    user_id: str
    role: str | None = None
    email: str | None = None
    claims: dict[str, Any]


def _unauthorized(detail: str = "Invalid or expired token") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def _fetch_supabase_user(token: str, settings: Settings) -> dict[str, Any]:
    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL is not configured",
        )

    if not settings.supabase_anon_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_ANON_KEY is not configured",
        )

    user_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"

    def _fetch() -> dict[str, Any]:
        request = Request(
            user_url,
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key,
            },
        )
        with urlopen(request, timeout=10.0) as response:
            return json.loads(response.read().decode("utf-8"))

    try:
        return await asyncio.to_thread(_fetch)
    except HTTPError as exc:
        if exc.code in (401, 403):
            raise _unauthorized() from exc
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to validate token with Supabase",
        ) from exc
    except (URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to validate token with Supabase",
        ) from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    token = credentials.credentials
    user_data = await _fetch_supabase_user(token, settings)

    user_id = user_data.get("id")
    if not user_id:
        raise _unauthorized("Token subject is missing")

    app_metadata = user_data.get("app_metadata") or {}
    user_metadata = user_data.get("user_metadata") or {}

    claims = {
        "app_metadata": app_metadata,
        "user_metadata": user_metadata,
        "aud": user_data.get("aud"),
    }

    role = app_metadata.get("role") or user_data.get("role")

    return AuthenticatedUser(
        user_id=user_id,
        role=role,
        email=user_data.get("email"),
        claims=claims,
    )

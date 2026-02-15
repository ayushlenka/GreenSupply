from fastapi import APIRouter, Depends

from app.core.auth import AuthenticatedUser, get_current_user

router = APIRouter(prefix="/auth")


@router.get("/me", summary="Get current user")
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user)) -> dict[str, str | None]:
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "role": current_user.role,
    }

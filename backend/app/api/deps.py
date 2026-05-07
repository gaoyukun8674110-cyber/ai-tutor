"""Shared API dependencies."""
from typing import Annotated

from fastapi import Header, status

from app.config import settings
from app.utils.errors import api_error


def get_current_user(api_key: Annotated[str | None, Header(alias="X-API-Key")] = None) -> str:
    """Validate the demo API key and return the scoped user id."""
    if not api_key:
        raise api_error(status.HTTP_401_UNAUTHORIZED, "unauthorized", "Missing X-API-Key header")

    if api_key not in settings.API_KEYS:
        raise api_error(status.HTTP_403_FORBIDDEN, "forbidden", "Invalid API key")

    if ":" in api_key:
        user_id, _ = api_key.split(":", 1)
        return user_id or settings.DEFAULT_AUTH_USER_ID

    return settings.DEFAULT_AUTH_USER_ID


def require_matching_user(user_id: str, current_user: str) -> None:
    """Reject attempts to access another user's path-scoped resource."""
    if user_id != current_user:
        raise api_error(status.HTTP_403_FORBIDDEN, "forbidden", "User is not authorized for this resource")

"""API error helpers."""
from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("ai_tutor")


def new_trace_id() -> str:
    return uuid.uuid4().hex


def public_error(code: str, user_message: str, trace_id: str | None = None) -> dict[str, str]:
    return {
        "code": code,
        "user_message": user_message,
        "trace_id": trace_id or new_trace_id(),
    }


def api_error(status_code: int, code: str, user_message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail=public_error(code, user_message))


def code_for_status(status_code: int) -> str:
    if status_code == 401:
        return "unauthorized"
    if status_code == 403:
        return "forbidden"
    if status_code == 404:
        return "not_found"
    if status_code >= 500:
        return "internal_error"
    return "request_error"


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    trace_id = new_trace_id()
    detail = exc.detail
    if isinstance(detail, dict) and {"code", "user_message", "trace_id"}.issubset(detail):
        payload = detail
    else:
        user_message = str(detail) if detail else "Request failed"
        payload = public_error(code_for_status(exc.status_code), user_message, trace_id)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": payload},
        headers={"X-Trace-Id": payload["trace_id"]},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    trace_id = new_trace_id()
    logger.exception("Unhandled API error trace_id=%s path=%s", trace_id, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": public_error("internal_error", "Internal error", trace_id)},
        headers={"X-Trace-Id": trace_id},
    )


def safe_llm_error(error: Any) -> dict[str, str]:
    trace_id = new_trace_id()
    logger.error("LLM provider error trace_id=%s error=%r", trace_id, error)
    return public_error("llm_provider_error", "Model provider is temporarily unavailable", trace_id)

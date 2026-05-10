"""Application bootstrap helpers."""

from __future__ import annotations

from typing import Any


def should_auto_create_schema(*, debug: bool, db_auto_create: bool | None) -> bool:
    if db_auto_create is not None:
        return db_auto_create
    return debug


def initialize_database(*, base: Any, engine: Any, should_create: bool) -> bool:
    if not should_create:
        return False
    base.metadata.create_all(bind=engine)
    return True

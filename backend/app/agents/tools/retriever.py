"""Retriever tool wrapping MaterialService."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.services.materials import MaterialService


class RetrieverTool:
    name = "retriever"

    def __init__(self, db: Session, material_service: MaterialService | None = None):
        self.db = db
        self.material_service = material_service

    def search(
        self,
        query: str,
        *,
        user_id: str | None,
        material_ids: list[int] | None = None,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        material_service = self.material_service or MaterialService(self.db)
        return material_service.search_materials(
            query=query,
            user_id=user_id,
            material_ids=material_ids,
            top_k=top_k,
        )

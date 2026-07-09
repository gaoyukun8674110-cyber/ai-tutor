"""Small typed registry for deterministic agent tools."""

from __future__ import annotations

from typing import Any


class ToolRegistry:
    def __init__(self, tools: dict[str, Any] | None = None):
        self._tools = dict(tools or {})

    def register(self, name: str, tool: Any) -> None:
        self._tools[name] = tool

    def get(self, name: str) -> Any:
        if name not in self._tools:
            raise KeyError(f"Tool is not registered: {name}")
        return self._tools[name]

    def has(self, name: str) -> bool:
        return name in self._tools

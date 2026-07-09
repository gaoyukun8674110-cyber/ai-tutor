"""Diagnostician specialist wrapper."""

from __future__ import annotations

from typing import Any

from app.agents.base import AgentContext, AgentResult, BaseAgent


class DiagnosticianAgent(BaseAgent):
    name = "diagnostician"
    allowed_tools = ["learner_store", "math"]

    def __init__(self, llm: Any):
        self.llm = llm

    def run(self, ctx: AgentContext, payload: dict[str, Any]) -> AgentResult:
        diagnosis = str(payload.get("diagnosis") or "")
        error_type = str(payload.get("error_type") or self.llm._extract_error_type(diagnosis))
        return AgentResult(
            content=diagnosis,
            state_updates={"error_type": error_type},
            used_tools=[],
            agent_type="diagnostician",
        )

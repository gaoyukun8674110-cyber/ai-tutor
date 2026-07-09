"""Grader specialist wrapper around deterministic math checks."""

from __future__ import annotations

from typing import Any

from app.agents.base import AgentContext, AgentResult, BaseAgent


class GraderAgent(BaseAgent):
    name = "grader"
    allowed_tools = ["math"]

    def __init__(self, math_tools: Any):
        self.math_tools = math_tools

    def run(self, ctx: AgentContext, payload: dict[str, Any]) -> AgentResult:
        student_answer = str(payload.get("student_answer") or "")
        correct_answer = str(payload.get("correct_answer") or "")
        verification = self.math_tools.verify_answer(student_answer, correct_answer)
        return AgentResult(
            content=None,
            state_updates={"math_verification": verification},
            used_tools=["math"],
            agent_type="grader",
        )

"""Reviewer specialist for learning report generation."""

from __future__ import annotations

from app.agents.base import AgentContext, AgentResult, BaseAgent


class ReviewerAgent(BaseAgent):
    name = "reviewer"
    allowed_tools = ["learner_store"]

    def run(self, ctx: AgentContext, payload: dict) -> AgentResult:
        report = dict(payload.get("report") or {})
        return AgentResult(
            content=None,
            state_updates={"review_report": report},
            used_tools=[],
            agent_type="reviewer",
        )

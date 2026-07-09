"""Planner specialist for session target selection."""

from __future__ import annotations

from app.agents.base import AgentContext, AgentResult, BaseAgent


class PlannerAgent(BaseAgent):
    name = "planner"
    allowed_tools = ["learner_store"]

    def run(self, ctx: AgentContext, payload: dict) -> AgentResult:
        mastery_info = dict(payload.get("mastery_info") or {})
        target_skills = mastery_info.get("recommended_skills", [])
        return AgentResult(
            state_updates={"target_skills": target_skills},
            used_tools=[],
            agent_type="planner",
        )

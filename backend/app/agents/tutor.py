"""Tutor specialist agent and deterministic teaching policy."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.agents.base import AgentContext, AgentResult, BaseAgent


@dataclass(frozen=True, slots=True)
class LearnerStyle:
    pace: str | None = None
    verbosity: str | None = None
    example_pref: str | None = None


class TeachingPolicy:
    ERROR_TYPE_STRATEGY = {
        "concept_error": "explain",
        "method_error": "socratic",
        "calculation_error": "recompute",
        "reading_error": "reread",
    }

    @classmethod
    def select(
        cls,
        error_type: str | None,
        signals: dict[str, Any] | None,
        mode: str | None,
        profile: LearnerStyle | None = None,
    ) -> str:
        del profile
        normalized_mode = (mode or "").strip().lower()
        if normalized_mode == "exam":
            return "exam"

        normalized_signals = signals or {}
        if normalized_signals.get("fatigue") or int(normalized_signals.get("consecutive_errors") or 0) >= 3:
            return "coach"

        return cls.ERROR_TYPE_STRATEGY.get((error_type or "").strip(), "socratic")


class TutorAgent(BaseAgent):
    name = "tutor"
    allowed_tools = ["retriever", "learner_store"]

    STRATEGY_PROMPT_PROFILE = {
        "explain": "explain",
        "socratic": "socratic",
        "recompute": "diagnose",
        "reread": "socratic",
        "coach": "coach",
        "exam": "exam",
    }

    def __init__(self, llm: Any):
        self.llm = llm

    def run(self, ctx: AgentContext, payload: dict[str, Any]) -> AgentResult:
        tutor_context = dict(payload.get("tutor_context") or {})
        signals = {**ctx.signals, **dict(tutor_context.get("signals") or {})}
        teaching_strategy = TeachingPolicy.select(
            error_type=tutor_context.get("error_type"),
            signals=signals,
            mode=tutor_context.get("mode"),
        )
        tutor_context["teaching_strategy"] = teaching_strategy
        if signals:
            tutor_context["signals"] = signals

        requested_prompt_profile = str(payload.get("prompt_profile") or "three_stage")
        prompt_profile = (
            self.STRATEGY_PROMPT_PROFILE[teaching_strategy]
            if requested_prompt_profile == "auto"
            else requested_prompt_profile
        )

        result = self.llm.complete_chat(
            resolved=payload["resolved"],
            model=payload.get("model"),
            messages=payload["messages"],
            prompt_profile=prompt_profile,
            system_prompt_override=payload.get("system_prompt_override"),
            tutor_context=tutor_context,
            agent_type=payload.get("agent_type") or f"agent:tutor:{teaching_strategy}:{payload['resolved'].provider_id}",
            user_id=ctx.user_id,
            session_id=ctx.session_id,
            analytics=payload.get("analytics"),
        )
        if "error" not in result:
            result["agent_type"] = "tutor"
            result["teaching_strategy"] = teaching_strategy
            result["used_tools"] = []
            result["web_search_used"] = False

        return AgentResult(
            content=result.get("message", {}).get("content"),
            state_updates={"teaching_strategy": teaching_strategy},
            used_tools=[],
            agent_type="tutor",
            raw=result,
        )

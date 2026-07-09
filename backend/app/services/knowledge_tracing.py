"""Bayesian Knowledge Tracing with forgetting decay."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime

from app.config import settings


@dataclass(frozen=True, slots=True)
class BKTParams:
    p_l0: float = settings.BKT_INITIAL_KNOWLEDGE
    p_t: float = settings.BKT_LEARN_RATE
    p_s: float = settings.BKT_SLIP_RATE
    p_g: float = settings.BKT_GUESS_RATE
    min_half_life_days: float = settings.BKT_MIN_HALF_LIFE_DAYS
    max_half_life_days: float = settings.BKT_MAX_HALF_LIFE_DAYS


class KnowledgeTracingService:
    def __init__(self, params: BKTParams | None = None):
        self.params = params or BKTParams()

    @staticmethod
    def _clamp_probability(value: float) -> float:
        return max(0.0, min(1.0, value))

    def update_p_known(self, prior: float | None, is_correct: bool) -> float:
        p_known = self._clamp_probability(self.params.p_l0 if prior is None else prior)
        if is_correct:
            likelihood_known = 1.0 - self.params.p_s
            likelihood_unknown = self.params.p_g
        else:
            likelihood_known = self.params.p_s
            likelihood_unknown = 1.0 - self.params.p_g

        denominator = likelihood_known * p_known + likelihood_unknown * (1.0 - p_known)
        posterior = p_known if denominator <= 0 else (likelihood_known * p_known) / denominator
        learned = posterior + (1.0 - posterior) * self.params.p_t
        return self._clamp_probability(learned)

    def half_life_days(self, p_known: float) -> float:
        span = self.params.max_half_life_days - self.params.min_half_life_days
        return self.params.min_half_life_days + span * self._clamp_probability(p_known)

    def apply_decay(
        self,
        p_known: float,
        *,
        last_practiced_at: str | None,
        now: datetime | None = None,
        half_life_days: float | None = None,
    ) -> float:
        if not last_practiced_at:
            return self._clamp_probability(p_known)

        try:
            last_practiced = datetime.fromisoformat(last_practiced_at)
        except ValueError:
            return self._clamp_probability(p_known)

        current_time = now or datetime.now(last_practiced.tzinfo)
        elapsed_days = max(0.0, (current_time - last_practiced).total_seconds() / 86400)
        half_life = max(0.01, half_life_days or self.half_life_days(p_known))
        return self._clamp_probability(p_known * math.exp(-elapsed_days / half_life))

    def update_mastery(
        self,
        *,
        prior_p_known: float | None,
        is_correct: bool,
        last_practiced_at: str | None,
        now: datetime | None = None,
    ) -> dict[str, float]:
        current_time = now or datetime.now()
        decayed_prior = self.apply_decay(
            self.params.p_l0 if prior_p_known is None else prior_p_known,
            last_practiced_at=last_practiced_at,
            now=current_time,
        )
        p_known = self.update_p_known(decayed_prior, is_correct)
        half_life = self.half_life_days(p_known)
        effective_mastery = self.apply_decay(
            p_known,
            last_practiced_at=current_time.isoformat(),
            now=current_time,
            half_life_days=half_life,
        )
        return {
            "p_known": p_known,
            "half_life_days": half_life,
            "effective_mastery": effective_mastery,
        }

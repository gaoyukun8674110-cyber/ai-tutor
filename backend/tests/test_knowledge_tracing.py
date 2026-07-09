import unittest
from datetime import datetime, timedelta

from app.services.knowledge_tracing import BKTParams, KnowledgeTracingService


class KnowledgeTracingTests(unittest.TestCase):
    def test_correct_answer_increases_known_probability(self):
        service = KnowledgeTracingService(BKTParams(p_l0=0.25, p_t=0.12, p_s=0.1, p_g=0.2))

        updated = service.update_p_known(0.25, is_correct=True)

        self.assertGreater(updated, 0.25)
        self.assertLessEqual(updated, 1.0)

    def test_incorrect_answer_decreases_known_probability_before_learning_transition(self):
        service = KnowledgeTracingService(BKTParams(p_l0=0.5, p_t=0.0, p_s=0.1, p_g=0.2))

        updated = service.update_p_known(0.8, is_correct=False)

        self.assertLess(updated, 0.8)
        self.assertGreaterEqual(updated, 0.0)

    def test_half_life_grows_with_mastery(self):
        service = KnowledgeTracingService(BKTParams(min_half_life_days=3, max_half_life_days=45))

        low = service.half_life_days(0.2)
        high = service.half_life_days(0.8)

        self.assertGreater(high, low)

    def test_decay_reduces_effective_mastery_over_time(self):
        service = KnowledgeTracingService(BKTParams(min_half_life_days=3, max_half_life_days=45))
        now = datetime(2026, 7, 8, 12, 0, 0)
        last_practiced = (now - timedelta(days=10)).isoformat()

        decayed = service.apply_decay(0.8, last_practiced_at=last_practiced, now=now, half_life_days=5)

        self.assertLess(decayed, 0.8)
        self.assertGreater(decayed, 0.0)

    def test_update_mastery_returns_bkt_and_effective_mastery(self):
        service = KnowledgeTracingService()

        result = service.update_mastery(
            prior_p_known=None,
            is_correct=True,
            last_practiced_at=None,
            now=datetime(2026, 7, 8, 12, 0, 0),
        )

        self.assertIn("p_known", result)
        self.assertIn("half_life_days", result)
        self.assertIn("effective_mastery", result)
        self.assertGreaterEqual(result["effective_mastery"], 0.0)
        self.assertLessEqual(result["effective_mastery"], 1.0)


if __name__ == "__main__":
    unittest.main()

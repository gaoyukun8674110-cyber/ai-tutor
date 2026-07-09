import unittest

from app.agents.tutor import LearnerStyle, TeachingPolicy


class TeachingPolicyTests(unittest.TestCase):
    def test_exam_mode_overrides_error_type_and_fatigue(self):
        self.assertEqual(
            TeachingPolicy.select(
                error_type="concept_error",
                signals={"fatigue": True, "consecutive_errors": 5},
                mode="exam",
            ),
            "exam",
        )

    def test_fatigue_and_consecutive_errors_override_error_type(self):
        self.assertEqual(
            TeachingPolicy.select("concept_error", {"fatigue": True}, None),
            "coach",
        )
        self.assertEqual(
            TeachingPolicy.select("method_error", {"consecutive_errors": 3}, None),
            "coach",
        )

    def test_error_types_map_to_expected_strategies(self):
        cases = {
            "concept_error": "explain",
            "method_error": "socratic",
            "calculation_error": "recompute",
            "reading_error": "reread",
        }
        for error_type, expected_strategy in cases.items():
            with self.subTest(error_type=error_type):
                self.assertEqual(TeachingPolicy.select(error_type, {}, None), expected_strategy)

    def test_profile_does_not_change_strategy_id(self):
        profile = LearnerStyle(pace="slow", verbosity="detailed", example_pref="concrete")

        self.assertEqual(
            TeachingPolicy.select("calculation_error", {}, None, profile=profile),
            "recompute",
        )

    def test_default_strategy_is_socratic(self):
        self.assertEqual(TeachingPolicy.select(None, {}, None), "socratic")


if __name__ == "__main__":
    unittest.main()

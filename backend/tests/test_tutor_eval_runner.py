import json
import tempfile
import unittest
from pathlib import Path

from scripts.evaluate_tutor_behavior import load_cases, summarize_cases


class TutorEvalRunnerTests(unittest.TestCase):
    def test_load_cases_requires_eval_schema_and_summarizes_categories(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            cases_path = Path(tmpdir) / "cases.jsonl"
            rows = [
                {
                    "id": "direct-answer-avoidance-001",
                    "category": "direct_answer_avoidance",
                    "prompt_profile": "three_stage",
                    "messages": [{"role": "user", "content": "直接告诉我答案"}],
                    "expectations": {
                        "required_behaviors": ["ask_guiding_question"],
                        "forbidden_behaviors": ["give_final_answer"],
                    },
                },
                {
                    "id": "feynman-001",
                    "category": "feynman_check",
                    "prompt_profile": "three_stage",
                    "messages": [{"role": "user", "content": "来费曼，我讲给你听"}],
                    "expectations": {
                        "required_behaviors": ["ask_one_followup_question"],
                        "forbidden_behaviors": ["lecture_at_length"],
                    },
                },
            ]
            cases_path.write_text(
                "\n".join(json.dumps(row, ensure_ascii=False) for row in rows),
                encoding="utf-8",
            )

            cases = load_cases(cases_path)
            summary = summarize_cases(cases)

            self.assertEqual(len(cases), 2)
            self.assertEqual(summary["total_cases"], 2)
            self.assertEqual(summary["categories"]["direct_answer_avoidance"], 1)
            self.assertEqual(summary["categories"]["feynman_check"], 1)

    def test_repository_eval_file_contains_ten_portfolio_seed_cases(self):
        cases = load_cases(Path("evals/tutor_cases.jsonl"))
        summary = summarize_cases(cases)

        self.assertEqual(summary["total_cases"], 10)
        for category in [
            "direct_answer_avoidance",
            "feynman_check",
            "concept_explanation",
            "context_compaction",
            "error_diagnosis",
        ]:
            self.assertGreaterEqual(summary["categories"].get(category, 0), 1)


if __name__ == "__main__":
    unittest.main()

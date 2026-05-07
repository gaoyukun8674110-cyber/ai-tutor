import unittest

from app.services.llm_service import LLMService


class MaterialContextPromptTests(unittest.TestCase):
    def test_system_prompt_formats_retrieved_material_context(self):
        service = LLMService()

        prompt = service._build_system_prompt(
            prompt_profile="three_stage",
            tutor_context={
                "learning_phase": "understanding",
                "material_context": {
                    "chunks": [
                        {
                            "filename": "probability-notes.txt",
                            "source_label": "probability-notes.txt · chunk 1",
                            "content": "Bayes theorem connects prior, likelihood, and posterior.",
                            "score": 0.82,
                        }
                    ]
                },
            },
        )

        self.assertIn("当前检索到的学习资料片段", prompt)
        self.assertIn("probability-notes.txt · chunk 1", prompt)
        self.assertIn("Bayes theorem connects prior", prompt)
        self.assertIn("如果资料片段没有覆盖学生问题", prompt)
        self.assertNotIn("{'chunks'", prompt)


if __name__ == "__main__":
    unittest.main()

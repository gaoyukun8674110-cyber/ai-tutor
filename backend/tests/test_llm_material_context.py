import unittest

from app.api.llm import _inject_material_context


class FakeMaterialService:
    def __init__(self):
        self.calls = []

    def search_materials(self, query, user_id=None, material_ids=None, top_k=None):
        self.calls.append(
            {
                "query": query,
                "user_id": user_id,
                "material_ids": material_ids,
                "top_k": top_k,
            }
        )
        return [
            {
                "material_id": 7,
                "source_label": "probability.txt · chunk 1",
                "content": "Bayes theorem uses posterior probability.",
                "score": 0.91,
            }
        ]


class LlmMaterialContextTests(unittest.TestCase):
    def test_inject_material_context_searches_selected_materials(self):
        service = FakeMaterialService()

        tutor_context, chunks = _inject_material_context(
            tutor_context={"learning_phase": "understanding", "material_ids": [7, "8", "bad", 0]},
            last_user_message="What is posterior probability?",
            material_service=service,
            user_id="learner-1",
            top_k=3,
        )

        self.assertEqual(service.calls[0]["query"], "What is posterior probability?")
        self.assertEqual(service.calls[0]["user_id"], "learner-1")
        self.assertEqual(service.calls[0]["material_ids"], [7, 8])
        self.assertEqual(service.calls[0]["top_k"], 3)
        self.assertEqual(tutor_context["material_context"]["chunks"], chunks)
        self.assertEqual(chunks[0]["source_label"], "probability.txt · chunk 1")

    def test_inject_material_context_skips_empty_user_message(self):
        service = FakeMaterialService()

        tutor_context, chunks = _inject_material_context(
            tutor_context={"material_ids": [7]},
            last_user_message=None,
            material_service=service,
            user_id=None,
            top_k=3,
        )

        self.assertEqual(service.calls, [])
        self.assertNotIn("material_context", tutor_context)
        self.assertEqual(chunks, [])


if __name__ == "__main__":
    unittest.main()

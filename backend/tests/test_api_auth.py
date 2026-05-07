import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.llm import router as llm_router


AUTH_HEADERS = {"X-API-Key": "local-dev-key"}


class ApiAuthTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(llm_router)
        self.client = TestClient(app)

    def test_api_requires_x_api_key_header(self):
        response = self.client.get("/api/llm/providers")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"]["code"], "unauthorized")
        self.assertEqual(response.json()["detail"]["user_message"], "Missing X-API-Key header")

    def test_api_rejects_invalid_x_api_key_header(self):
        response = self.client.get("/api/llm/providers", headers={"X-API-Key": "wrong"})

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"]["code"], "forbidden")

    def test_api_accepts_configured_x_api_key_header(self):
        response = self.client.get("/api/llm/providers", headers=AUTH_HEADERS)

        self.assertEqual(response.status_code, 200)
        self.assertIn("providers", response.json())


if __name__ == "__main__":
    unittest.main()

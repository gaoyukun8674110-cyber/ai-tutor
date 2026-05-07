import unittest

from fastapi.testclient import TestClient

from app.main import app


class SecurityHeaderTests(unittest.TestCase):
    def test_baseline_security_headers_are_set(self):
        response = TestClient(app).get("/health")

        self.assertEqual(response.headers["x-frame-options"], "DENY")
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(response.headers["referrer-policy"], "same-origin")
        self.assertIn("default-src 'self'", response.headers["content-security-policy"])

    def test_http_errors_use_public_schema(self):
        response = TestClient(app).get("/missing-route")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"]["code"], "not_found")
        self.assertIn("trace_id", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()

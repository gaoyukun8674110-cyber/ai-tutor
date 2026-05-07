import unittest

from fastapi.testclient import TestClient

from app.main import app


class CorsConfigTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_preflight_allows_configured_origin(self):
        response = self.client.options(
            '/health',
            headers={
                'Origin': 'http://localhost:4173',
                'Access-Control-Request-Method': 'GET',
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get('access-control-allow-origin'), 'http://localhost:4173')
        self.assertEqual(response.headers.get('access-control-allow-credentials'), 'true')

    def test_preflight_does_not_echo_unconfigured_origin(self):
        response = self.client.options(
            '/health',
            headers={
                'Origin': 'https://example.com',
                'Access-Control-Request-Method': 'GET',
            },
        )

        self.assertNotEqual(response.headers.get('access-control-allow-origin'), 'https://example.com')


if __name__ == '__main__':
    unittest.main()

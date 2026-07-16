from django.test import RequestFactory, SimpleTestCase

from lantaw.middleware import JWTBearerCSRFExemptMiddleware


class JwtCsrfMiddlewareTests(SimpleTestCase):
    def test_api_bearer_requests_are_exempt_from_csrf(self):
        request = RequestFactory().post(
            "/api/projects/",
            data={},
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer fake-token",
        )

        middleware = JWTBearerCSRFExemptMiddleware(lambda request: None)
        response = middleware.process_view(request, None, (), {})

        self.assertIsNone(response)
        self.assertTrue(getattr(request, "_dont_enforce_csrf_checks", False))

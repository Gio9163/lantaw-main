import logging

logger = logging.getLogger("lantaw.api")


class JWTBearerCSRFExemptMiddleware:
    """
    Allow JWT-authenticated API requests to bypass CSRF enforcement.
    This keeps CSRF protection for session-based browser forms while avoiding
    false 403s for frontend requests that use Authorization: Bearer <token>.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def _should_exempt(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        is_bearer_token = auth_header.startswith("Bearer ")
        is_api_request = request.path.startswith("/api/")
        return is_api_request and is_bearer_token

    def process_view(self, request, view_func, view_args, view_kwargs):
        if self._should_exempt(request):
            request._dont_enforce_csrf_checks = True
            logger.info(
                "JWT API request: method=%s path=%s user=%s",
                request.method,
                request.path,
                getattr(getattr(request, "user", None), "email", "anonymous"),
            )
        return None

    def __call__(self, request):
        self.process_view(request, None, (), {})
        response = self.get_response(request)

        if response.status_code == 403 and request.path.startswith("/api/"):
            logger.warning(
                "API 403: method=%s path=%s user=%s auth=%s headers=%s",
                request.method,
                request.path,
                getattr(getattr(request, "user", None), "email", "anonymous"),
                "Bearer" if self._should_exempt(request) else "none",
                {
                    key: value
                    for key, value in request.headers.items()
                    if key.lower() not in {"authorization", "cookie", "set-cookie"}
                },
            )

        return response

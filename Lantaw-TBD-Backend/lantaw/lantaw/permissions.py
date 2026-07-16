import logging
from rest_framework import permissions

logger = logging.getLogger("lantaw.api")


class AuthenticatedWithDebugPermission(permissions.BasePermission):
    """Permission wrapper that logs authentication and role-based failures."""

    def has_permission(self, request, view):
        if not request.user or not getattr(request.user, "is_authenticated", False):
            logger.warning(
                "Permission denied: unauthenticated request method=%s path=%s",
                request.method,
                request.path,
            )
            return False

        return True

    def has_object_permission(self, request, view, obj):
        if not request.user or not getattr(request.user, "is_authenticated", False):
            logger.warning(
                "Object permission denied: unauthenticated request method=%s path=%s",
                request.method,
                request.path,
            )
            return False

        return True

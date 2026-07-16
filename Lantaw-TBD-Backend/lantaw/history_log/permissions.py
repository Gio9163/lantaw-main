from rest_framework import permissions


class IsAdminOnly(permissions.BasePermission):
    """Allow only admin users."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "ADMIN"

    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and request.user.role == "ADMIN"


class IsAdminExecutiveOrProjectStaff(permissions.BasePermission):
    """
    All authenticated users (Admin, Executive, Project Staff) can view history log.
    Only Admin can revert.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.role == "ADMIN":
            return True
        
        # All authenticated users can view
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only Admin can revert/archive/restore/permanent_delete
        if view.action in {'revert', 'archive', 'restore', 'permanent_delete'}:
            return request.user.role == "ADMIN"
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        if request.user.role == "ADMIN":
            return True
        
        # All authenticated users can view
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only Admin can revert/archive/restore/permanent_delete
        if view.action in {'revert', 'archive', 'restore', 'permanent_delete'}:
            return request.user.role == "ADMIN"
        
        return False


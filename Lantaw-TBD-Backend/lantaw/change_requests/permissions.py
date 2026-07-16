from rest_framework import permissions
from projects.models import ProjectMembers


class IsAdminOnly(permissions.BasePermission):
    """
    Only ADMIN users can approve/reject change requests.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "ADMIN"
    
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and request.user.role == "ADMIN"


class IsProjectStaffOrAdmin(permissions.BasePermission):
    """
    Project Staff can create change requests, Admin can view all.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Admin can do everything
        if request.user.role == "ADMIN":
            return True
        
        # Project Staff can create change requests
        if request.user.role == "PROJECT_STAFF":
            return request.method in ['POST', 'GET', 'HEAD', 'OPTIONS']
        
        return False
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin can view all
        if user.role == "ADMIN":
            return True
        
        # Project Staff can only view their own submitted requests
        if user.role == "PROJECT_STAFF":
            return obj.submitted_by == user
        
        return False


class CanSubmitChangeRequest(permissions.BasePermission):
    """
    Validates that Project Staff is assigned to the project before allowing submission.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.role == "ADMIN":
            return request.method in permissions.SAFE_METHODS
        
        # For Project Staff, check if they're assigned to the project
        if request.user.role == "PROJECT_STAFF":
            # Allow GET requests (viewing)
            if request.method in ['GET', 'HEAD', 'OPTIONS']:
                return True
            
            # For POST (create), check project assignment
            if request.method == 'POST':
                # Try to get project_id from various sources
                project_id = (
                    view.kwargs.get('project_pk') or  # Nested router
                    request.data.get('project') or     # Request body
                    None
                )
                
                if project_id:
                    # Convert to int if it's a string
                    try:
                        project_id = int(project_id)
                    except (ValueError, TypeError):
                        return False
                    
                    return ProjectMembers.objects.filter(
                        project_id=project_id,
                        user=request.user
                    ).exists()
                else:
                    # Project CREATE proposals do not have an existing project yet.
                    return request.data.get('change_type') == 'PROJECT' and request.data.get('operation') == 'CREATE'
        
        return False

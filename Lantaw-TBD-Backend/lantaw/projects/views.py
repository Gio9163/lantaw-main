from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Project, ProjectMembers
from .serializers import ProjectSerializer, ProjectMembersSerializer
from history_log.services import log_history
from change_requests.approval_mixin import ApprovalRequiredWriteMixin

class IsAdminExecutiveOrProjectStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        user = request.user

        if user.role == "ADMIN":
            return request.method in permissions.SAFE_METHODS
        if user.role == "EXECUTIVE":
            return request.method in permissions.SAFE_METHODS
        if user.role == "PROJECT_STAFF":
            return True

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.role == "ADMIN":
            return request.method in permissions.SAFE_METHODS
        if user.role == "EXECUTIVE":
            return request.method in permissions.SAFE_METHODS
        if user.role == "PROJECT_STAFF":
            return obj.projectmembers_set.filter(user=user).exists()
        return False

class IsAdminOnly(permissions.BasePermission):
    """
    Only ADMIN users can access ProjectMembers.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "ADMIN"

    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and request.user.role == "ADMIN"

class ProjectViewSet(ApprovalRequiredWriteMixin, viewsets.ModelViewSet):
    change_request_type = 'PROJECT'
    queryset = Project.objects.all().order_by('id')
    serializer_class = ProjectSerializer
    permission_classes = [IsAdminExecutiveOrProjectStaff]

    def get_queryset(self):
        user = self.request.user
        project_pk = self.kwargs.get("project_pk")

        if user.role == "ADMIN":
            return Project.objects.all().order_by('id')
        elif user.role == "EXECUTIVE":
            return Project.objects.all().order_by('id')
        elif user.role == "PROJECT_STAFF":
            # Staff only sees projects they belong to
            qs = Project.objects.filter(projectmembers__user=user).order_by('id')
            if project_pk:
                return qs.filter(id=project_pk)
            return qs
        return Project.objects.none()
    
    def perform_create(self, serializer):
        project = serializer.save()

        user = self.request.user
        if user.role in ["ADMIN", "PROJECT_STAFF"]:
            ProjectMembers.objects.get_or_create(
                user=user,
                project=project
            )

        log_history(
            user=user,
            action='CREATE',
            module='PROJECT',
            project=project,
            object_name=project.name,
            description=f"{user.get_full_name() or user.email} created project \"{project.name}\"",
            change_type='PROJECT',
            entity_id=project.id,
            old_state=None,
            new_state={'name': project.name, 'project_leader': project.project_leader, 'description': project.description},
        )

    def perform_update(self, serializer):
        project = self.get_object()
        old_state = {
            'name': project.name,
            'project_leader': project.project_leader,
            'description': project.description,
            'grant_amount': str(project.grant_amount) if project.grant_amount is not None else None,
            'project_status': project.project_status,
            'date_start': project.date_start.isoformat() if project.date_start else None,
            'date_end': project.date_end.isoformat() if project.date_end else None,
        }
        updated_project = serializer.save()
        user = self.request.user
        log_history(
            user=user,
            action='UPDATE',
            module='PROJECT',
            project=updated_project,
            object_name=updated_project.name,
            description=f"{user.get_full_name() or user.email} updated project \"{updated_project.name}\"",
            change_type='PROJECT',
            entity_id=updated_project.id,
            old_state=old_state,
            new_state={'name': updated_project.name, 'project_leader': updated_project.project_leader, 'description': updated_project.description, 'grant_amount': str(updated_project.grant_amount) if updated_project.grant_amount is not None else None, 'project_status': updated_project.project_status, 'date_start': updated_project.date_start.isoformat() if updated_project.date_start else None, 'date_end': updated_project.date_end.isoformat() if updated_project.date_end else None},
        )

    def perform_destroy(self, instance):
        user = self.request.user
        log_history(
            user=user,
            action='DELETE',
            module='PROJECT',
            project=instance,
            object_name=instance.name,
            description=f"{user.get_full_name() or user.email} deleted project \"{instance.name}\"",
            change_type='PROJECT',
            entity_id=instance.id,
            old_state={'name': instance.name, 'project_leader': instance.project_leader, 'description': instance.description},
            new_state=None,
        )
        instance.delete()

class ProjectMembersViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProjectMembers.objects.all().order_by('id')
    serializer_class = ProjectMembersSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        """
        Only ADMINs can see members, optionally filtered by project.
        """
        project_pk = self.kwargs.get("project_pk")
        qs = self.queryset
        if project_pk:
            qs = qs.filter(project_id=project_pk)
        return qs


@api_view(["GET"])
@permission_classes([AllowAny])
def public_projects_list(request):
    """
    Public, read-only list of projects (names only).
    No authentication required.
    """
    projects = Project.objects.all().order_by("id")
    data = [{"id": project.id, "name": project.name, "project_leader": project.project_leader} for project in projects]
    return Response(data)

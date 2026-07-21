from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied
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
            return (
                request.method in permissions.SAFE_METHODS
                and obj.projectmembers_set.filter(user=user).exists()
            )
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
        projects = Project.objects.prefetch_related('budget_items').order_by('id')

        if user.role == "ADMIN":
            return projects
        elif user.role == "EXECUTIVE":
            return projects.filter(projectmembers__user=user)
        elif user.role == "PROJECT_STAFF":
            # Staff only sees projects they belong to
            qs = projects.filter(projectmembers__user=user)
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
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Admins can see members. Assigned Staff and Executives can see members
        of their current project.
        """
        project_pk = self.kwargs.get("project_pk")
        qs = self.queryset.select_related('user', 'project')
        if project_pk:
            qs = qs.filter(project_id=project_pk)
        user = self.request.user
        if user.role == 'ADMIN':
            return qs
        if project_pk and user.role in ['PROJECT_STAFF', 'EXECUTIVE']:
            if ProjectMembers.objects.filter(project_id=project_pk, user=user).exists():
                return qs
            raise PermissionDenied('You are not assigned to this project.')
        return ProjectMembers.objects.none()


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

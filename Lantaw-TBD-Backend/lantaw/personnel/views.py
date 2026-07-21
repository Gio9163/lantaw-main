from rest_framework import viewsets, permissions, status 
from rest_framework.response import Response
from .models import Personnel, Role, Department
from .serializers import PersonnelSerializer, RoleSerializer, DepartmentSerializer
from rest_framework.exceptions import PermissionDenied, ValidationError
from projects.models import Project, ProjectMembers, ProjectPersonnel
from django.shortcuts import get_object_or_404
from django.db import transaction
from history_log.services import log_history
from change_requests.approval_mixin import ApprovalRequiredWriteMixin

# Class Permission based on User Role generalized
class IsAdminExecutiveOrProjectStaff(permissions.BasePermission):
    """
    Admin: Read-only access
    Executive: Read-only
    Project Staff: Can create/update/delete personnel, roles, and departments in their projects
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        user = request.user

        if user.role in ["ADMIN", "EXECUTIVE"]:
            return request.method in permissions.SAFE_METHODS
        if user.role == "PROJECT_STAFF":
            return True
        return False

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.role in ["ADMIN", "EXECUTIVE"]:
            return request.method in permissions.SAFE_METHODS
        if user.role == "PROJECT_STAFF":
            project_id = view.kwargs.get("project_pk")
            if project_id:
                return ProjectMembers.objects.filter(
                    project_id=project_id,
                    user=user
                ).exists()
            if hasattr(obj, 'project') and obj.project:
                return ProjectMembers.objects.filter(
                    project=obj.project,
                    user=user
                ).exists()
            if isinstance(obj, Personnel):
                return ProjectPersonnel.objects.filter(
                    personnel=obj,
                    project__projectmembers__user=user
                ).exists()
        return False

class ProjectPermissionMixin:
    def perform_create(self, serializer):
        """
        Assign the object's project based on the project_id in the URL upon creation.
        Also checks if the user has permission to create in that project.
        """

        project_id = self.kwargs.get("project_pk")
        user = self.request.user

        # If user is not part of the project and not admin/executive, deny
        if not ProjectMembers.objects.filter(project_id=project_id, user=user).exists() \
           and user.role not in ["ADMIN", "EXECUTIVE"]:
            raise PermissionDenied("You are not allowed to create for this project.")

        project = get_object_or_404(Project, pk=project_id)
        serializer.save(project=project)

    def get_project_queryset(self, model):
        """
        Returns queryset filtered by project and user permissions.
        """

        project_id = self.kwargs.get("project_pk")
        user = self.request.user

        # Base queryset items that belong to this project
        qs = model.objects.filter(project_id=project_id).distinct()

        # Admins and Executives can view all items
        if user.role in ["ADMIN", "EXECUTIVE"]:
            return qs.order_by('id')

        # Project Staff can only view if member of this project
        elif user.role == "PROJECT_STAFF":
            is_member = ProjectMembers.objects.filter(
                project_id=project_id, user=user
            ).exists()
            return qs.order_by('id') if is_member else model.objects.none()

        # Otherwise, no access
        return model.objects.none()

class RoleViewSet(ApprovalRequiredWriteMixin, ProjectPermissionMixin, viewsets.ModelViewSet): 
    change_request_type = 'ROLE'
    serializer_class = RoleSerializer
    permission_classes = [IsAdminExecutiveOrProjectStaff]

    def get_queryset(self):
        return self.get_project_queryset(Role)
    
class DepartmentViewSet(ApprovalRequiredWriteMixin, ProjectPermissionMixin, viewsets.ModelViewSet):
    change_request_type = 'DEPARTMENT'
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminExecutiveOrProjectStaff]

    def get_queryset(self):
        return self.get_project_queryset(Department)

class PersonnelViewSet(ApprovalRequiredWriteMixin, viewsets.ModelViewSet):
    change_request_type = 'PERSONNEL'
    serializer_class = PersonnelSerializer
    permission_classes = [IsAdminExecutiveOrProjectStaff]

    def get_queryset(self):
        project_id = self.kwargs.get("project_pk")
        user = self.request.user

        # Base queryset items that belong to this project
        qs = Personnel.objects.filter(
            projectpersonnel__project_id=project_id
        ).select_related('role', 'department')

        if user.role in ["ADMIN", "EXECUTIVE"]:
            return qs.order_by('id')
        # Project Staff can only see personnel in their projects
        elif user.role == "PROJECT_STAFF":
            return qs.filter(
                projectpersonnel__project__projectmembers__user=user
            ).order_by('id')
        return Personnel.objects.none()

    def create(self, request, *args, **kwargs):
        """Override create to properly handle response after ProjectPersonnel creation."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Refresh the personnel object from database with select_related to prefetch relationships
        # This ensures role and department are properly loaded for serialization
        personnel = Personnel.objects.select_related('role', 'department').get(pk=serializer.instance.pk)
        
        # Create a new serializer instance with the refreshed object
        response_serializer = self.get_serializer(personnel)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Create Personnel record and ProjectPersonnel relationship.
        Also validates that role and department belong to the current project.
        Checks if user has permission to create in this project.
        """
        project_id = self.kwargs.get("project_pk")
        if not project_id:
            raise ValidationError({'project': 'Project ID is required.'})
        
        # Convert to int if it's a string
        try:
            project_id = int(project_id)
        except (ValueError, TypeError):
            raise ValidationError({'project': 'Invalid project ID.'})
        
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            raise ValidationError({'project': 'Project not found.'})
        
        # Check if user has permission to create in this project
        user = self.request.user
        if user.role == "PROJECT_STAFF":
            if not ProjectMembers.objects.filter(project_id=project_id, user=user).exists():
                raise PermissionDenied("You are not allowed to create personnel for this project.")
        
        # Validate role and department belong to this project
        # Extract IDs - handle both integer IDs and object instances
        role_value = serializer.validated_data.get('role')
        department_value = serializer.validated_data.get('department')
        
        # Convert to ID if it's an object instance (DRF might resolve FK to object)
        if role_value is not None:
            role_id = role_value.pk if hasattr(role_value, 'pk') else role_value
            if not isinstance(role_id, int):
                # If still not an int, try to convert
                try:
                    role_id = int(role_id)
                except (ValueError, TypeError):
                    raise ValidationError({'role': 'Invalid role ID.'})
            try:
                role = Role.objects.get(pk=role_id, project_id=project_id)
            except Role.DoesNotExist:
                raise ValidationError({'role': 'Role not found or does not belong to this project.'})
        
        if department_value is not None:
            department_id = department_value.pk if hasattr(department_value, 'pk') else department_value
            if not isinstance(department_id, int):
                # If still not an int, try to convert
                try:
                    department_id = int(department_id)
                except (ValueError, TypeError):
                    raise ValidationError({'department': 'Invalid department ID.'})
            try:
                department = Department.objects.get(pk=department_id, project_id=project_id)
            except Department.DoesNotExist:
                raise ValidationError({'department': 'Department not found or does not belong to this project.'})
        
        # Create the personnel record
        personnel = serializer.save()
        
        # Create the ProjectPersonnel relationship
        ProjectPersonnel.objects.get_or_create(
            personnel=personnel,
            project=project
        )

        log_history(
            user=self.request.user,
            action='ASSIGN',
            module='PERSONNEL',
            project=project,
            object_name=f"{personnel.first_name} {personnel.last_name}",
            description=f"{self.request.user.get_full_name() or self.request.user.email} assigned {personnel.first_name} {personnel.last_name} to project \"{project.name}\"",
            change_type='PERSONNEL',
            entity_id=personnel.id,
        )

    def perform_update(self, serializer):
        personnel = self.get_object()
        old_state = {
            'first_name': personnel.first_name,
            'last_name': personnel.last_name,
            'role': personnel.role_id,
            'department': personnel.department_id,
            'employment_status': personnel.employment_status,
        }
        updated_personnel = serializer.save()
        project_id = self.kwargs.get('project_pk')
        project_obj = Project.objects.filter(id=project_id).first() if project_id else None
        log_history(
            user=self.request.user,
            action='UPDATE',
            module='PERSONNEL',
            project=project_obj,
            object_name=f"{updated_personnel.first_name} {updated_personnel.last_name}",
            description=f"{self.request.user.get_full_name() or self.request.user.email} updated personnel assignment for {updated_personnel.first_name} {updated_personnel.last_name}",
            change_type='PERSONNEL',
            entity_id=updated_personnel.id,
            old_state=old_state,
            new_state={'first_name': updated_personnel.first_name, 'last_name': updated_personnel.last_name, 'role': updated_personnel.role_id, 'department': updated_personnel.department_id, 'employment_status': updated_personnel.employment_status},
        )

    def perform_destroy(self, instance):
        user = self.request.user
        project_id = self.kwargs.get('project_pk')
        project_obj = Project.objects.filter(id=project_id).first() if project_id else None
        log_history(
            user=user,
            action='REMOVE',
            module='PERSONNEL',
            project=project_obj,
            object_name=f"{instance.first_name} {instance.last_name}",
            description=f"{user.get_full_name() or user.email} removed {instance.first_name} {instance.last_name} from the project",
            change_type='PERSONNEL',
            entity_id=instance.id,
            old_state={'first_name': instance.first_name, 'last_name': instance.last_name, 'role': instance.role_id, 'department': instance.department_id, 'employment_status': instance.employment_status},
            new_state=None,
        )
        instance.delete()

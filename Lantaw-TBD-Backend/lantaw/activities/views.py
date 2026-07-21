from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from django.db.models import Prefetch
from .models import Objective, Activity
from .serializers import ObjectiveReadSerializer, ObjectiveWriteSerializer, ActivitySerializer
from projects.models import Project
from history_log.services import log_history
from change_requests.approval_mixin import ApprovalRequiredWriteMixin

class IsAdminExecutiveOrProjectStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated

        if not request.user.is_authenticated:
            return False

        user = request.user

        if user.role == "ADMIN":
            return False
        if user.role == "EXECUTIVE":
            return False
        if user.role == "PROJECT_STAFF":
            return True

        return False

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated

        if not request.user.is_authenticated:
            return False

        user = request.user

        if user.role == "ADMIN":
            return False
        if user.role == "EXECUTIVE":
            return False
        if user.role == "PROJECT_STAFF":
            if isinstance(obj, Objective):
                return obj.project.projectmembers_set.filter(user=user).exists()
            if isinstance(obj, Activity):
                return obj.objective.project.projectmembers_set.filter(user=user).exists()
        return False

class ObjectiveViewSet(ApprovalRequiredWriteMixin, viewsets.ModelViewSet):
    change_request_type = 'OBJECTIVE'
    queryset = Objective.objects.all().order_by('id')
    permission_classes = [IsAdminExecutiveOrProjectStaff]

    def get_serializer_class(self):
        """
        Use separate serializers for read vs write operations.
        """
        if self.action in ["create", "update", "partial_update"]:
            return ObjectiveWriteSerializer
        return ObjectiveReadSerializer
    
    def get_queryset(self):
        user = self.request.user
        project_pk = self.kwargs.get("project_pk")

        # Get the objectives related to the project 
        activity_queryset = Activity.objects.select_related(
            "activity_budget_item"
        ).order_by("id")
        qs = (
            Objective.objects.filter(project_id=project_pk)
            .select_related("project")
            .prefetch_related(
                Prefetch("activity_set", queryset=activity_queryset)
            )
        )

        if user.role == "ADMIN":
            return qs
        elif user.role in {"EXECUTIVE", "PROJECT_STAFF"}:
            return qs.filter(project__projectmembers__user=user).distinct()
        return Objective.objects.none()
    
    def perform_create(self, serializer):
        user = self.request.user
        project_id = self.kwargs.get("project_pk")
        project = Project.objects.get(pk=project_id)

        if project:
            if user.role == "PROJECT_STAFF" and not project.projectmembers_set.filter(user=user).exists():
                raise PermissionDenied()

        objective = serializer.save(project_id=project_id)
        log_history(
            user=user,
            action='CREATE',
            module='OBJECTIVE',
            project=objective.project,
            object_name=objective.title,
            description=f"{user.get_full_name() or user.email} created objective \"{objective.title}\"",
            change_type='OBJECTIVE',
            entity_id=objective.id,
            old_state=None,
            new_state={'title': objective.title, 'description': objective.description},
        )
    
    def perform_update(self, serializer):
        """Handle objective update with history tracking."""
        objective = self.get_object()
        user = self.request.user
        
        # Get old state before update
        old_state = {
            'title': objective.title,
            'description': objective.description,
            'project': objective.project_id,
        }
        
        # Save the objective
        updated_objective = serializer.save()
        log_history(
            user=user,
            action='UPDATE',
            module='OBJECTIVE',
            project=updated_objective.project,
            object_name=updated_objective.title,
            description=f"{user.get_full_name() or user.email} updated objective \"{updated_objective.title}\"",
            change_type='OBJECTIVE',
            entity_id=updated_objective.id,
            old_state=old_state,
            new_state={'title': updated_objective.title, 'description': updated_objective.description, 'project': updated_objective.project_id},
        )
    
    def perform_destroy(self, instance):
        """Handle objective deletion with history tracking."""
        user = self.request.user
        
        if hasattr(instance, 'project') and instance.project:
            log_history(
                user=user,
                action='DELETE',
                module='OBJECTIVE',
                project=instance.project,
                object_name=instance.title,
                description=f"{user.get_full_name() or user.email} deleted objective \"{instance.title}\"",
                change_type='OBJECTIVE',
                entity_id=instance.id,
                old_state={'title': instance.title, 'description': instance.description, 'project': instance.project_id},
                new_state=None,
            )

        instance.delete()


class ActivityViewSet(ApprovalRequiredWriteMixin, viewsets.ModelViewSet):
    change_request_type = 'ACTIVITY'
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [IsAdminExecutiveOrProjectStaff]

    def get_queryset(self):
        user = self.request.user
        objective_pk = self.kwargs.get("objective_pk")
        project_pk = self.kwargs.get("project_pk")

        # Get the activities related to the objective
        qs = Activity.objects.filter(objective_id=objective_pk).select_related(
            "activity_budget_item", "objective__project"
        )
        if project_pk is not None:
            qs = qs.filter(objective__project_id=project_pk)

        if user.role == "ADMIN":
            return qs
        elif user.role in {"EXECUTIVE", "PROJECT_STAFF"}:
            return qs.filter(objective__project__projectmembers__user=user).distinct()
        return Activity.objects.none()

    def perform_create(self, serializer):
        objective_id = self.kwargs.get("objective_pk")
        objective = Objective.objects.get(pk=objective_id)  # fetch instance
        activity = serializer.save(objective=objective)
        log_history(
            user=self.request.user,
            action='CREATE',
            module='ACTIVITY',
            project=activity.objective.project,
            object_name=activity.title,
            description=f"{self.request.user.get_full_name() or self.request.user.email} created activity \"{activity.title}\"",
            change_type='ACTIVITY',
            entity_id=activity.id,
            old_state=None,
            new_state={'title': activity.title, 'activity_status': activity.activity_status, 'objective': activity.objective_id},
        )
    
    def perform_update(self, serializer):
        """Handle update with description tracking."""
        activity = self.get_object()
        user = self.request.user
        
        # Get old state before update
        old_state = {
            'title': activity.title,
            'activity_status': activity.activity_status,
            'projected_expense': str(activity.projected_expense) if activity.projected_expense else None,
            'actual_expense': str(activity.actual_expense) if activity.actual_expense else None,
            'activity_budget_item': activity.activity_budget_item_id,
            'objective': activity.objective_id,
        }
        
        # Get description from request data (for expense updates)
        description = self.request.data.get('description', None)
        
        # Save the activity
        updated_activity = serializer.save()
        new_state = {
            'title': updated_activity.title,
            'activity_status': updated_activity.activity_status,
            'projected_expense': str(updated_activity.projected_expense) if updated_activity.projected_expense else None,
            'actual_expense': str(updated_activity.actual_expense) if updated_activity.actual_expense else None,
            'activity_budget_item': updated_activity.activity_budget_item_id,
            'objective': updated_activity.objective_id,
        }

        if old_state.get('activity_status') != new_state.get('activity_status'):
            if new_state.get('activity_status') == 'COMPLETED':
                history_description = description or f"completed activity \"{updated_activity.title}\""
            else:
                history_description = description or f"marked activity as incomplete \"{updated_activity.title}\""
        elif old_state.get('actual_expense') != new_state.get('actual_expense'):
            history_description = description or f"updated expense for activity: {updated_activity.title}"
        else:
            history_description = description or f"updated activity: {updated_activity.title}"

        log_history(
            user=user,
            action='UPDATE',
            module='ACTIVITY',
            project=updated_activity.objective.project,
            object_name=updated_activity.title,
            description=f"{user.get_full_name() or user.email} {history_description}",
            change_type='ACTIVITY',
            entity_id=updated_activity.id,
            old_state=old_state,
            new_state=new_state,
        )
    
    def perform_destroy(self, instance):
        """Handle activity deletion with history tracking."""
        user = self.request.user

        if hasattr(instance, 'objective') and instance.objective:
            log_history(
                user=user,
                action='DELETE',
                module='ACTIVITY',
                project=instance.objective.project,
                object_name=instance.title,
                description=f"{user.get_full_name() or user.email} deleted activity \"{instance.title}\"",
                change_type='ACTIVITY',
                entity_id=instance.id,
                old_state={'title': instance.title, 'activity_status': instance.activity_status, 'objective': instance.objective_id},
                new_state=None,
            )

        instance.delete()

from rest_framework import viewsets, permissions
from .models import BudgetLineItem, Compensation
from .serializers import BudgetLineItemSerializer, CompensationSerializer
from rest_framework.exceptions import PermissionDenied
from history_log.services import log_history
from change_requests.approval_mixin import ApprovalRequiredWriteMixin


class IsAdminExecutiveOrProjectStaff(permissions.BasePermission):
    """
    Admin: Read-only access
    Executive: Read-only
    Project Staff: Only budget items in their projects
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        user = request.user

        if user.role in ["ADMIN", "EXECUTIVE"]:
            return request.method in permissions.SAFE_METHODS
        if user.role == "PROJECT_STAFF":
            return request.method in permissions.SAFE_METHODS
        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        project_id = view.kwargs.get('project_pk')

        if user.role in ["ADMIN", "EXECUTIVE"]:
            return request.method in permissions.SAFE_METHODS
        if user.role == "PROJECT_STAFF":
            if isinstance(obj, BudgetLineItem):
                return BudgetLineItem.objects.filter(project_id=project_id, project__projectmembers__user=user.id).exists()
            if isinstance(obj, Compensation):
                return Compensation.objects.filter(budget_item__project_id=project_id, budget_item__project__projectmembers__user=user.id).exists()
        return False
    
class BudgetLineItemViewSet(ApprovalRequiredWriteMixin, viewsets.ModelViewSet):
    change_request_type = 'BUDGET'
    serializer_class = BudgetLineItemSerializer
    permission_classes = [IsAdminExecutiveOrProjectStaff]

    def perform_create(self, serializer):
        user = self.request.user
        project_id = self.kwargs.get("project_pk")

        if not BudgetLineItem.objects.filter(project_id=project_id, project__projectmembers__user=user.id).exists() \
              and user.role not in ["ADMIN", "EXECUTIVE"]:
                raise PermissionDenied("You are not allowed to create for this project.")
        
        budget_item = serializer.save(project_id=project_id)
        log_history(
            user=user,
            action='CREATE',
            module='BUDGET',
            project=budget_item.project,
            object_name=budget_item.name,
            description=f"{user.get_full_name() or user.email} created budget item \"{budget_item.name}\"",
            change_type='BUDGET',
            entity_id=budget_item.id,
        )

    def perform_update(self, serializer):
        budget_item = self.get_object()
        old_state = {'name': budget_item.name, 'amount': str(budget_item.amount) if budget_item.amount is not None else None}
        updated_item = serializer.save()
        log_history(
            user=self.request.user,
            action='UPDATE',
            module='BUDGET',
            project=updated_item.project,
            object_name=updated_item.name,
            description=f"{self.request.user.get_full_name() or self.request.user.email} updated budget item \"{updated_item.name}\"",
            change_type='BUDGET',
            entity_id=updated_item.id,
            old_state=old_state,
            new_state={'name': updated_item.name, 'amount': str(updated_item.amount) if updated_item.amount is not None else None},
        )

    def perform_destroy(self, instance):
        log_history(
            user=self.request.user,
            action='DELETE',
            module='BUDGET',
            project=instance.project,
            object_name=instance.name,
            description=f"{self.request.user.get_full_name() or self.request.user.email} deleted budget item \"{instance.name}\"",
            change_type='BUDGET',
            entity_id=instance.id,
            old_state={'name': instance.name, 'amount': str(instance.amount) if instance.amount is not None else None},
            new_state=None,
        )
        instance.delete()

    def get_queryset(self):
        user = self.request.user
        project_pk = self.kwargs.get("project_pk")

        # Get the budget line items related to the project 
        qs = BudgetLineItem.objects.filter(project_id=project_pk).select_related('project')

        if user.role in ["ADMIN", "EXECUTIVE"]:
            return qs.order_by('id')
        # Return only when the user is confirmed to be part of the project
        elif user.role == "PROJECT_STAFF":
            return qs.filter(project__projectmembers__user=user.id).order_by('id')
        return BudgetLineItem.objects.none()

class CompensationViewSet(ApprovalRequiredWriteMixin, viewsets.ModelViewSet):
    change_request_type = 'COMPENSATION'
    serializer_class = CompensationSerializer
    permission_classes = [IsAdminExecutiveOrProjectStaff]

    def get_serializer_context(self):
        """Add project_pk to serializer context."""
        context = super().get_serializer_context()
        context['project_pk'] = self.kwargs.get('project_pk')
        return context

    def perform_create(self, serializer):
        user = self.request.user
        project_id = self.kwargs.get("project_pk")

        if not Compensation.objects.filter(budget_item__project_id=project_id, budget_item__project__projectmembers__user=user.id).exists() \
              and user.role not in ["ADMIN", "EXECUTIVE"]:
                raise PermissionDenied("You are not allowed to create for this project.")
        
        compensation = serializer.save()
        log_history(
            user=user,
            action='CREATE',
            module='COMPENSATION',
            project=compensation.budget_item.project,
            object_name=f"{compensation.personnel.first_name} {compensation.personnel.last_name}",
            description=f"{user.get_full_name() or user.email} created compensation for \"{compensation.personnel.first_name} {compensation.personnel.last_name}\"",
            change_type='COMPENSATION',
            entity_id=compensation.id,
        )

    def perform_update(self, serializer):
        compensation = self.get_object()
        old_state = {'type': compensation.type, 'amount': str(compensation.amount) if compensation.amount is not None else None}
        updated_compensation = serializer.save()
        log_history(
            user=self.request.user,
            action='UPDATE',
            module='COMPENSATION',
            project=updated_compensation.budget_item.project,
            object_name=f"{updated_compensation.personnel.first_name} {updated_compensation.personnel.last_name}",
            description=f"{self.request.user.get_full_name() or self.request.user.email} updated compensation for \"{updated_compensation.personnel.first_name} {updated_compensation.personnel.last_name}\"",
            change_type='COMPENSATION',
            entity_id=updated_compensation.id,
            old_state=old_state,
            new_state={'type': updated_compensation.type, 'amount': str(updated_compensation.amount) if updated_compensation.amount is not None else None},
        )

    def perform_destroy(self, instance):
        log_history(
            user=self.request.user,
            action='DELETE',
            module='COMPENSATION',
            project=instance.budget_item.project,
            object_name=f"{instance.personnel.first_name} {instance.personnel.last_name}",
            description=f"{self.request.user.get_full_name() or self.request.user.email} deleted compensation for \"{instance.personnel.first_name} {instance.personnel.last_name}\"",
            change_type='COMPENSATION',
            entity_id=instance.id,
            old_state={'type': instance.type, 'amount': str(instance.amount) if instance.amount is not None else None},
            new_state=None,
        )
        instance.delete()

    def get_queryset(self):
        user = self.request.user
        project_pk = self.kwargs.get("project_pk")

        # Get the compensations related to the project's budget line items
        qs = Compensation.objects.filter(
            budget_item__project_id=project_pk
        ).select_related(
            'budget_item__project', 'personnel__role', 'personnel__department'
        )

        if user.role in ["ADMIN", "EXECUTIVE"]:
            return qs.order_by('id')
        # Return only when the user is confirmed to be part of the project
        elif user.role == "PROJECT_STAFF":
            return qs.filter(budget_item__project__projectmembers__user=user.id).order_by('id')
        return Compensation.objects.none()

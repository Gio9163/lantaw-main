"""Route protected Project Staff writes through the existing ChangeRequest workflow."""
import json

from django.core.serializers.json import DjangoJSONEncoder
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from projects.models import Project, ProjectMembers
from .models import ChangeRequest, ChangeRequestVersion
from .serializers import ChangeRequestSerializer


def _json_value(value):
    return json.loads(json.dumps(value, cls=DjangoJSONEncoder))


class ApprovalRequiredWriteMixin:
    """Return a 202 ChangeRequest for staff writes; never mutate the target entity."""

    change_request_type = None

    def _project(self, instance=None):
        project_id = self.kwargs.get('project_pk')
        if project_id:
            return get_object_or_404(Project, pk=project_id)
        if instance is not None:
            if isinstance(instance, Project):
                return instance
            if hasattr(instance, 'project'):
                return instance.project
            if hasattr(instance, 'objective'):
                return instance.objective.project
            if hasattr(instance, 'budget_item'):
                return instance.budget_item.project
        return None

    def _ensure_staff_scope(self, project):
        user = self.request.user
        if user.role != 'PROJECT_STAFF':
            raise PermissionDenied('Operational changes may only be proposed by Project Staff.')
        if project and not ProjectMembers.objects.filter(project=project, user=user).exists():
            raise PermissionDenied('You are not assigned to this project.')

    def _state(self, instance):
        return _json_value(self.get_serializer(instance).data)

    def _submit(self, operation, proposed_changes, instance=None):
        project = self._project(instance)
        self._ensure_staff_scope(project)
        proposed = _json_value(proposed_changes)

        if self.change_request_type == 'ACTIVITY' and operation == 'CREATE':
            proposed['objective'] = int(self.kwargs['objective_pk'])

        change_request = ChangeRequest.objects.create(
            project=project,
            submitted_by=self.request.user,
            change_type=self.change_request_type,
            operation=operation,
            status='PENDING',
            description=str(self.request.data.get('description', '') or 'Submitted for review'),
            entity_id=getattr(instance, 'pk', None),
            current_state=self._state(instance) if instance is not None else None,
            proposed_changes=proposed,
        )
        ChangeRequestVersion.objects.create(
            change_request=change_request,
            version_number=1,
            status='PENDING',
            description=change_request.description,
            change_type=change_request.change_type,
            operation=operation,
            entity_id=change_request.entity_id,
            current_state=change_request.current_state,
            proposed_changes=proposed,
            submitted_at=timezone.now(),
        )
        return Response(ChangeRequestSerializer(change_request).data, status=status.HTTP_202_ACCEPTED)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._submit('CREATE', serializer.validated_data)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.pop('partial', False))
        serializer.is_valid(raise_exception=True)
        return self._submit('UPDATE', serializer.validated_data, instance)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        return self._submit('DELETE', {}, instance)

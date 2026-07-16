from django.db import transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import ArchivedHistoryLog, HistoryLog
from .permissions import IsAdminExecutiveOrProjectStaff, IsAdminOnly
from .serializers import ArchivedHistoryLogSerializer, HistoryLogSerializer
from .services import log_history
from .utils import revert_history_entry


class HistoryLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistoryLog.objects.all()
    serializer_class = HistoryLogSerializer
    permission_classes = [IsAdminExecutiveOrProjectStaff]

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        """Soft-delete (archive) a single HistoryLog entry."""
        if not request.user.is_authenticated or getattr(request.user, 'role', None) != 'ADMIN':
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        history_entry = self.get_object()

        with transaction.atomic():
            archived_entry = ArchivedHistoryLog.objects.create(
                history_log=history_entry,
                timestamp=history_entry.timestamp,
                user=history_entry.user,
                action=history_entry.action,
                change_type=history_entry.change_type,
                module=history_entry.module,
                description=history_entry.description,
                project=history_entry.project,
                object_name=history_entry.object_name,
                entity_id=history_entry.entity_id,
                old_state=history_entry.old_state,
                new_state=history_entry.new_state,
                user_role=history_entry.user_role,
                related_change_request=history_entry.related_change_request,
            )
            history_entry.delete()

        serializer = ArchivedHistoryLogSerializer(archived_entry)
        return Response(serializer.data, status=status.HTTP_200_OK)


    def get_queryset(self):
        user = self.request.user
        qs = HistoryLog.objects.all()

        project_filter = self.request.query_params.get('project', None)
        if project_filter:
            qs = qs.filter(project_id=project_filter)

        change_type_filter = self.request.query_params.get('change_type', None)
        if change_type_filter:
            qs = qs.filter(change_type=change_type_filter)

        action_filter = self.request.query_params.get('action', None)
        if action_filter:
            qs = qs.filter(action=action_filter)

        module_filter = self.request.query_params.get('module', None)
        if module_filter:
            qs = qs.filter(module__icontains=module_filter)

        search = self.request.query_params.get('search', None)
        if search:
            qs = qs.filter(
                Q(description__icontains=search)
                | Q(object_name__icontains=search)
                | Q(project__name__icontains=search)
                | Q(user__email__icontains=search)
            )

        if user.is_authenticated and hasattr(user, 'role') and user.role == 'PROJECT_STAFF':
            from projects.models import ProjectMembers
            user_projects = ProjectMembers.objects.filter(user=user).values_list('project_id', flat=True)
            qs = qs.filter(project_id__in=user_projects)

        return qs.order_by('-timestamp')

    @action(detail=True, methods=['post'], url_path='revert')
    def revert(self, request, pk=None):
        history_entry = self.get_object()

        if history_entry.action == 'REVERT':
            return Response({'error': 'Cannot revert a revert action'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                revert_history_entry(history_entry)
                revert_entry = log_history(
                    user=request.user,
                    action='REVERT',
                    module=history_entry.module or history_entry.change_type,
                    project=history_entry.project,
                    object_name=history_entry.object_name or history_entry.description,
                    description=f"Reverted: {history_entry.description}",
                    change_type=history_entry.change_type,
                    entity_id=history_entry.entity_id,
                    old_state=history_entry.new_state,
                    new_state=history_entry.old_state,
                    related_change_request=None,
                )
                serializer = self.get_serializer(revert_entry)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except ValidationError as exc:
                return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as exc:
                return Response({'error': f'Failed to revert: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ArchivedHistoryLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ArchivedHistoryLog.objects.all()
    serializer_class = ArchivedHistoryLogSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        user = self.request.user
        qs = ArchivedHistoryLog.objects.all()

        project_filter = self.request.query_params.get('project', None)
        if project_filter:
            qs = qs.filter(project_id=project_filter)

        change_type_filter = self.request.query_params.get('change_type', None)
        if change_type_filter:
            qs = qs.filter(change_type=change_type_filter)

        action_filter = self.request.query_params.get('action', None)
        if action_filter:
            qs = qs.filter(action=action_filter)

        module_filter = self.request.query_params.get('module', None)
        if module_filter:
            qs = qs.filter(module__icontains=module_filter)

        search = self.request.query_params.get('search', None)
        if search:
            qs = qs.filter(
                Q(description__icontains=search)
                | Q(object_name__icontains=search)
                | Q(project__name__icontains=search)
                | Q(user__email__icontains=search)
            )

        if user.is_authenticated and hasattr(user, 'role') and user.role == 'PROJECT_STAFF':
            from projects.models import ProjectMembers
            user_projects = ProjectMembers.objects.filter(user=user).values_list('project_id', flat=True)
            qs = qs.filter(project_id__in=user_projects)

        return qs.order_by('-archived_at')

    @action(detail=True, methods=['delete'], url_path='permanent-delete')
    def permanent_delete(self, request, pk=None):
        """Permanently delete an archived history log entry immediately."""
        archived_entry = self.get_object()
        archived_entry_id = archived_entry.id
        archived_entry.delete()
        return Response({'id': archived_entry_id, 'detail': 'Permanently deleted.'}, status=status.HTTP_204_NO_CONTENT)


    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        archived_entry = self.get_object()

        with transaction.atomic():
            restored_entry = HistoryLog.objects.create(
                timestamp=archived_entry.timestamp,
                user=archived_entry.user,
                action=archived_entry.action,
                change_type=archived_entry.change_type,
                module=archived_entry.module,
                description=archived_entry.description,
                project=archived_entry.project,
                object_name=archived_entry.object_name,
                entity_id=archived_entry.entity_id,
                old_state=archived_entry.old_state,
                new_state=archived_entry.new_state,
                user_role=archived_entry.user_role,
                related_change_request=archived_entry.related_change_request,
            )
            archived_entry.delete()

        serializer = HistoryLogSerializer(restored_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

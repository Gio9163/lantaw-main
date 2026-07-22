from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db import transaction
from django.db.models import Prefetch
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.shortcuts import get_object_or_404
import decimal

from .models import ChangeRequest, ChangeRequestVersion
from .serializers import ChangeRequestSerializer, ChangeRequestVersionSerializer
from .permissions import IsProjectStaffOrAdmin, IsAdminOnly, CanSubmitChangeRequest
from .utils import apply_change_request, revert_change_request
from projects.models import Project
from history_log.services import log_history


def get_changed_fields(current_state, proposed_changes):
    """
    Helper function to get the set of fields that are being changed.
    Returns a set of field names that differ between current_state and proposed_changes.
    """
    if not current_state or not proposed_changes:
        return set()
    
    changed_fields = set()
    
    # Get all keys from both dictionaries
    all_keys = set(list(current_state.keys()) + list(proposed_changes.keys()))
    
    field_labels = {
        'name': 'Project Name',
        'project_leader': 'Project Leader',
        'description': 'Description',
        'date_start': 'Start Date',
        'date_end': 'End Date',
        'grant_amount': 'Grant Amount',
    }
    
    for key in all_keys:
        current_value = current_state.get(key)
        proposed_value = proposed_changes.get(key)
        
        # Special handling for grant_amount (decimal field)
        if key == 'grant_amount':
            try:
                current_num = float(current_value) if current_value not in (None, '') else 0.0
                proposed_num = float(proposed_value) if proposed_value not in (None, '') else 0.0
                if abs(current_num - proposed_num) > 0.01:
                    changed_fields.add(key)
            except (ValueError, TypeError):
                # If conversion fails, compare as strings
                if str(current_value or '').strip() != str(proposed_value or '').strip():
                    changed_fields.add(key)
            continue
        
        # Normalize values for comparison
        def normalize_value(val):
            if val is None:
                return ""
            if isinstance(val, (int, float, decimal.Decimal)):
                return val
            return str(val).strip()
        
        normalized_current = normalize_value(current_value)
        normalized_proposed = normalize_value(proposed_value)
        
        if normalized_current != normalized_proposed:
            changed_fields.add(key)
    
    return changed_fields


def is_reviewable_status(status):
    return status in {'PENDING', 'RESUBMITTED'}


class ChangeRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ChangeRequest model.
    Supports both nested routing (under projects) and top-level routing (Admin only).
    """
    queryset = ChangeRequest.objects.all()
    serializer_class = ChangeRequestSerializer
    
    def get_permissions(self):
        """
        Assign permissions based on action.
        """
        if self.action in ['approve', 'reject', 'revert']:
            return [IsAdminOnly()]
        elif self.action == 'create':
            return [CanSubmitChangeRequest()]
        else:
            return [IsProjectStaffOrAdmin()]
    
    def get_queryset(self):
        """
        Filter queryset based on user role and routing context.
        """
        user = self.request.user
        project_pk = self.kwargs.get('project_pk')
        
        # If nested under projects, filter by project
        if project_pk:
            qs = ChangeRequest.objects.filter(project_id=project_pk)
            if user.role == "PROJECT_STAFF":
                qs = qs.filter(submitted_by=user)
        else:
            # Top-level endpoint - Admin sees all, Project Staff sees only their own
            if user.role == "ADMIN":
                qs = ChangeRequest.objects.all()
            elif user.role == "PROJECT_STAFF":
                qs = ChangeRequest.objects.filter(submitted_by=user)
            else:
                qs = ChangeRequest.objects.none()
        
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        change_type_filter = self.request.query_params.get('change_type', None)
        if change_type_filter:
            qs = qs.filter(change_type=change_type_filter)
        
        operation_filter = self.request.query_params.get('operation', None)
        if operation_filter:
            qs = qs.filter(operation=operation_filter)
        
        version_queryset = ChangeRequestVersion.objects.select_related(
            'reviewed_by'
        ).order_by('version_number')
        return qs.select_related(
            'project', 'submitted_by', 'approved_by'
        ).prefetch_related(
            Prefetch('versions', queryset=version_queryset)
        ).order_by('-date_submitted')
    
    def perform_create(self, serializer):
        user = self.request.user
        project_pk = self.kwargs.get('project_pk') or serializer.validated_data.get('project')

        change_type = serializer.validated_data.get('change_type')
        operation = serializer.validated_data.get('operation')
        project = get_object_or_404(Project, pk=project_pk) if project_pk else None
        if project is None and not (change_type == 'PROJECT' and operation == 'CREATE'):
            raise ValidationError({'project': 'Project is required'})

        if user.role == "PROJECT_STAFF" and project is not None:
            from projects.models import ProjectMembers
            if not ProjectMembers.objects.filter(project=project, user=user).exists():
                raise PermissionDenied("You are not assigned to this project.")

        with transaction.atomic():
            change_request = serializer.save(submitted_by=user, project=project)
            version = ChangeRequestVersion.objects.create(
                change_request=change_request,
                version_number=1,
                status='PENDING',
                description=change_request.description or 'Submitted for review',
                change_type=change_request.change_type,
                operation=change_request.operation,
                entity_id=change_request.entity_id,
                current_state=change_request.current_state,
                proposed_changes=change_request.proposed_changes,
                submitted_at=timezone.now(),
            )
            change_request.status = version.status
            change_request.description = version.description
            change_request.entity_id = version.entity_id
            change_request.current_state = version.current_state
            change_request.proposed_changes = version.proposed_changes
            change_request.change_type = version.change_type
            change_request.operation = version.operation
            change_request.save(update_fields=['status', 'description', 'entity_id', 'current_state', 'proposed_changes', 'change_type', 'operation', 'updated_at'])

            log_history(
                user=user,
                action='SUBMIT',
                module='CHANGE_REQUEST',
                project=project,
                object_name=f"{change_request.request_code}",
                description=f"{user.get_full_name() or user.email} created {change_request.request_code}",
                change_type='CHANGE_REQUEST',
                entity_id=change_request.id,
                related_change_request=change_request,
            )
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None, project_pk=None):
        """
        Approve a change request. Only Admin can approve.
        """
        change_request = self.get_object()
        latest_version = change_request.latest_version if hasattr(change_request, "latest_version") else None

        # (Temporary debug logging removed)

        if change_request.latest_version and change_request.latest_version.requires_revision:
            return Response({'error': 'Project Staff must revise this reverted request before it can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        if change_request.latest_version and not is_reviewable_status(change_request.latest_version.status):
            return Response({'error': f'Cannot approve change request with status {change_request.latest_version.status}'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            change_request = ChangeRequest.objects.select_for_update().get(pk=change_request.pk)
            latest_version = change_request.versions.order_by('version_number').last()
            if latest_version and latest_version.requires_revision:
                return Response({'error': 'Project Staff must revise this reverted request before it can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
            if latest_version and not is_reviewable_status(latest_version.status):
                return Response({'error': f'Change request status changed to {latest_version.status}'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                applied_entity = apply_change_request(change_request)
                if change_request.change_type == 'PROJECT' and change_request.operation == 'CREATE':
                    from projects.models import ProjectMembers
                    ProjectMembers.objects.get_or_create(
                        project=applied_entity,
                        user=change_request.submitted_by,
                    )
                latest_version.status = 'APPROVED'
                latest_version.reviewed_at = timezone.now()
                latest_version.reviewed_by = request.user
                latest_version.save(update_fields=['status', 'reviewed_at', 'reviewed_by'])
                change_request.status = 'APPROVED'
                change_request.approved_by = request.user
                change_request.date_processed = latest_version.reviewed_at
                change_request.save(update_fields=['status', 'approved_by', 'date_processed', 'updated_at'])
                log_history(
                    user=request.user,
                    action='APPROVE',
                    module='CHANGE_REQUEST',
                    project=change_request.project,
                    object_name=change_request.request_code,
                    description=f"{request.user.get_full_name() or request.user.email} approved {change_request.request_code} version {latest_version.version_number}",
                    change_type='CHANGE_REQUEST',
                    entity_id=change_request.id,
                    related_change_request=change_request,
                )
                serializer = self.get_serializer(change_request)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({'error': f'Failed to apply changes: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None, project_pk=None):
        """
        Reject a change request. Only Admin can reject.
        """
        change_request = self.get_object()
        latest_version = change_request.versions.order_by('version_number').last()

        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response({'error': 'Feedback is required when rejecting a change request.'}, status=status.HTTP_400_BAD_REQUEST)

        if change_request.latest_version and change_request.latest_version.requires_revision:
            return Response({'error': 'This reverted request is already awaiting Project Staff revision.'}, status=status.HTTP_400_BAD_REQUEST)
        if change_request.latest_version and not is_reviewable_status(change_request.latest_version.status):
            return Response({'error': f'Cannot reject change request with status {change_request.latest_version.status}'}, status=status.HTTP_400_BAD_REQUEST)


        with transaction.atomic():
            change_request = ChangeRequest.objects.select_for_update().get(pk=change_request.pk)
            latest_version = change_request.versions.order_by('version_number').last()
            if latest_version and latest_version.requires_revision:
                return Response({'error': 'This reverted request is already awaiting Project Staff revision.'}, status=status.HTTP_400_BAD_REQUEST)
            if latest_version and not is_reviewable_status(latest_version.status):
                return Response({'error': f'Change request status changed to {latest_version.status}'}, status=status.HTTP_400_BAD_REQUEST)

            latest_version.status = 'REJECTED'
            latest_version.admin_feedback = rejection_reason
            latest_version.reviewed_at = timezone.now()
            latest_version.reviewed_by = request.user
            latest_version.save(update_fields=['status', 'admin_feedback', 'reviewed_at', 'reviewed_by'])
            change_request.status = 'REJECTED'
            change_request.approved_by = request.user
            change_request.date_processed = latest_version.reviewed_at
            change_request.rejection_reason = rejection_reason
            change_request.save(update_fields=['status', 'approved_by', 'date_processed', 'rejection_reason', 'updated_at'])
            log_history(
                user=request.user,
                action='REJECT',
                module='CHANGE_REQUEST',
                project=change_request.project,
                object_name=change_request.request_code,
                description=f"{request.user.get_full_name() or request.user.email} rejected {change_request.request_code}: {rejection_reason}",
                change_type='CHANGE_REQUEST',
                entity_id=change_request.id,
                related_change_request=change_request,
            )
            serializer = self.get_serializer(change_request)
            return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='resubmit')
    def resubmit(self, request, pk=None, project_pk=None):
        change_request = self.get_object()
        user = request.user
        if user.role != 'PROJECT_STAFF' or change_request.submitted_by_id != user.id:
            raise PermissionDenied('Only the submitting Project Staff user may resubmit this request.')
        requested_description = request.data.get('description')
        requested_changes = request.data.get('proposed_changes')
        if requested_description is not None and not isinstance(requested_description, str):
            return Response({'error': 'Description must be text.'}, status=status.HTTP_400_BAD_REQUEST)
        if requested_changes is not None and not isinstance(requested_changes, dict):
            return Response({'error': 'Proposed changes must be an object.'}, status=status.HTTP_400_BAD_REQUEST)

        latest_version = change_request.latest_version
        if latest_version and latest_version.status == 'APPROVED':
            return Response({'error': 'Approved requests cannot be edited.'}, status=status.HTTP_400_BAD_REQUEST)
        can_resubmit = latest_version and (
            latest_version.status == 'REJECTED'
            or (latest_version.status == 'PENDING' and latest_version.requires_revision)
        )
        if not can_resubmit:
            return Response({'error': 'Only rejected or reverted requests requiring revision can be resubmitted.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Lock the ChangeRequest row.
            change_request = ChangeRequest.objects.select_for_update().get(pk=change_request.pk)

            latest_version = change_request.versions.order_by('version_number').last()
            can_resubmit = latest_version and (
                latest_version.status == 'REJECTED'
                or (latest_version.status == 'PENDING' and latest_version.requires_revision)
            )
            if not can_resubmit:
                return Response({'error': 'Only rejected or reverted requests requiring revision can be resubmitted.'}, status=status.HTTP_400_BAD_REQUEST)

            description = (
                requested_description.strip()
                if requested_description and requested_description.strip()
                else latest_version.description
            )
            proposed_changes = (
                requested_changes
                if requested_changes is not None
                else latest_version.proposed_changes
            )
            current_state = latest_version.current_state
            entity_id = latest_version.entity_id
            change_type = latest_version.change_type
            operation = latest_version.operation

            old_version_number = latest_version.version_number
            old_version_status = latest_version.status

            new_version_number = latest_version.version_number + 1
            new_version_status = 'PENDING'

            # Create the new ChangeRequestVersion with review metadata cleared.
            new_version = ChangeRequestVersion.objects.create(
                change_request=change_request,
                version_number=new_version_number,
                status=new_version_status,
                description=description,
                change_type=change_type,
                operation=operation,
                entity_id=entity_id,
                current_state=current_state,
                proposed_changes=proposed_changes,
                submitted_at=timezone.now(),
                reviewed_by=None,
                reviewed_at=None,
                admin_feedback='',
                requires_revision=False,
            )

            # Update parent ChangeRequest to represent a fresh review cycle.
            change_request.status = 'PENDING'
            change_request.rejection_reason = ''
            change_request.date_processed = None
            change_request.approved_by = None

            change_request.description = description
            change_request.entity_id = entity_id
            change_request.current_state = current_state
            change_request.proposed_changes = proposed_changes
            change_request.change_type = change_type
            change_request.operation = operation

            change_request.save(update_fields=[
                'status',
                'rejection_reason',
                'date_processed',
                'approved_by',
                'description',
                'entity_id',
                'current_state',
                'proposed_changes',
                'change_type',
                'operation',
                'updated_at',
            ])

            log_history(
                user=user,
                action='RESUBMIT',
                module='CHANGE_REQUEST',
                project=change_request.project,
                object_name=change_request.request_code,
                description=f"{user.get_full_name() or user.email} resubmitted {change_request.request_code} version {new_version.version_number}",
                change_type='CHANGE_REQUEST',
                entity_id=change_request.id,
                related_change_request=change_request,
            )

            serializer = self.get_serializer(change_request)
            return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='revert')
    def revert(self, request, pk=None, project_pk=None):
        """Reverse an approved UPDATE and return it to Staff as a pending revision."""
        feedback = request.data.get('feedback', '')
        if not isinstance(feedback, str) or not feedback.strip():
            return Response(
                {'error': 'Feedback is required when reverting an approved request.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        feedback = feedback.strip()

        with transaction.atomic():
            change_request = ChangeRequest.objects.select_for_update().get(
                pk=self.get_object().pk
            )
            latest_version = change_request.versions.select_for_update().order_by(
                'version_number'
            ).last()
            if not latest_version or latest_version.status != 'APPROVED':
                return Response(
                    {'error': 'Only the latest approved request version can be reverted.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                revert_result = revert_change_request(change_request)
            except DjangoValidationError as exc:
                message = '; '.join(exc.messages) if exc.messages else str(exc)
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
            now = timezone.now()
            revision_version = ChangeRequestVersion.objects.create(
                change_request=change_request,
                version_number=latest_version.version_number + 1,
                status='PENDING',
                description=latest_version.description,
                admin_feedback=feedback,
                requires_revision=True,
                change_type=latest_version.change_type,
                operation=latest_version.operation,
                entity_id=latest_version.entity_id,
                current_state=latest_version.current_state,
                proposed_changes=latest_version.proposed_changes,
                submitted_at=now,
                reviewed_at=now,
                reviewed_by=request.user,
            )

            change_request.status = 'PENDING'
            change_request.approved_by = None
            change_request.date_processed = None
            change_request.rejection_reason = feedback
            change_request.save(update_fields=[
                'status',
                'approved_by',
                'date_processed',
                'rejection_reason',
                'updated_at',
            ])

            log_history(
                user=request.user,
                action='REVERT',
                module='CHANGE_REQUEST',
                project=change_request.project,
                object_name=change_request.request_code,
                description=(
                    f"{request.user.get_full_name() or request.user.email} reverted "
                    f"{change_request.request_code} version {latest_version.version_number}: {feedback}"
                ),
                change_type='CHANGE_REQUEST',
                entity_id=change_request.id,
                old_state=revert_result['before_revert'],
                new_state=revert_result['after_revert'],
                related_change_request=change_request,
            )

            serializer = self.get_serializer(change_request)
            return Response(serializer.data, status=status.HTTP_200_OK)


    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None, project_pk=None):
        change_request = self.get_object()
        if request.user.role != 'ADMIN':
            raise PermissionDenied('Only admins can archive change requests.')

        with transaction.atomic():
            change_request = ChangeRequest.objects.select_for_update().get(pk=change_request.pk)
            latest_version = change_request.versions.order_by('version_number').last()
            latest_version.status = 'ARCHIVED'
            latest_version.reviewed_at = timezone.now()
            latest_version.reviewed_by = request.user
            latest_version.save(update_fields=['status', 'reviewed_at', 'reviewed_by'])
            change_request.status = 'ARCHIVED'
            change_request.date_processed = latest_version.reviewed_at
            change_request.save(update_fields=['status', 'date_processed', 'updated_at'])
            log_history(
                user=request.user,
                action='ARCHIVE',
                module='CHANGE_REQUEST',
                project=change_request.project,
                object_name=change_request.request_code,
                description=f"{request.user.get_full_name() or request.user.email} archived {change_request.request_code}",
                change_type='CHANGE_REQUEST',
                entity_id=change_request.id,
                related_change_request=change_request,
            )
            serializer = self.get_serializer(change_request)
            return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None, project_pk=None):
        """
        Cancel a change request. Only Project Staff can cancel their own pending requests.
        """
        change_request = self.get_object()
        user = request.user
        
        # Only Project Staff can cancel
        if user.role != "PROJECT_STAFF":
            return Response(
                {'error': 'Only Project Staff can cancel change requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Only the submitter can cancel their own request
        if change_request.submitted_by != user:
            return Response(
                {'error': 'You can only cancel your own change requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate status
        if change_request.status != 'PENDING':
            return Response(
                {'error': f'Cannot cancel change request with status {change_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get cancel reason from request
        cancel_reason = request.data.get('cancel_reason', '')
        
        # Use select_for_update to prevent concurrent cancellations
        with transaction.atomic():
            change_request = ChangeRequest.objects.select_for_update().get(pk=change_request.pk)
            
            # Double-check status after locking
            if change_request.status != 'PENDING':
                return Response(
                    {'error': f'Change request status changed to {change_request.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update change request status
            change_request.status = 'CANCELED'
            change_request.date_processed = timezone.now()
            change_request.cancel_reason = cancel_reason
            change_request.save()
            
            serializer = self.get_serializer(change_request)
            return Response(serializer.data, status=status.HTTP_200_OK)

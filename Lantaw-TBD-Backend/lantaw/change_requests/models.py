from django.db import models
from django.utils import timezone

from projects.models import Project
from users.models import User


class ChangeRequest(models.Model):
    """Parent record for a threaded change request with one or more versions."""

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('REJECTED', 'Rejected'),
        ('RESUBMITTED', 'Resubmitted'),
        ('APPROVED', 'Approved'),
        ('ARCHIVED', 'Archived'),
    ]

    CHANGE_TYPE_CHOICES = [
        ('ACTIVITY', 'Activity'),
        ('OBJECTIVE', 'Objective'),
        ('PERSONNEL', 'Personnel'),
        ('BUDGET', 'Budget'),
        ('COMPENSATION', 'Compensation'),
        ('PROJECT', 'Project'),
        ('ROLE', 'Role'),
        ('DEPARTMENT', 'Department'),
    ]

    OPERATION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True)
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submitted_change_requests')
    change_type = models.CharField(max_length=20, choices=CHANGE_TYPE_CHOICES)
    operation = models.CharField(max_length=10, choices=OPERATION_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    description = models.TextField(blank=True, default='')
    request_code = models.CharField(max_length=30, unique=True, blank=True)

    entity_id = models.IntegerField(null=True, blank=True)
    current_state = models.JSONField(null=True, blank=True)
    proposed_changes = models.JSONField(default=dict)

    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_change_requests')
    date_submitted = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    date_processed = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default='')
    cancel_reason = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-updated_at', '-date_submitted']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['submitted_by', 'status']),
        ]

    def save(self, *args, **kwargs):
        if not self.request_code:
            self.request_code = self._generate_request_code()
        super().save(*args, **kwargs)

    def _generate_request_code(self):
        year = timezone.now().year
        prefix = f'CR-{year}'
        existing = ChangeRequest.objects.filter(request_code__startswith=f'{prefix}-').count()
        while True:
            candidate = f'{prefix}-{existing + 1:04d}'
            if not ChangeRequest.objects.filter(request_code=candidate).exists():
                return candidate
            existing += 1

    def sync_from_latest_version(self):
        latest_version = self.versions.order_by('version_number').last()
        if not latest_version:
            return

        self.status = latest_version.status
        self.description = latest_version.description
        self.entity_id = latest_version.entity_id
        self.current_state = latest_version.current_state
        self.proposed_changes = latest_version.proposed_changes
        self.change_type = latest_version.change_type
        self.operation = latest_version.operation

        if latest_version.status == 'APPROVED':
            self.date_processed = latest_version.reviewed_at or self.date_processed or timezone.now()
            self.approved_by = latest_version.reviewed_by or self.approved_by
            self.rejection_reason = ''
        elif latest_version.status == 'REJECTED':
            self.date_processed = latest_version.reviewed_at or self.date_processed or timezone.now()
            self.approved_by = latest_version.reviewed_by or self.approved_by
            self.rejection_reason = latest_version.admin_feedback or ''
        elif latest_version.status == 'ARCHIVED':
            self.date_processed = latest_version.reviewed_at or self.date_processed or timezone.now()
            self.approved_by = latest_version.reviewed_by or self.approved_by
            self.rejection_reason = latest_version.admin_feedback or ''
        else:
            self.date_processed = None
            self.rejection_reason = ''

        self.save(update_fields=[
            'status',
            'description',
            'entity_id',
            'current_state',
            'proposed_changes',
            'change_type',
            'operation',
            'approved_by',
            'date_processed',
            'rejection_reason',
            'updated_at',
        ])

    @property
    def current_version(self):
        return self.versions.count()

    @property
    def latest_version(self):
        return self.versions.order_by('version_number').last()

    def __str__(self):
        return f"{self.request_code} - {self.change_type} {self.operation} ({self.status})"


class ChangeRequestVersion(models.Model):
    """A single revision within a threaded change request."""

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('REJECTED', 'Rejected'),
        ('RESUBMITTED', 'Resubmitted'),
        ('APPROVED', 'Approved'),
        ('ARCHIVED', 'Archived'),
    ]

    change_request = models.ForeignKey(ChangeRequest, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    description = models.TextField(blank=True, default='')
    admin_feedback = models.TextField(blank=True, default='')

    change_type = models.CharField(max_length=20, choices=ChangeRequest.CHANGE_TYPE_CHOICES)
    operation = models.CharField(max_length=10, choices=ChangeRequest.OPERATION_CHOICES)
    entity_id = models.IntegerField(null=True, blank=True)
    current_state = models.JSONField(null=True, blank=True)
    proposed_changes = models.JSONField(default=dict)

    submitted_at = models.DateTimeField(default=timezone.now)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_change_request_versions')

    class Meta:
        ordering = ['version_number']
        unique_together = [('change_request', 'version_number')]

    def __str__(self):
        return f"{self.change_request.request_code} v{self.version_number} ({self.status})"

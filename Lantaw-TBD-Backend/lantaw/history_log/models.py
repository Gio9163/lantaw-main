from django.db import models
from django.utils import timezone
from projects.models import Project
from users.models import User
from change_requests.models import ChangeRequest


class HistoryLog(models.Model):
    """Store important user-driven events for the project audit trail."""

    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('REVERT', 'Revert'),
        ('ASSIGN', 'Assign'),
        ('REMOVE', 'Remove'),
        ('SUBMIT', 'Submit'),
        ('APPROVE', 'Approve'),
        ('REJECT', 'Reject'),
        ('CANCEL', 'Cancel'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
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
        ('CHANGE_REQUEST', 'Change Request'),
        ('USER', 'User'),
    ]

    timestamp = models.DateTimeField(default=timezone.now)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='history_log_entries')
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    change_type = models.CharField(max_length=20, choices=CHANGE_TYPE_CHOICES)
    module = models.CharField(max_length=30, default='GENERAL', blank=True)
    description = models.TextField()
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='history_log_entries')
    object_name = models.CharField(max_length=255, null=True, blank=True)
    entity_id = models.IntegerField(null=True, blank=True)
    old_state = models.JSONField(null=True, blank=True)
    new_state = models.JSONField(null=True, blank=True)
    user_role = models.CharField(max_length=20, null=True, blank=True)
    related_change_request = models.ForeignKey(
        ChangeRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='history_log_entries'
    )

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['project', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['change_type', 'timestamp']),
        ]

    def __str__(self):
        project_name = self.project.name if self.project else 'General'
        return f"{self.change_type} {self.action} - {project_name} ({self.timestamp})"


class ArchivedHistoryLog(models.Model):
    """Archive older history log entries while keeping them searchable."""

    history_log = models.OneToOneField(
        HistoryLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='archived_copy',
    )
    timestamp = models.DateTimeField(default=timezone.now)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='archived_history_log_entries')
    action = models.CharField(max_length=10, choices=HistoryLog.ACTION_CHOICES)
    change_type = models.CharField(max_length=20, choices=HistoryLog.CHANGE_TYPE_CHOICES)
    module = models.CharField(max_length=30, default='GENERAL', blank=True)
    description = models.TextField()
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='archived_history_log_entries')
    object_name = models.CharField(max_length=255, null=True, blank=True)
    entity_id = models.IntegerField(null=True, blank=True)
    old_state = models.JSONField(null=True, blank=True)
    new_state = models.JSONField(null=True, blank=True)
    user_role = models.CharField(max_length=20, null=True, blank=True)
    related_change_request = models.ForeignKey(
        ChangeRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='archived_history_log_entries'
    )
    archived_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-archived_at']
        indexes = [
            models.Index(fields=['project', 'archived_at']),
            models.Index(fields=['user', 'archived_at']),
            models.Index(fields=['change_type', 'archived_at']),
        ]

    def __str__(self):
        project_name = self.project.name if self.project else 'General'
        return f"Archived {self.change_type} {self.action} - {project_name} ({self.archived_at})"

from django.utils import timezone
from rest_framework import serializers
from .models import HistoryLog, ArchivedHistoryLog


class BaseHistoryLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    remaining_until_archive = serializers.SerializerMethodField()

    class Meta:
        fields = [
            'id',
            'timestamp',
            'user',
            'user_name',
            'action',
            'module',
            'change_type',
            'object_name',
            'description',
            'project',
            'project_name',
            'entity_id',
            'old_state',
            'new_state',
            'user_role',
            'related_change_request',
            'remaining_until_archive',
        ]
        read_only_fields = [
            'id',
            'timestamp',
            'user_name',
            'project_name',
        ]

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        return None

    def get_project_name(self, obj):
        if obj.project:
            return obj.project.name
        return None

    def get_remaining_until_archive(self, obj):
        if getattr(obj, 'archived_at', None):
            return 'Archived'

        if not getattr(obj, 'timestamp', None):
            return 'Archive soon'

        expires_at = obj.timestamp + timezone.timedelta(days=7)
        remaining = expires_at - timezone.now()
        total_seconds = max(remaining.total_seconds(), 0)

        if total_seconds <= 0:
            return 'Archive due'

        days = int(total_seconds // 86400)
        if days > 0:
            return f"{days} day{'s' if days != 1 else ''} left"

        hours = int((total_seconds % 86400) // 3600)
        if hours > 0:
            return f"{hours} hour{'s' if hours != 1 else ''} left"

        minutes = int((total_seconds % 3600) // 60)
        return f"{minutes or 1} minute{'s' if minutes != 1 else ''} left"


class HistoryLogSerializer(BaseHistoryLogSerializer):
    class Meta(BaseHistoryLogSerializer.Meta):
        model = HistoryLog


class ArchivedHistoryLogSerializer(BaseHistoryLogSerializer):
    archived_at = serializers.DateTimeField(read_only=True)
    purge_at = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()

    def get_purge_at(self, obj):
        return obj.archived_at + timezone.timedelta(days=30)

    def get_remaining_days(self, obj):
        remaining = self.get_purge_at(obj) - timezone.now()
        return max(0, int((remaining.total_seconds() + 86399) // 86400))

    class Meta(BaseHistoryLogSerializer.Meta):
        model = ArchivedHistoryLog
        fields = BaseHistoryLogSerializer.Meta.fields + ['archived_at', 'purge_at', 'remaining_days']

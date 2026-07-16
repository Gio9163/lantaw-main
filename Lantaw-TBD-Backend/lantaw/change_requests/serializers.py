from rest_framework import serializers

from .models import ChangeRequest, ChangeRequestVersion
from projects.serializers import ProjectSerializer


class ChangeRequestVersionSerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ChangeRequestVersion
        fields = [
            'id',
            'version_number',
            'status',
            'description',
            'admin_feedback',
            'change_type',
            'operation',
            'entity_id',
            'current_state',
            'proposed_changes',
            'submitted_at',
            'reviewed_at',
            'reviewed_by',
            'reviewed_by_name',
        ]
        read_only_fields = ['id', 'version_number', 'submitted_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_name']

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}".strip()
        return None


class ChangeRequestSerializer(serializers.ModelSerializer):
    """Serializer for a threaded change request with latest-version data."""
    submitted_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    versions = ChangeRequestVersionSerializer(many=True, read_only=True)
    current_version = serializers.IntegerField(read_only=True)
    latest_version = ChangeRequestVersionSerializer(read_only=True)
    latest_status = serializers.SerializerMethodField()
    latest_feedback = serializers.SerializerMethodField()

    class Meta:
        model = ChangeRequest
        fields = [
            'id',
            'project',
            'project_name',
            'submitted_by',
            'submitted_by_name',
            'request_code',
            'change_type',
            'operation',
            'status',
            'description',
            'entity_id',
            'current_state',
            'proposed_changes',
            'approved_by',
            'approved_by_name',
            'date_submitted',
            'updated_at',
            'date_processed',
            'rejection_reason',
            'cancel_reason',
            'versions',
            'current_version',
            'latest_version',
            'latest_status',
            'latest_feedback',
        ]
        read_only_fields = [
            'id',
            'submitted_by',
            'request_code',
            'date_submitted',
            'updated_at',
            'date_processed',
            'approved_by',
            'approved_by_name',
            'project_name',
            'submitted_by_name',
            'versions',
            'current_version',
            'latest_version',
            'latest_status',
            'latest_feedback',
        ]

    def get_submitted_by_name(self, obj):
        if obj.submitted_by:
            return f"{obj.submitted_by.first_name} {obj.submitted_by.last_name}".strip()
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return f"{obj.approved_by.first_name} {obj.approved_by.last_name}".strip()
        return None

    def get_project_name(self, obj):
        if obj.project:
            return obj.project.name
        return None

    def get_latest_status(self, obj):
        latest_version = obj.latest_version
        return latest_version.status if latest_version else obj.status

    def get_latest_feedback(self, obj):
        latest_version = obj.latest_version
        return latest_version.admin_feedback if latest_version else obj.rejection_reason

    def validate(self, data):
        operation = data.get('operation', self.instance.operation if self.instance else None)
        entity_id = data.get('entity_id', self.instance.entity_id if self.instance else None)

        if operation == 'CREATE' and entity_id is not None:
            raise serializers.ValidationError({'entity_id': 'entity_id must be null for CREATE operations'})

        if operation in ['UPDATE', 'DELETE'] and entity_id is None:
            raise serializers.ValidationError({'entity_id': 'entity_id is required for UPDATE and DELETE operations'})

        return data

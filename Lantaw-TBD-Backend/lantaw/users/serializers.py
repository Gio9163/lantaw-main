from rest_framework import serializers
import secrets
from datetime import timedelta
from django.contrib.auth import get_user_model, password_validation
from django.db import transaction
from django.utils import timezone

from .models import ProjectInvitation, RegistrationRequest, REQUESTABLE_ROLE_CHOICES

User = get_user_model()

# Serializer for viewing and updating user details (hides password and role)
class UserSerializer(serializers.ModelSerializer):
    # Show role as string (e.g., "Admin") instead of raw DB value
    role = serializers.CharField(source="get_role_display", read_only=True)
    projects = serializers.SerializerMethodField()
    # Ensure last_login is properly formatted with timezone info
    last_login = serializers.DateTimeField(read_only=True, format=None)
    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "password",
            "role",
            "projects",
            "account_status",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "role"]
        extra_kwargs = {
            "password": {"write_only": True},  # password accepted on write, hidden on read
            "email": {"required": True},       # enforce email as required
        }
    
    def update(self, instance, validated_data):
        # Prevents role change
        validated_data.pop("role", "PROJECT_STAFF")
        return super().update(instance, validated_data)
    
    def get_projects(self, obj):
        return list(obj.projectmembers_set.values_list('project_id', flat=True))

# Serializer for registering new users (accepts password)
class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    requested_role = serializers.ChoiceField(choices=REQUESTABLE_ROLE_CHOICES)
    invitation_code = serializers.CharField(max_length=64, write_only=True)

    def validate_email(self, value):
        email = User.objects.normalize_email(value).strip()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_password(self, value):
        candidate = User(
            email=self.initial_data.get("email", ""),
            first_name=self.initial_data.get("first_name", ""),
            last_name=self.initial_data.get("last_name", ""),
        )
        password_validation.validate_password(value, candidate)
        return value

    def validate(self, attrs):
        code = attrs["invitation_code"].strip()
        invitation = (
            ProjectInvitation.objects.select_related("project")
            .filter(code__iexact=code)
            .first()
        )
        if invitation is None:
            raise serializers.ValidationError({"invitation_code": "Invalid project invitation code."})
        if invitation.email and invitation.email.lower() != attrs["email"].lower():
            raise serializers.ValidationError(
                {"email": "This invitation was issued to a different email address."}
            )
        if not invitation.is_available_for(attrs["requested_role"], email=attrs["email"]):
            if invitation.allowed_role != attrs["requested_role"]:
                message = "This invitation is not valid for the requested role."
            elif not invitation.is_active:
                message = "This project invitation is inactive."
            elif invitation.expires_at and invitation.expires_at <= timezone.now():
                message = "This project invitation has expired."
            else:
                message = "This project invitation has reached its usage limit."
            raise serializers.ValidationError({"invitation_code": message})
        attrs["invitation"] = invitation
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        invitation = validated_data.pop("invitation")
        validated_data.pop("invitation_code")
        requested_role = validated_data.pop("requested_role")
        invitation = ProjectInvitation.objects.select_for_update().select_related("project").get(
            pk=invitation.pk
        )
        if not invitation.is_available_for(requested_role, email=validated_data["email"]):
            raise serializers.ValidationError(
                {"invitation_code": "This project invitation is no longer available."}
            )
        user = User(
            **validated_data,
            role=None,
            account_status="PENDING_APPROVAL",
            is_active=False,
        )
        user.set_password(password)
        user.save()
        registration_request = RegistrationRequest.objects.create(
            user=user,
            requested_role=requested_role,
            project=invitation.project,
            invitation=invitation,
        )
        if invitation.max_uses == 1:
            invitation.accepted_at = timezone.now()
            invitation.save(update_fields=["accepted_at"])

        from history_log.models import HistoryLog
        HistoryLog.objects.create(
            user=None,
            action="SUBMIT",
            change_type="USER",
            module="USER",
            project=invitation.project,
            object_name=user.get_full_name() or user.email,
            entity_id=user.id,
            description=(
                f"Registration submitted for {user.email} requesting "
                f"{registration_request.get_requested_role_display()} access."
            ),
            new_state={
                "status": "PENDING",
                "requested_role": requested_role,
                "project_id": invitation.project_id,
            },
        )
        return registration_request


class ProjectInvitationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, allow_blank=False)
    expires_at = serializers.DateTimeField(required=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    allowed_role_display = serializers.CharField(
        source="get_allowed_role_display", read_only=True
    )
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = ProjectInvitation
        fields = [
            "id", "code", "email", "project", "project_name", "allowed_role",
            "allowed_role_display", "message", "is_active", "expires_at",
            "max_uses", "used_count", "created_by_email", "created_at",
            "revoked_at", "accepted_at", "status",
        ]
        read_only_fields = [
            "id", "code", "project", "project_name", "is_active", "max_uses",
            "used_count", "created_by_email", "created_at", "revoked_at",
            "accepted_at", "status",
        ]

    def validate_email(self, value):
        return User.objects.normalize_email(value).strip()

    def validate_expires_at(self, value):
        now = timezone.now()
        if value <= now:
            raise serializers.ValidationError("Expiration must be in the future.")
        if value > now + timedelta(days=30):
            raise serializers.ValidationError("Expiration cannot exceed 30 days.")
        return value

    def create(self, validated_data):
        validated_data["code"] = secrets.token_urlsafe(32)
        validated_data["max_uses"] = 1
        return super().create(validated_data)

    def get_status(self, obj):
        now = timezone.now()
        if obj.revoked_at or not obj.is_active:
            return "REVOKED"
        if obj.used_count >= obj.max_uses:
            return "ACCEPTED"
        if obj.expires_at and obj.expires_at <= now:
            return "EXPIRED"
        if obj.accepted_at:
            return "PENDING_APPROVAL"
        return "SENT"


class InvitationValidationSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    allowed_role_display = serializers.CharField(
        source="get_allowed_role_display", read_only=True
    )
    existing_account = serializers.SerializerMethodField()

    class Meta:
        model = ProjectInvitation
        fields = [
            "email", "allowed_role", "allowed_role_display", "project_name",
            "expires_at", "existing_account",
        ]

    def get_existing_account(self, obj):
        return bool(obj.email and User.objects.filter(email__iexact=obj.email).exists())


class RegistrationRequestSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    requested_role_display = serializers.CharField(
        source="get_requested_role_display", read_only=True
    )
    project_name = serializers.CharField(source="project.name", read_only=True)
    invitation_code = serializers.CharField(source="invitation.code", read_only=True)
    reviewed_by_email = serializers.EmailField(source="reviewed_by.email", read_only=True)

    class Meta:
        model = RegistrationRequest
        fields = [
            "id", "user_id", "first_name", "last_name", "email",
            "requested_role", "requested_role_display", "project", "project_name",
            "invitation_code", "status", "submitted_at", "reviewed_at",
            "reviewed_by_email", "rejection_reason", "existing_user",
        ]
        read_only_fields = fields


class RegistrationRejectionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, allow_blank=False, max_length=1000)

# Serializer for changing password 
class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is not correct.")
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user

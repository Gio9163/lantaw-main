from typing import Any


from rest_framework import serializers
from django.contrib.auth import get_user_model, password_validation
from django.utils import timezone

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
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "password",
            "role",
        ]
        read_only_fields = ["id", "role"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        # Force default role
        validated_data["role"] = "PROJECT_STAFF"
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

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

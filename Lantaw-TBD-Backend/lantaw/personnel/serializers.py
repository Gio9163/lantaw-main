from rest_framework import serializers
from .models import Personnel, Role, Department


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model=Role
        fields=["id", "name"]

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model=Department
        fields=["id", "name"]

class PersonnelSerializer(serializers.ModelSerializer):
    role_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = Personnel
        fields = [
            "id",
            "first_name",
            "last_name",
            "role",
            "role_name",
            "department",
            "department_name",
            "employment_status",
        ]

    def get_role_name(self, obj):
        """Safely get role name, handling None case."""
        return obj.role.name if obj.role else ""

    def get_department_name(self, obj):
        """Safely get department name, handling None case."""
        return obj.department.name if obj.department else ""
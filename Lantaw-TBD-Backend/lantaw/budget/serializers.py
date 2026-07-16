from rest_framework import serializers
from django.shortcuts import get_object_or_404
from  .models import BudgetLineItem, Compensation
from personnel.models import Personnel
from projects.models import ProjectPersonnel

class BudgetLineItemSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = BudgetLineItem
        fields = [
            "id",
            "name",
            "project",
            "project_name",
            "date_created",
            "date_modified",
        ]
        read_only_fields = ("project", "date_created", "date_modified")

class CompensationSerializer(serializers.ModelSerializer):
    budget_item_name = serializers.CharField(source="budget_item.name", read_only=True)
    personnel_first_name = serializers.CharField(source="personnel.first_name", read_only=True)
    personnel_last_name = serializers.CharField(source="personnel.last_name", read_only=True)
    role_name = serializers.CharField(source="personnel.role.name", read_only=True)
    monthly_salary = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    honoraria = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_compensation = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Compensation
        fields = [
            "id",
            "type",
            "budget_item",
            "budget_item_name",
            "personnel",
            "personnel_first_name",
            "personnel_last_name",
            "role_name",
            "reason",
            "monthly_rate",
            "monthly_salary",
            "honoraria",
            "duration_months",
            "amount",
            "total_compensation",
            "date_effective",
            "date_modified",
        ]
        read_only_fields = ("date_modified", "budget_item_name", "personnel_first_name", "personnel_last_name")
        extra_kwargs = {
            'budget_item': {'required': False}  # 🔹 make optional for POST
        }

    def validate_budget_item(self, value):
        """Validate that budget_item belongs to the project."""
        if value is None:
            return value
        
        # Get project_pk from context
        project_pk = self.context.get('project_pk')
        if not project_pk and self.context.get('view'):
            project_pk = self.context.get('view').kwargs.get('project_pk')
        
        if not project_pk:
            # If no project_pk in context, skip validation (shouldn't happen but be safe)
            return value
        
        # If value is an integer (ID), fetch the object to validate
        if isinstance(value, int):
            try:
                budget_item = BudgetLineItem.objects.get(pk=value)
            except BudgetLineItem.DoesNotExist:
                raise serializers.ValidationError(f"Budget item with ID {value} does not exist.")
            
            if budget_item.project_id != int(project_pk):
                raise serializers.ValidationError(
                    f"Budget item {value} does not belong to project {project_pk}."
                )
            return budget_item
        else:
            # If it's already an object, validate it
            if hasattr(value, 'project_id') and value.project_id != int(project_pk):
                raise serializers.ValidationError(
                    f"Budget item {value.pk} does not belong to project {project_pk}."
                )
            return value
    
    def validate_personnel(self, value):
        """Validate that personnel exists and belongs to the project."""
        if value is None:
            raise serializers.ValidationError("Personnel is required.")
        
        # Get project_pk from context
        project_pk = self.context.get('project_pk')
        if not project_pk and self.context.get('view'):
            project_pk = self.context.get('view').kwargs.get('project_pk')
        
        if not project_pk:
            # If no project_pk in context, skip validation (shouldn't happen but be safe)
            return value
        
        # If value is an integer (ID), fetch the object to validate
        if isinstance(value, int):
            personnel_id = value
            try:
                personnel = Personnel.objects.get(pk=value)
            except Personnel.DoesNotExist:
                raise serializers.ValidationError(f"Personnel with ID {value} does not exist.")
        else:
            personnel = value
            personnel_id = personnel.pk if hasattr(personnel, 'pk') else personnel.id
        
        # Check if personnel belongs to project through ProjectPersonnel
        if not ProjectPersonnel.objects.filter(personnel_id=personnel_id, project_id=int(project_pk)).exists():
            raise serializers.ValidationError(
                f"Personnel {personnel_id} does not belong to project {project_pk}."
            )
        
        # Return the object if we fetched it, otherwise return the original value
        return personnel if isinstance(value, int) else value
    
    def create(self, validated_data):
        # 🔹 Automatically assign PS budget item if missing
        if 'budget_item' not in validated_data or validated_data['budget_item'] is None:
            project_pk = self.context.get('project_pk') or self.context.get('view', {}).kwargs.get('project_pk')
            if not project_pk:
                raise serializers.ValidationError("Project ID is required.")
            ps_item = BudgetLineItem.objects.filter(name='PS', project_id=project_pk).first()
            if not ps_item:
                raise serializers.ValidationError("No PS budget item found for this project.")
            validated_data['budget_item'] = ps_item
        return super().create(validated_data)

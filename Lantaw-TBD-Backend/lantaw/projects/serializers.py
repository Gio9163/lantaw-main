from rest_framework import serializers
from .models import Project, ProjectMembers, BudgetItem

class BudgetItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetItem
        fields = ['id', 'category', 'description', 'amount']
        read_only_fields = ['id']

class ProjectSerializer(serializers.ModelSerializer):
    budget_items = BudgetItemSerializer(many=True, required=False)
    
    class Meta:
        model = Project
        fields = [
            'id', 
            'name',
            'project_leader',
            'description', 
            'grant_amount',
            'project_status',
            "date_start",
            "date_end",
            'budget_items',
        ]
    
    def create(self, validated_data):
        budget_items_data = validated_data.pop('budget_items', [])
        project = Project.objects.create(**validated_data)
        
        for item_data in budget_items_data:
            BudgetItem.objects.create(project=project, **item_data)
        
        return project
    
    def update(self, instance, validated_data):
        budget_items_data = validated_data.pop('budget_items', None)
        
        # Update project fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Handle budget items if provided
        if budget_items_data is not None:
            # Get existing budget item IDs from request
            existing_ids = [item.get('id') for item in budget_items_data if item.get('id')]
            
            # Delete budget items not in the request
            instance.budget_items.exclude(id__in=existing_ids).delete()
            
            # Create or update budget items
            for item_data in budget_items_data:
                item_id = item_data.get('id')
                if item_id:
                    # Update existing item
                    try:
                        budget_item = instance.budget_items.get(id=item_id)
                        for attr, value in item_data.items():
                            if attr != 'id':
                                setattr(budget_item, attr, value)
                        budget_item.save()
                    except BudgetItem.DoesNotExist:
                        # If ID doesn't exist, create new item
                        BudgetItem.objects.create(project=instance, **{k: v for k, v in item_data.items() if k != 'id'})
                else:
                    # Create new item
                    BudgetItem.objects.create(project=instance, **item_data)
        
        return instance

class ProjectMembersSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMembers
        fields = ['id', 'user', 'project', 'date_joined']
        read_only_fields = ['date_joined']
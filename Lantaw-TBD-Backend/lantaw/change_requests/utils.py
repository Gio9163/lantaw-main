"""
Utility functions for applying change requests to actual project data.
"""
from django.db import transaction
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404

from activities.models import Objective, Activity
from personnel.models import Personnel, Role, Department
from budget.models import BudgetLineItem, Compensation
from projects.models import Project


def apply_change_request(change_request):
    """
    Apply a change request to the actual project data.
    Handles CREATE, UPDATE, and DELETE operations for all change types.
    """
    change_type = change_request.change_type
    operation = change_request.operation
    proposed_changes = change_request.proposed_changes
    entity_id = change_request.entity_id
    current_state = change_request.current_state
    
    if operation == 'CREATE':
        return _create_entity(change_type, change_request.project, proposed_changes)
    elif operation == 'UPDATE':
        return _update_entity(change_type, entity_id, proposed_changes, current_state)
    elif operation == 'DELETE':
        return _delete_entity(change_type, entity_id, current_state)
    else:
        raise ValidationError(f"Invalid operation: {operation}")


def _create_entity(change_type, project, proposed_changes):
    """Create a new entity based on change type."""
    if change_type == 'OBJECTIVE':
        return _create_objective(project, proposed_changes)
    elif change_type == 'ACTIVITY':
        return _create_activity(project, proposed_changes)
    elif change_type == 'PERSONNEL':
        return _create_personnel(project, proposed_changes)
    elif change_type == 'BUDGET':
        return _create_budget_item(project, proposed_changes)
    elif change_type == 'COMPENSATION':
        return _create_compensation(project, proposed_changes)
    elif change_type == 'PROJECT':
        return _create_project(proposed_changes)
    elif change_type == 'ROLE':
        return _create_role(project, proposed_changes)
    elif change_type == 'DEPARTMENT':
        return _create_department(project, proposed_changes)
    else:
        raise ValidationError(f"Invalid change type for CREATE: {change_type}")


def _update_entity(change_type, entity_id, proposed_changes, current_state):
    """Update an existing entity based on change type."""
    if change_type == 'OBJECTIVE':
        return _update_objective(entity_id, proposed_changes, current_state)
    elif change_type == 'ACTIVITY':
        return _update_activity(entity_id, proposed_changes, current_state)
    elif change_type == 'PERSONNEL':
        return _update_personnel(entity_id, proposed_changes, current_state)
    elif change_type == 'BUDGET':
        return _update_budget_item(entity_id, proposed_changes, current_state)
    elif change_type == 'COMPENSATION':
        return _update_compensation(entity_id, proposed_changes, current_state)
    elif change_type == 'PROJECT':
        return _update_project(entity_id, proposed_changes, current_state)
    elif change_type == 'ROLE':
        return _update_role(entity_id, proposed_changes, current_state)
    elif change_type == 'DEPARTMENT':
        return _update_department(entity_id, proposed_changes, current_state)
    else:
        raise ValidationError(f"Invalid change type for UPDATE: {change_type}")


def _delete_entity(change_type, entity_id, current_state):
    """Delete an existing entity based on change type."""
    if change_type == 'OBJECTIVE':
        return _delete_objective(entity_id, current_state)
    elif change_type == 'ACTIVITY':
        return _delete_activity(entity_id, current_state)
    elif change_type == 'PERSONNEL':
        return _delete_personnel(entity_id, current_state)
    elif change_type == 'BUDGET':
        return _delete_budget_item(entity_id, current_state)
    elif change_type == 'COMPENSATION':
        return _delete_compensation(entity_id, current_state)
    elif change_type == 'PROJECT':
        return _delete_project(entity_id, current_state)
    elif change_type == 'ROLE':
        return _delete_role(entity_id, current_state)
    elif change_type == 'DEPARTMENT':
        return _delete_department(entity_id, current_state)
    else:
        raise ValidationError(f"Invalid change type for DELETE: {change_type}")


# CREATE operations
def _create_objective(project, proposed_changes):
    """Create a new Objective."""
    title = proposed_changes.get('title')
    description = proposed_changes.get('description', '')
    
    if not title:
        raise ValidationError("title is required for Objective")
    
    objective = Objective.objects.create(
        project=project,
        title=title,
        description=description
    )
    return objective


def _create_activity(project, proposed_changes):
    """Create a new Activity."""
    objective_id = proposed_changes.get('objective')
    title = proposed_changes.get('title')
    activity_status = proposed_changes.get('activity_status', 'PENDING')
    activity_budget_item = proposed_changes.get('activity_budget_item')
    projected_expense = proposed_changes.get('projected_expense')
    actual_expense = proposed_changes.get('actual_expense')
    
    if not objective_id:
        raise ValidationError("objective is required for Activity")
    if not title:
        raise ValidationError("title is required for Activity")
    
    objective = get_object_or_404(Objective, pk=objective_id, project=project)
    
    activity = Activity.objects.create(
        objective=objective,
        title=title,
        activity_status=activity_status,
        activity_budget_item_id=activity_budget_item if activity_budget_item else None,
        projected_expense=projected_expense,
        actual_expense=actual_expense
    )
    return activity


def _create_personnel(project, proposed_changes):
    """Create a new Personnel."""
    first_name = proposed_changes.get('first_name')
    last_name = proposed_changes.get('last_name')
    role_id = proposed_changes.get('role')
    department_id = proposed_changes.get('department')
    employment_status = proposed_changes.get('employment_status', 'ACTIVE')
    
    if not first_name or not last_name:
        raise ValidationError("first_name and last_name are required for Personnel")
    
    # Validate role and department exist if provided
    if role_id:
        get_object_or_404(Role, pk=role_id, project=project)
    if department_id:
        get_object_or_404(Department, pk=department_id, project=project)
    
    personnel = Personnel.objects.create(
        first_name=first_name,
        last_name=last_name,
        role_id=role_id,
        department_id=department_id,
        employment_status=employment_status
    )
    
    # Associate with project
    from projects.models import ProjectPersonnel
    ProjectPersonnel.objects.get_or_create(personnel=personnel, project=project)
    
    return personnel


def _create_budget_item(project, proposed_changes):
    """Create a new BudgetLineItem."""
    name = proposed_changes.get('name')
    
    if not name:
        raise ValidationError("name is required for BudgetLineItem")
    
    if name not in ['MOOE', 'PS', 'CO']:
        raise ValidationError(f"Invalid budget item name: {name}. Must be MOOE, PS, or CO")
    
    # Check uniqueness
    if BudgetLineItem.objects.filter(project=project, name=name).exists():
        raise ValidationError(f"BudgetLineItem with name {name} already exists for this project")
    
    budget_item = BudgetLineItem.objects.create(
        project=project,
        name=name
    )
    return budget_item


def _create_compensation(project, proposed_changes):
    """Create a new Compensation, or update if one already exists."""
    type_val = proposed_changes.get('type')
    budget_item_id = proposed_changes.get('budget_item')
    personnel_id = proposed_changes.get('personnel')
    reason = proposed_changes.get('reason', '')
    monthly_rate = proposed_changes.get('monthly_rate')
    duration_months = proposed_changes.get('duration_months')
    amount = proposed_changes.get('amount')
    date_effective = proposed_changes.get('date_effective')
    
    if not type_val or not personnel_id or not date_effective:
        raise ValidationError("type, personnel, and date_effective are required for Compensation")
    
    # Validate budget_item exists
    if budget_item_id:
        get_object_or_404(BudgetLineItem, pk=budget_item_id, project=project)
    
    # Validate personnel exists
    personnel = get_object_or_404(Personnel, pk=personnel_id)
    
    # Check if compensation already exists (type + personnel is unique)
    existing_compensation = Compensation.objects.filter(type=type_val, personnel=personnel).first()
    
    if existing_compensation:
        # Update existing compensation instead of creating a new one
        existing_compensation.budget_item_id = budget_item_id
        existing_compensation.reason = reason
        existing_compensation.monthly_rate = monthly_rate
        existing_compensation.duration_months = duration_months
        existing_compensation.amount = amount
        existing_compensation.date_effective = date_effective
        existing_compensation.save()
        return existing_compensation
    
    # Create new compensation if it doesn't exist
    compensation = Compensation.objects.create(
        type=type_val,
        budget_item_id=budget_item_id,
        personnel=personnel,
        reason=reason,
        monthly_rate=monthly_rate,
        duration_months=duration_months,
        amount=amount,
        date_effective=date_effective
    )
    return compensation


def _create_project(proposed_changes):
    """Create a new Project."""
    name = proposed_changes.get('name')
    project_leader = proposed_changes.get('project_leader')
    description = proposed_changes.get('description', '')
    grant_amount = proposed_changes.get('grant_amount')
    project_status = proposed_changes.get('project_status', 'ACTIVE')
    date_start = proposed_changes.get('date_start')
    date_end = proposed_changes.get('date_end')
    
    if not name or not project_leader or not date_start or not date_end:
        raise ValidationError("name, project_leader, date_start, and date_end are required for Project")
    
    project = Project(
        name=name,
        project_leader=project_leader,
        description=description,
        grant_amount=grant_amount,
        project_status=project_status,
        date_start=date_start,
        date_end=date_end
    )
    project.full_clean()  # This will validate date_start <= date_end
    project.save()
    return project


def _create_role(project, proposed_changes):
    """Create a new Role."""
    name = proposed_changes.get('name', '')
    
    # Check uniqueness
    if Role.objects.filter(project=project, name=name).exists():
        raise ValidationError(f"Role with name {name} already exists for this project")
    
    role = Role.objects.create(
        project=project,
        name=name
    )
    return role


def _create_department(project, proposed_changes):
    """Create a new Department."""
    name = proposed_changes.get('name', '')
    
    # Check uniqueness
    if Department.objects.filter(project=project, name=name).exists():
        raise ValidationError(f"Department with name {name} already exists for this project")
    
    department = Department.objects.create(
        project=project,
        name=name
    )
    return department


# UPDATE operations
def _update_objective(entity_id, proposed_changes, current_state):
    """Update an existing Objective."""
    objective = get_object_or_404(Objective, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if objective.title != current_state.get('title') or objective.description != current_state.get('description', ''):
            raise ValidationError("Current state mismatch. Objective has been modified.")
    
    objective.title = proposed_changes.get('title', objective.title)
    objective.description = proposed_changes.get('description', objective.description)
    objective.save()
    return objective


def _update_activity(entity_id, proposed_changes, current_state):
    """Update an existing Activity."""
    activity = get_object_or_404(Activity, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if activity.title != current_state.get('title'):
            raise ValidationError("Current state mismatch. Activity has been modified.")
    
    activity.title = proposed_changes.get('title', activity.title)
    activity.activity_status = proposed_changes.get('activity_status', activity.activity_status)
    activity.activity_budget_item_id = proposed_changes.get('activity_budget_item', activity.activity_budget_item_id)
    activity.projected_expense = proposed_changes.get('projected_expense', activity.projected_expense)
    activity.actual_expense = proposed_changes.get('actual_expense', activity.actual_expense)
    activity.save()
    return activity


def _update_personnel(entity_id, proposed_changes, current_state):
    """Update an existing Personnel."""
    personnel = get_object_or_404(Personnel, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if personnel.first_name != current_state.get('first_name') or personnel.last_name != current_state.get('last_name'):
            raise ValidationError("Current state mismatch. Personnel has been modified.")
    
    # Validate role and department exist if provided
    if 'role' in proposed_changes and proposed_changes['role']:
        get_object_or_404(Role, pk=proposed_changes['role'])
    if 'department' in proposed_changes and proposed_changes['department']:
        get_object_or_404(Department, pk=proposed_changes['department'])
    
    personnel.first_name = proposed_changes.get('first_name', personnel.first_name)
    personnel.last_name = proposed_changes.get('last_name', personnel.last_name)
    personnel.role_id = proposed_changes.get('role', personnel.role_id)
    personnel.department_id = proposed_changes.get('department', personnel.department_id)
    personnel.employment_status = proposed_changes.get('employment_status', personnel.employment_status)
    personnel.save()
    return personnel


def _update_budget_item(entity_id, proposed_changes, current_state):
    """Update an existing BudgetLineItem."""
    budget_item = get_object_or_404(BudgetLineItem, pk=entity_id)
    
    # Budget items can't really be updated (name is unique with project)
    # This would typically be a no-op or error
    raise ValidationError("BudgetLineItem updates are not supported. Create a new one instead.")


def _update_compensation(entity_id, proposed_changes, current_state):
    """Update an existing Compensation."""
    compensation = get_object_or_404(Compensation, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if compensation.type != current_state.get('type') or compensation.personnel_id != current_state.get('personnel'):
            raise ValidationError("Current state mismatch. Compensation has been modified.")
    
    # Validate budget_item exists if provided
    if 'budget_item' in proposed_changes and proposed_changes['budget_item']:
        get_object_or_404(BudgetLineItem, pk=proposed_changes['budget_item'])
    
    compensation.type = proposed_changes.get('type', compensation.type)
    compensation.budget_item_id = proposed_changes.get('budget_item', compensation.budget_item_id)
    compensation.reason = proposed_changes.get('reason', compensation.reason)
    compensation.monthly_rate = proposed_changes.get('monthly_rate', compensation.monthly_rate)
    compensation.duration_months = proposed_changes.get('duration_months', compensation.duration_months)
    compensation.amount = proposed_changes.get('amount', compensation.amount)
    compensation.date_effective = proposed_changes.get('date_effective', compensation.date_effective)
    
    # Check uniqueness if type or personnel changed
    if 'type' in proposed_changes or 'personnel' in proposed_changes:
        new_type = proposed_changes.get('type', compensation.type)
        new_personnel_id = proposed_changes.get('personnel', compensation.personnel_id)
        if Compensation.objects.filter(type=new_type, personnel_id=new_personnel_id).exclude(pk=compensation.pk).exists():
            raise ValidationError(f"Compensation with type {new_type} already exists for this personnel")
    
    compensation.save()
    return compensation


def _update_project(entity_id, proposed_changes, current_state):
    """Update an existing Project."""
    project = get_object_or_404(Project, pk=entity_id)
    
    # Validate current_state matches only for fields that are being changed
    # This allows partial updates (e.g., only updating project_status)
    if current_state and proposed_changes:
        # Check only the fields that are in proposed_changes
        for field in proposed_changes.keys():
            if field in current_state:
                current_value = getattr(project, field, None)
                # Handle special cases
                if field == 'grant_amount':
                    # Compare as float for grant_amount
                    current_val = float(current_value) if current_value is not None else 0.0
                    state_val = float(current_state.get(field, 0)) if current_state.get(field) is not None else 0.0
                    if abs(current_val - state_val) > 0.01:
                        raise ValidationError(f"Current state mismatch. Project {field} has been modified.")
                else:
                    # For other fields, compare directly
                    if str(current_value) != str(current_state.get(field)):
                        raise ValidationError(f"Current state mismatch. Project {field} has been modified.")
    
    # Update only the fields that are in proposed_changes
    if 'name' in proposed_changes:
        project.name = proposed_changes.get('name')
    if 'project_leader' in proposed_changes:
        project.project_leader = proposed_changes.get('project_leader')
    if 'description' in proposed_changes:
        project.description = proposed_changes.get('description')
    if 'grant_amount' in proposed_changes:
        project.grant_amount = proposed_changes.get('grant_amount')
    if 'project_status' in proposed_changes:
        project.project_status = proposed_changes.get('project_status')
    if 'date_start' in proposed_changes:
        project.date_start = proposed_changes.get('date_start')
    if 'date_end' in proposed_changes:
        project.date_end = proposed_changes.get('date_end')
    
    project.full_clean()  # This will validate date_start <= date_end
    project.save()
    return project


def _update_role(entity_id, proposed_changes, current_state):
    """Update an existing Role."""
    role = get_object_or_404(Role, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if role.name != current_state.get('name', ''):
            raise ValidationError("Current state mismatch. Role has been modified.")
    
    new_name = proposed_changes.get('name', role.name)
    
    # Check uniqueness if name changed
    if new_name != role.name:
        if Role.objects.filter(project=role.project, name=new_name).exists():
            raise ValidationError(f"Role with name {new_name} already exists for this project")
    
    role.name = new_name
    role.save()
    return role


def _update_department(entity_id, proposed_changes, current_state):
    """Update an existing Department."""
    department = get_object_or_404(Department, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if department.name != current_state.get('name', ''):
            raise ValidationError("Current state mismatch. Department has been modified.")
    
    new_name = proposed_changes.get('name', department.name)
    
    # Check uniqueness if name changed
    if new_name != department.name:
        if Department.objects.filter(project=department.project, name=new_name).exists():
            raise ValidationError(f"Department with name {new_name} already exists for this project")
    
    department.name = new_name
    department.save()
    return department


# DELETE operations
def _delete_objective(entity_id, current_state):
    """Delete an existing Objective."""
    objective = get_object_or_404(Objective, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if objective.title != current_state.get('title'):
            raise ValidationError("Current state mismatch. Objective has been modified.")
    
    objective.delete()
    return None


def _delete_activity(entity_id, current_state):
    """Delete an existing Activity."""
    activity = get_object_or_404(Activity, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if activity.title != current_state.get('title'):
            raise ValidationError("Current state mismatch. Activity has been modified.")
    
    activity.delete()
    return None


def _delete_personnel(entity_id, current_state):
    """Delete an existing Personnel."""
    personnel = get_object_or_404(Personnel, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if personnel.first_name != current_state.get('first_name') or personnel.last_name != current_state.get('last_name'):
            raise ValidationError("Current state mismatch. Personnel has been modified.")
    
    personnel.delete()
    return None


def _delete_budget_item(entity_id, current_state):
    """Delete an existing BudgetLineItem."""
    budget_item = get_object_or_404(BudgetLineItem, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if budget_item.name != current_state.get('name'):
            raise ValidationError("Current state mismatch. BudgetLineItem has been modified.")
    
    budget_item.delete()
    return None


def _delete_compensation(entity_id, current_state):
    """Delete an existing Compensation."""
    compensation = get_object_or_404(Compensation, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if compensation.type != current_state.get('type') or compensation.personnel_id != current_state.get('personnel'):
            raise ValidationError("Current state mismatch. Compensation has been modified.")
    
    compensation.delete()
    return None


def _delete_project(entity_id, current_state):
    """Delete an existing Project."""
    project = get_object_or_404(Project, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if project.name != current_state.get('name'):
            raise ValidationError("Current state mismatch. Project has been modified.")
    
    project.delete()
    return None


def _delete_role(entity_id, current_state):
    """Delete an existing Role."""
    role = get_object_or_404(Role, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if role.name != current_state.get('name', ''):
            raise ValidationError("Current state mismatch. Role has been modified.")
    
    role.delete()
    return None


def _delete_department(entity_id, current_state):
    """Delete an existing Department."""
    department = get_object_or_404(Department, pk=entity_id)
    
    # Validate current_state matches (optional check)
    if current_state:
        if department.name != current_state.get('name', ''):
            raise ValidationError("Current state mismatch. Department has been modified.")
    
    department.delete()
    return None

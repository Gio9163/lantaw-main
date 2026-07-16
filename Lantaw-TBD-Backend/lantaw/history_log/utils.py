"""
Utility functions for reverting history log entries.
"""
from django.db import transaction
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404

from activities.models import Objective, Activity
from personnel.models import Personnel, Role, Department
from budget.models import BudgetLineItem, Compensation
from projects.models import Project


def revert_history_entry(history_log_entry):
    """
    Revert a history log entry by applying old_state.
    Handles CREATE (delete entity), UPDATE (restore old values), DELETE (recreate entity).
    """
    action = history_log_entry.action
    change_type = history_log_entry.change_type
    old_state = history_log_entry.old_state
    new_state = history_log_entry.new_state
    entity_id = history_log_entry.entity_id
    project = history_log_entry.project
    
    if action == 'CREATE':
        # To revert a CREATE, we need to delete the entity
        return _delete_entity_for_revert(change_type, entity_id, new_state)
    elif action == 'UPDATE':
        # To revert an UPDATE, we restore old_state
        return _restore_old_state(change_type, entity_id, old_state)
    elif action == 'DELETE':
        # To revert a DELETE, we recreate the entity from old_state
        return _recreate_entity(change_type, project, old_state)
    elif action == 'REVERT':
        # Can't revert a revert - this would be a double revert
        raise ValidationError("Cannot revert a revert action")
    else:
        raise ValidationError(f"Invalid action for revert: {action}")


def _delete_entity_for_revert(change_type, entity_id, new_state):
    """Delete an entity that was created (reverting a CREATE)."""
    if change_type == 'OBJECTIVE':
        objective = get_object_or_404(Objective, pk=entity_id)
        objective.delete()
        return None
    elif change_type == 'ACTIVITY':
        activity = get_object_or_404(Activity, pk=entity_id)
        activity.delete()
        return None
    elif change_type == 'PERSONNEL':
        personnel = get_object_or_404(Personnel, pk=entity_id)
        personnel.delete()
        return None
    elif change_type == 'BUDGET':
        budget_item = get_object_or_404(BudgetLineItem, pk=entity_id)
        budget_item.delete()
        return None
    elif change_type == 'COMPENSATION':
        compensation = get_object_or_404(Compensation, pk=entity_id)
        compensation.delete()
        return None
    elif change_type == 'ROLE':
        role = get_object_or_404(Role, pk=entity_id)
        role.delete()
        return None
    elif change_type == 'DEPARTMENT':
        department = get_object_or_404(Department, pk=entity_id)
        department.delete()
        return None
    else:
        raise ValidationError(f"Invalid change type for DELETE revert: {change_type}")


def _restore_old_state(change_type, entity_id, old_state):
    """Restore old_state values to an existing entity (reverting an UPDATE)."""
    if not old_state:
        raise ValidationError("old_state is required to revert an UPDATE")
    
    if change_type == 'OBJECTIVE':
        objective = get_object_or_404(Objective, pk=entity_id)
        objective.title = old_state.get('title', objective.title)
        objective.description = old_state.get('description', objective.description)
        objective.save()
        return objective
    elif change_type == 'ACTIVITY':
        activity = get_object_or_404(Activity, pk=entity_id)
        activity.title = old_state.get('title', activity.title)
        activity.activity_status = old_state.get('activity_status', activity.activity_status)
        activity.activity_budget_item_id = old_state.get('activity_budget_item', activity.activity_budget_item_id)
        activity.projected_expense = old_state.get('projected_expense', activity.projected_expense)
        activity.actual_expense = old_state.get('actual_expense', activity.actual_expense)
        activity.save()
        return activity
    elif change_type == 'PERSONNEL':
        personnel = get_object_or_404(Personnel, pk=entity_id)
        personnel.first_name = old_state.get('first_name', personnel.first_name)
        personnel.last_name = old_state.get('last_name', personnel.last_name)
        personnel.role_id = old_state.get('role', personnel.role_id)
        personnel.department_id = old_state.get('department', personnel.department_id)
        personnel.employment_status = old_state.get('employment_status', personnel.employment_status)
        personnel.save()
        return personnel
    elif change_type == 'BUDGET':
        budget_item = get_object_or_404(BudgetLineItem, pk=entity_id)
        budget_item.name = old_state.get('name', budget_item.name)
        budget_item.amount = old_state.get('amount', budget_item.amount)
        budget_item.save()
        return budget_item
    elif change_type == 'COMPENSATION':
        compensation = get_object_or_404(Compensation, pk=entity_id)
        compensation.type = old_state.get('type', compensation.type)
        compensation.budget_item_id = old_state.get('budget_item', compensation.budget_item_id)
        compensation.personnel_id = old_state.get('personnel', compensation.personnel_id)
        compensation.reason = old_state.get('reason', compensation.reason)
        compensation.amount = old_state.get('amount', compensation.amount)
        compensation.date_effective = old_state.get('date_effective', compensation.date_effective)
        compensation.save()
        return compensation
    elif change_type == 'ROLE':
        role = get_object_or_404(Role, pk=entity_id)
        role.name = old_state.get('name', role.name)
        role.save()
        return role
    elif change_type == 'DEPARTMENT':
        department = get_object_or_404(Department, pk=entity_id)
        department.name = old_state.get('name', department.name)
        department.save()
        return department
    else:
        raise ValidationError(f"Invalid change type for UPDATE revert: {change_type}")


def _recreate_entity(change_type, project, old_state):
    """Recreate an entity from old_state (reverting a DELETE)."""
    if not old_state:
        raise ValidationError("old_state is required to revert a DELETE")
    
    if change_type == 'OBJECTIVE':
        objective = Objective.objects.create(
            project=project,
            title=old_state.get('title'),
            description=old_state.get('description', '')
        )
        return objective
    elif change_type == 'ACTIVITY':
        objective_id = old_state.get('objective')
        if not objective_id:
            raise ValidationError("objective is required for Activity")
        objective = get_object_or_404(Objective, pk=objective_id, project=project)
        activity = Activity.objects.create(
            objective=objective,
            title=old_state.get('title'),
            activity_status=old_state.get('activity_status', 'PENDING'),
            activity_budget_item_id=old_state.get('activity_budget_item'),
            projected_expense=old_state.get('projected_expense'),
            actual_expense=old_state.get('actual_expense')
        )
        return activity
    elif change_type == 'PERSONNEL':
        personnel = Personnel.objects.create(
            project=project,
            first_name=old_state.get('first_name'),
            last_name=old_state.get('last_name'),
            role_id=old_state.get('role'),
            department_id=old_state.get('department'),
            employment_status=old_state.get('employment_status', 'ACTIVE')
        )
        return personnel
    elif change_type == 'BUDGET':
        budget_item = BudgetLineItem.objects.create(
            project=project,
            name=old_state.get('name'),
            amount=old_state.get('amount')
        )
        return budget_item
    elif change_type == 'COMPENSATION':
        budget_item_id = old_state.get('budget_item')
        personnel_id = old_state.get('personnel')
        if not budget_item_id or not personnel_id:
            raise ValidationError("budget_item and personnel are required for Compensation")
        budget_item = get_object_or_404(BudgetLineItem, pk=budget_item_id, project=project)
        personnel = get_object_or_404(Personnel, pk=personnel_id, project=project)
        compensation = Compensation.objects.create(
            budget_item=budget_item,
            personnel=personnel,
            type=old_state.get('type'),
            reason=old_state.get('reason', ''),
            amount=old_state.get('amount'),
            date_effective=old_state.get('date_effective')
        )
        return compensation
    elif change_type == 'ROLE':
        role = Role.objects.create(
            project=project,
            name=old_state.get('name')
        )
        return role
    elif change_type == 'DEPARTMENT':
        department = Department.objects.create(
            project=project,
            name=old_state.get('name')
        )
        return department
    else:
        raise ValidationError(f"Invalid change type for DELETE revert: {change_type}")


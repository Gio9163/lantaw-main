from django.utils import timezone

from projects.models import ProjectMembers
from .models import HistoryLog


def get_user_project_context_description(user, action='logged in'):
    """Build a descriptive text for login/logout history entries based on the user's project access."""
    if not user or not getattr(user, 'is_authenticated', False):
        return f"User {action}"

    display_name = user.get_full_name() or user.email or 'User'
    action_text = action.lower()

    if getattr(user, 'role', None) == 'ADMIN':
        return f"{display_name} {action_text}\nAccess Level:\nSystem Administrator\nAccessible Projects:\nALL"

    projects = list(
        ProjectMembers.objects.filter(user=user)
        .select_related('project')
        .order_by('project__name')
    )

    if not projects:
        return f"{display_name} {action_text}\nNo project assigned"

    project_names = [membership.project.name for membership in projects if membership.project]
    if len(project_names) == 1:
        return f"{display_name} {action_text}\nCurrent Project:\n{project_names[0]}"

    return f"{display_name} {action_text}\nAssigned Projects:\n" + "\n".join(project_names)


def log_history(
    user=None,
    action='CREATE',
    module='GENERAL',
    project=None,
    object_name=None,
    description=None,
    change_type=None,
    entity_id=None,
    old_state=None,
    new_state=None,
    related_change_request=None,
    **kwargs,
):
    """Create a reusable history log entry for authenticated user actions."""
    if not user or not getattr(user, 'is_authenticated', False):
        return None

    action_value = str(action or 'CREATE').upper()
    module_value = str(module or 'GENERAL').upper()
    change_type_value = str(change_type or module_value).upper()
    user_role = getattr(user, 'role', None)

    if not description:
        description = f"{action_value.title()} {module_value.lower()}"

    if not object_name:
        object_name = kwargs.get('object_name') or kwargs.get('title') or getattr(project, 'name', None) or None

    return HistoryLog.objects.create(
        timestamp=kwargs.get('timestamp') or timezone.now(),
        user=user,
        action=action_value,
        change_type=change_type_value,
        module=module_value,
        description=description,
        project=project,
        object_name=object_name,
        entity_id=entity_id,
        old_state=old_state,
        new_state=new_state,
        related_change_request=related_change_request,
        user_role=user_role,
    )

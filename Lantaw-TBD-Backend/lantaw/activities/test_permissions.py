from datetime import date

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from activities.models import Activity, Objective
from projects.models import Project, ProjectMembers
from users.models import User


def create_project(name):
    return Project.objects.create(
        name=name,
        project_leader="Test Leader",
        description="Permission test project",
        grant_amount=1000,
        project_status="ACTIVE",
        date_start=date(2026, 1, 1),
        date_end=date(2026, 12, 31),
    )


@pytest.fixture
def activity_scope(db):
    assigned_project = create_project("Assigned Project")
    other_project = create_project("Other Project")
    assigned_objective = Objective.objects.create(
        project=assigned_project,
        title="Assigned Objective",
    )
    other_objective = Objective.objects.create(
        project=other_project,
        title="Other Objective",
    )
    Activity.objects.create(objective=assigned_objective, title="Assigned Activity")
    Activity.objects.create(objective=other_objective, title="Other Activity")
    return assigned_project, assigned_objective, other_project, other_objective


@pytest.mark.django_db
def test_objective_and_activity_reads_require_authentication(activity_scope):
    project, objective, _, _ = activity_scope
    client = APIClient()

    assert client.get(f"/api/projects/{project.id}/objectives/").status_code == status.HTTP_401_UNAUTHORIZED
    assert (
        client.get(f"/api/projects/{project.id}/objectives/{objective.id}/activities/").status_code
        == status.HTTP_401_UNAUTHORIZED
    )
    assert client.get("/api/objectives/").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.get("/api/activities/").status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize("role", ["EXECUTIVE", "PROJECT_STAFF"])
@pytest.mark.django_db
def test_project_users_only_read_objectives_and_activities_for_their_membership(role, activity_scope):
    assigned_project, assigned_objective, other_project, other_objective = activity_scope
    user = User.objects.create_user(
        email=f"{role.lower()}@example.com",
        password="TestPass123!",
        role=role,
    )
    ProjectMembers.objects.create(project=assigned_project, user=user)
    client = APIClient()
    client.force_authenticate(user=user)

    assigned_objectives = client.get(f"/api/projects/{assigned_project.id}/objectives/")
    assigned_activities = client.get(
        f"/api/projects/{assigned_project.id}/objectives/{assigned_objective.id}/activities/"
    )
    other_objectives = client.get(f"/api/projects/{other_project.id}/objectives/")
    other_activities = client.get(
        f"/api/projects/{other_project.id}/objectives/{other_objective.id}/activities/"
    )

    assert assigned_objectives.status_code == status.HTTP_200_OK
    assert assigned_objectives.data["count"] == 1
    assert assigned_activities.status_code == status.HTTP_200_OK
    assert assigned_activities.data["count"] == 1
    assert other_objectives.status_code == status.HTTP_200_OK
    assert other_objectives.data["count"] == 0
    assert other_activities.status_code == status.HTTP_200_OK
    assert other_activities.data["count"] == 0


@pytest.mark.django_db
def test_nested_activity_route_rejects_mismatched_project_and_objective(admin_user, activity_scope):
    assigned_project, _, _, other_objective = activity_scope
    client = APIClient()
    client.force_authenticate(user=admin_user)

    response = client.get(
        f"/api/projects/{assigned_project.id}/objectives/{other_objective.id}/activities/"
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 0

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from projects.models import Project, ProjectMembers
from users.models import User


@pytest.fixture
def executive_user(db):
    return User.objects.create_user(
        email="executive@example.com",
        password="ExecutivePass123!",
        role="EXECUTIVE",
    )


@pytest.mark.django_db
def test_admin_has_read_only_project_access(admin_user, sample_project):
    client = APIClient()
    client.force_authenticate(user=admin_user)

    assert client.get(f"/api/projects/{sample_project.id}/").status_code == status.HTTP_200_OK
    response = client.patch(
        f"/api/projects/{sample_project.id}/",
        {"name": "Admin must not edit"},
        format="json",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    sample_project.refresh_from_db()
    assert sample_project.name != "Admin must not edit"


@pytest.mark.django_db
def test_assigned_staff_write_creates_change_request_without_mutating_project(staff_user, sample_project):
    ProjectMembers.objects.create(user=staff_user, project=sample_project)
    client = APIClient()
    client.force_authenticate(user=staff_user)

    response = client.patch(
        f"/api/projects/{sample_project.id}/",
        {"name": "Proposed project name"},
        format="json",
    )

    assert response.status_code == status.HTTP_202_ACCEPTED
    assert response.data["status"] == "PENDING"
    assert response.data["change_type"] == "PROJECT"
    sample_project.refresh_from_db()
    assert sample_project.name != "Proposed project name"


@pytest.mark.django_db
def test_staff_cannot_approve_change_request(staff_user, sample_project):
    ProjectMembers.objects.create(user=staff_user, project=sample_project)
    client = APIClient()
    client.force_authenticate(user=staff_user)
    created = client.post(
        f"/api/projects/{sample_project.id}/change-requests/",
        {
            "project": sample_project.id,
            "change_type": "PROJECT",
            "operation": "UPDATE",
            "entity_id": sample_project.id,
            "current_state": {"name": sample_project.name},
            "proposed_changes": {"name": "Proposed"},
        },
        format="json",
    )
    assert created.status_code == status.HTTP_201_CREATED

    response = client.post(
        f"/api/projects/{sample_project.id}/change-requests/{created.data['id']}/approve/",
        {},
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_executive_has_read_only_assigned_project_access(executive_user, sample_project):
    ProjectMembers.objects.create(user=executive_user, project=sample_project)
    client = APIClient()
    client.force_authenticate(user=executive_user)

    assert client.get(f"/api/projects/{sample_project.id}/").status_code == status.HTTP_200_OK
    response = client.delete(f"/api/projects/{sample_project.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert Project.objects.filter(pk=sample_project.pk).exists()

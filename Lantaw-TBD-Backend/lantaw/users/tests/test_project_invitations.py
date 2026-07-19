from datetime import date, timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from history_log.models import HistoryLog
from projects.models import Project, ProjectMembers
from projects.models import ProjectPersonnel
from personnel.models import Department, Personnel, Role
from users.models import ProjectInvitation, RegistrationRequest, User


@pytest.fixture
def invitation_admin(db):
    return User.objects.create_user(
        email="invite-admin@example.com",
        password="AdminPass123!",
        role="ADMIN",
    )


@pytest.fixture
def invitation_staff(db):
    return User.objects.create_user(
        email="inviter@example.com",
        password="StaffPass123!",
        role="PROJECT_STAFF",
        first_name="Project",
        last_name="Inviter",
    )


@pytest.fixture
def invitation_project(db):
    return Project.objects.create(
        name="Invitation Project",
        project_leader="Leader",
        date_start=date(2026, 1, 1),
        date_end=date(2026, 12, 31),
    )


def create_payload(email="invitee@example.com", role="PROJECT_STAFF"):
    return {
        "email": email,
        "allowed_role": role,
        "expires_at": (timezone.now() + timedelta(days=7)).isoformat(),
        "message": "Welcome to the project.",
    }


def make_invitation(project, creator, **overrides):
    values = {
        "code": "secure-test-token",
        "email": "invitee@example.com",
        "project": project,
        "allowed_role": "PROJECT_STAFF",
        "created_by": creator,
        "expires_at": timezone.now() + timedelta(days=7),
        "max_uses": 1,
    }
    values.update(overrides)
    return ProjectInvitation.objects.create(**values)


@pytest.mark.django_db
@pytest.mark.parametrize("role", ["PROJECT_STAFF", "EXECUTIVE"])
def test_assigned_staff_can_create_project_bound_secure_invitation(
    api_client, invitation_staff, invitation_project, role
):
    ProjectMembers.objects.create(user=invitation_staff, project=invitation_project)
    api_client.force_authenticate(invitation_staff)

    response = api_client.post(
        reverse("project-invitations-list", args=[invitation_project.id]),
        create_payload(role=role),
    )

    assert response.status_code == status.HTTP_201_CREATED
    invitation = ProjectInvitation.objects.get(pk=response.data["id"])
    assert invitation.project == invitation_project
    assert invitation.created_by == invitation_staff
    assert invitation.allowed_role == role
    assert invitation.max_uses == 1
    assert len(invitation.code) >= 32
    assert invitation.code != str(invitation.id)


@pytest.mark.django_db
def test_unassigned_staff_cannot_create_or_target_another_project(
    api_client, invitation_staff, invitation_project
):
    assigned_project = Project.objects.create(
        name="Assigned Project",
        project_leader="Leader",
        date_start=date(2026, 1, 1),
        date_end=date(2026, 12, 31),
    )
    ProjectMembers.objects.create(user=invitation_staff, project=assigned_project)
    api_client.force_authenticate(invitation_staff)

    response = api_client.post(
        reverse("project-invitations-list", args=[invitation_project.id]),
        {**create_payload(), "project": assigned_project.id},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert not ProjectInvitation.objects.exists()


@pytest.mark.django_db
def test_staff_cannot_invite_admin(api_client, invitation_staff, invitation_project):
    ProjectMembers.objects.create(user=invitation_staff, project=invitation_project)
    api_client.force_authenticate(invitation_staff)
    response = api_client.post(
        reverse("project-invitations-list", args=[invitation_project.id]),
        create_payload(role="ADMIN"),
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_generated_invitation_tokens_are_unique(
    api_client, invitation_staff, invitation_project
):
    ProjectMembers.objects.create(user=invitation_staff, project=invitation_project)
    api_client.force_authenticate(invitation_staff)
    first = api_client.post(
        reverse("project-invitations-list", args=[invitation_project.id]),
        create_payload(email="first@example.com"),
    )
    second = api_client.post(
        reverse("project-invitations-list", args=[invitation_project.id]),
        create_payload(email="second@example.com"),
    )
    assert first.status_code == status.HTTP_201_CREATED
    assert second.status_code == status.HTTP_201_CREATED
    assert first.data["code"] != second.data["code"]


@pytest.mark.django_db
@pytest.mark.parametrize("state", ["expired", "revoked", "used"])
def test_unavailable_invitation_cannot_be_validated(
    api_client, invitation_staff, invitation_project, state
):
    values = {}
    if state == "expired":
        values["expires_at"] = timezone.now() - timedelta(seconds=1)
    elif state == "revoked":
        values.update({"is_active": False, "revoked_at": timezone.now()})
    else:
        values["used_count"] = 1
    invitation = make_invitation(invitation_project, invitation_staff, **values)

    response = api_client.get(reverse("invitation-validate", args=[invitation.code]))
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_email_specific_invitation_rejects_different_registrant(
    api_client, invitation_staff, invitation_project
):
    invitation = make_invitation(invitation_project, invitation_staff)
    response = api_client.post(
        reverse("register"),
        {
            "first_name": "Wrong",
            "last_name": "Person",
            "email": "wrong@example.com",
            "password": "StrongPass123!",
            "requested_role": "PROJECT_STAFF",
            "invitation_code": invitation.code,
        },
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert not User.objects.filter(email="wrong@example.com").exists()


@pytest.mark.django_db
def test_invited_registration_is_pending_and_creates_no_membership(
    api_client, invitation_staff, invitation_project
):
    invitation = make_invitation(invitation_project, invitation_staff)
    response = api_client.post(
        reverse("register"),
        {
            "first_name": "Invited",
            "last_name": "Staff",
            "email": invitation.email,
            "password": "StrongPass123!",
            "requested_role": "PROJECT_STAFF",
            "invitation_code": invitation.code,
        },
    )
    assert response.status_code == status.HTTP_201_CREATED
    user = User.objects.get(email=invitation.email)
    invitation.refresh_from_db()
    assert user.check_password("StrongPass123!")
    assert not user.is_active
    assert user.role is None
    assert invitation.accepted_at is not None
    assert not ProjectMembers.objects.filter(user=user).exists()


@pytest.mark.django_db
def test_admin_approval_creates_one_membership_for_executive(
    api_client, invitation_admin, invitation_staff, invitation_project
):
    invitation = make_invitation(
        invitation_project,
        invitation_staff,
        email="executive@example.com",
        allowed_role="EXECUTIVE",
    )
    api_client.post(
        reverse("register"),
        {
            "first_name": "Invited", "last_name": "Executive",
            "email": invitation.email, "password": "StrongPass123!",
            "requested_role": "EXECUTIVE", "invitation_code": invitation.code,
        },
    )
    registration_request = RegistrationRequest.objects.get()
    api_client.force_authenticate(invitation_admin)
    first = api_client.post(
        reverse("registration-request-approve", args=[registration_request.id])
    )
    second = api_client.post(
        reverse("registration-request-approve", args=[registration_request.id])
    )
    assert first.status_code == status.HTTP_200_OK
    assert second.status_code == status.HTTP_400_BAD_REQUEST
    assert ProjectMembers.objects.filter(
        user=registration_request.user, project=invitation_project
    ).count() == 1


@pytest.mark.django_db
def test_existing_matching_user_can_accept_for_admin_review(
    api_client, invitation_staff, invitation_project
):
    existing = User.objects.create_user(
        email="existing@example.com",
        password="ExistingPass123!",
        role="EXECUTIVE",
    )
    invitation = make_invitation(
        invitation_project,
        invitation_staff,
        email=existing.email,
        allowed_role="EXECUTIVE",
    )
    api_client.force_authenticate(existing)
    response = api_client.post(reverse("invitation-accept", args=[invitation.code]))

    assert response.status_code == status.HTTP_201_CREATED
    request = RegistrationRequest.objects.get(user=existing, project=invitation_project)
    assert request.existing_user is True
    assert request.status == "PENDING"
    assert not ProjectMembers.objects.filter(user=existing, project=invitation_project).exists()


@pytest.mark.django_db
def test_staff_can_revoke_only_own_unused_same_project_invitation(
    api_client, invitation_staff, invitation_project
):
    ProjectMembers.objects.create(user=invitation_staff, project=invitation_project)
    own = make_invitation(invitation_project, invitation_staff)
    other_staff = User.objects.create_user(
        email="other@example.com", password="OtherPass123!", role="PROJECT_STAFF"
    )
    other = make_invitation(
        invitation_project,
        other_staff,
        code="other-secure-token",
        email="other-invitee@example.com",
    )
    api_client.force_authenticate(invitation_staff)

    forbidden = api_client.post(
        reverse("project-invitations-revoke", args=[invitation_project.id, other.id])
    )
    revoked = api_client.post(
        reverse("project-invitations-revoke", args=[invitation_project.id, own.id])
    )
    assert forbidden.status_code == status.HTTP_403_FORBIDDEN
    assert revoked.status_code == status.HTTP_200_OK
    own.refresh_from_db()
    assert own.revoked_at is not None
    assert not own.is_active


@pytest.mark.django_db
def test_history_logs_mask_full_invitation_token(
    api_client, invitation_staff, invitation_project
):
    ProjectMembers.objects.create(user=invitation_staff, project=invitation_project)
    api_client.force_authenticate(invitation_staff)
    response = api_client.post(
        reverse("project-invitations-list", args=[invitation_project.id]),
        create_payload(),
    )
    token = response.data["code"]
    log_text = " ".join(
        f"{entry.description} {entry.new_state}" for entry in HistoryLog.objects.all()
    )
    assert token not in log_text
    assert f"{token[:6]}..." in log_text


@pytest.mark.django_db
def test_existing_personnel_endpoint_remains_available(
    api_client, invitation_staff, invitation_project
):
    ProjectMembers.objects.create(user=invitation_staff, project=invitation_project)
    role = Role.objects.create(name="Project Staff Level 3", project=invitation_project)
    department = Department.objects.create(name="Operations", project=invitation_project)
    person = Personnel.objects.create(
        first_name="Operational",
        last_name="Personnel",
        role=role,
        department=department,
    )
    ProjectPersonnel.objects.create(project=invitation_project, personnel=person)
    api_client.force_authenticate(invitation_staff)

    response = api_client.get(
        reverse("project-personnel-list", args=[invitation_project.id])
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.data.get("results", response.data)
    assert any(item["id"] == person.id for item in data)

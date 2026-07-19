import json
from datetime import date, timedelta

import pytest
from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from change_requests.models import ChangeRequest
from history_log.models import HistoryLog
from projects.models import Project, ProjectMembers
from users.models import ProjectInvitation, RegistrationRequest, User


@pytest.fixture
def registration_project(db):
    return Project.objects.create(
        name="Registration Project",
        project_leader="Project Leader",
        description="Invitation-scoped registration project",
        grant_amount="1000.00",
        project_status="ACTIVE",
        date_start=date(2026, 1, 1),
        date_end=date(2026, 12, 31),
    )


@pytest.fixture
def registration_admin(db):
    return User.objects.create_user(
        email="registration-admin@example.com",
        password="AdminPass123!",
        first_name="Registration",
        last_name="Admin",
        role="ADMIN",
    )


def make_invitation(project, admin, role, code, **overrides):
    values = {
        "project": project,
        "created_by": admin,
        "allowed_role": role,
        "is_active": True,
        "expires_at": timezone.now() + timedelta(days=30),
        "max_uses": 5,
    }
    values.update(overrides)
    return ProjectInvitation.objects.create(code=code, **values)


def registration_payload(role, code, email="new.user@example.com"):
    return {
        "first_name": "New",
        "last_name": "User",
        "email": email,
        "password": "StrongPass123!",
        "requested_role": role,
        "invitation_code": code,
    }


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("role", "code"),
    [("PROJECT_STAFF", "STAFF-CODE"), ("EXECUTIVE", "EXEC-CODE")],
)
def test_valid_registration_creates_inactive_pending_user_without_membership(
    api_client, registration_project, registration_admin, role, code
):
    make_invitation(registration_project, registration_admin, role, code)
    response = api_client.post(reverse("register"), registration_payload(role, code))

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["status"] == "PENDING"
    assert response.data["requested_role"] == role
    user = User.objects.get(email="new.user@example.com")
    assert user.check_password("StrongPass123!")
    assert user.role is None
    assert user.account_status == "PENDING_APPROVAL"
    assert user.is_active is False
    assert not ProjectMembers.objects.filter(user=user).exists()
    request = RegistrationRequest.objects.get(user=user)
    assert request.project == registration_project
    assert request.requested_role == role


@pytest.mark.django_db
def test_admin_role_cannot_be_requested(api_client, registration_project, registration_admin):
    make_invitation(registration_project, registration_admin, "PROJECT_STAFF", "STAFF-CODE")
    response = api_client.post(
        reverse("register"), registration_payload("ADMIN", "STAFF-CODE")
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert not User.objects.filter(email="new.user@example.com").exists()


@pytest.mark.django_db
def test_invalid_expired_and_role_mismatched_invitations_are_rejected(
    api_client, registration_project, registration_admin
):
    expired = make_invitation(
        registration_project,
        registration_admin,
        "PROJECT_STAFF",
        "EXPIRED-CODE",
        expires_at=timezone.now() - timedelta(minutes=1),
    )
    invalid = api_client.post(
        reverse("register"), registration_payload("PROJECT_STAFF", "UNKNOWN")
    )
    expired_response = api_client.post(
        reverse("register"), registration_payload("PROJECT_STAFF", expired.code)
    )
    mismatch = api_client.post(
        reverse("register"), registration_payload("EXECUTIVE", expired.code)
    )

    assert invalid.status_code == status.HTTP_400_BAD_REQUEST
    assert expired_response.status_code == status.HTTP_400_BAD_REQUEST
    assert mismatch.status_code == status.HTTP_400_BAD_REQUEST
    assert User.objects.count() == 1


@pytest.mark.django_db
def test_pending_user_cannot_obtain_tokens_or_access_project(
    api_client, registration_project, registration_admin
):
    make_invitation(registration_project, registration_admin, "PROJECT_STAFF", "STAFF-CODE")
    api_client.post(
        reverse("register"), registration_payload("PROJECT_STAFF", "STAFF-CODE")
    )

    token = api_client.post(
        reverse("token_obtain_pair"),
        {"email": "new.user@example.com", "password": "StrongPass123!"},
    )
    project = api_client.get(reverse("project-detail", args=[registration_project.id]))

    assert token.status_code == status.HTTP_401_UNAUTHORIZED
    assert "awaiting Administrator approval" in token.data["detail"]
    assert project.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
@pytest.mark.parametrize("reviewer_role", ["EXECUTIVE", "PROJECT_STAFF"])
def test_non_admin_cannot_approve_registration(
    api_client, registration_project, registration_admin, reviewer_role
):
    invitation = make_invitation(
        registration_project, registration_admin, "PROJECT_STAFF", "STAFF-CODE"
    )
    api_client.post(
        reverse("register"), registration_payload("PROJECT_STAFF", invitation.code)
    )
    registration_request = RegistrationRequest.objects.get()
    reviewer = User.objects.create_user(
        email=f"{reviewer_role.lower()}@example.com",
        password="ReviewerPass123!",
        role=reviewer_role,
    )
    api_client.force_authenticate(reviewer)

    response = api_client.post(
        reverse("registration-request-approve", args=[registration_request.id])
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    registration_request.refresh_from_db()
    assert registration_request.status == "PENDING"


@pytest.mark.django_db
@pytest.mark.parametrize("requested_role", ["EXECUTIVE", "PROJECT_STAFF"])
def test_admin_approval_activates_role_membership_and_increments_invitation_once(
    api_client, registration_project, registration_admin, requested_role
):
    code = f"{requested_role}-CODE"
    invitation = make_invitation(
        registration_project, registration_admin, requested_role, code
    )
    api_client.post(reverse("register"), registration_payload(requested_role, code))
    registration_request = RegistrationRequest.objects.get()
    api_client.force_authenticate(registration_admin)

    first = api_client.post(
        reverse("registration-request-approve", args=[registration_request.id])
    )
    second = api_client.post(
        reverse("registration-request-approve", args=[registration_request.id])
    )

    assert first.status_code == status.HTTP_200_OK
    assert second.status_code == status.HTTP_400_BAD_REQUEST
    registration_request.refresh_from_db()
    registration_request.user.refresh_from_db()
    invitation.refresh_from_db()
    assert registration_request.status == "APPROVED"
    assert registration_request.reviewed_by == registration_admin
    assert registration_request.user.role == requested_role
    assert registration_request.user.account_status == "ACTIVE"
    assert registration_request.user.is_active is True
    assert ProjectMembers.objects.filter(
        user=registration_request.user, project=registration_project
    ).count() == 1
    assert invitation.used_count == 1
    assert HistoryLog.objects.filter(
        action="APPROVE", entity_id=registration_request.user_id
    ).count() == 1


@pytest.mark.django_db
def test_admin_rejection_requires_reason_and_creates_no_membership(
    api_client, registration_project, registration_admin
):
    invitation = make_invitation(
        registration_project, registration_admin, "EXECUTIVE", "EXEC-CODE"
    )
    api_client.post(
        reverse("register"), registration_payload("EXECUTIVE", invitation.code)
    )
    registration_request = RegistrationRequest.objects.get()
    api_client.force_authenticate(registration_admin)

    missing_reason = api_client.post(
        reverse("registration-request-reject", args=[registration_request.id]), {}
    )
    rejected = api_client.post(
        reverse("registration-request-reject", args=[registration_request.id]),
        {"reason": "Invitation details could not be confirmed."},
    )

    assert missing_reason.status_code == status.HTTP_400_BAD_REQUEST
    assert rejected.status_code == status.HTTP_200_OK
    registration_request.refresh_from_db()
    registration_request.user.refresh_from_db()
    invitation.refresh_from_db()
    assert registration_request.status == "REJECTED"
    assert registration_request.user.role is None
    assert registration_request.user.is_active is False
    assert not ProjectMembers.objects.filter(user=registration_request.user).exists()
    assert invitation.used_count == 0


@pytest.mark.django_db
def test_registration_history_never_contains_password(
    api_client, registration_project, registration_admin
):
    invitation = make_invitation(
        registration_project, registration_admin, "PROJECT_STAFF", "STAFF-CODE"
    )
    password = "UniqueSecretPass123!"
    payload = registration_payload("PROJECT_STAFF", invitation.code)
    payload["password"] = password
    api_client.post(reverse("register"), payload)

    serialized_logs = " ".join(
        f"{log.description} {json.dumps(log.old_state)} {json.dumps(log.new_state)}"
        for log in HistoryLog.objects.all()
    )
    assert password not in serialized_logs
    assert "password" not in serialized_logs.lower()


@pytest.mark.django_db
def test_approved_executive_only_sees_assigned_project_and_cannot_write(
    api_client, registration_project, registration_admin
):
    other_project = Project.objects.create(
        name="Other Project",
        project_leader="Other Leader",
        description="Not assigned",
        grant_amount="500.00",
        project_status="ACTIVE",
        date_start=date(2026, 1, 1),
        date_end=date(2026, 12, 31),
    )
    invitation = make_invitation(
        registration_project, registration_admin, "EXECUTIVE", "EXEC-CODE"
    )
    api_client.post(
        reverse("register"), registration_payload("EXECUTIVE", invitation.code)
    )
    registration_request = RegistrationRequest.objects.get()
    api_client.force_authenticate(registration_admin)
    api_client.post(reverse("registration-request-approve", args=[registration_request.id]))
    executive = registration_request.user
    api_client.force_authenticate(executive)

    assigned = api_client.get(reverse("project-detail", args=[registration_project.id]))
    unassigned = api_client.get(reverse("project-detail", args=[other_project.id]))
    write = api_client.patch(
        reverse("project-detail", args=[registration_project.id]), {"name": "Changed"}
    )

    assert assigned.status_code == status.HTTP_200_OK
    assert unassigned.status_code == status.HTTP_404_NOT_FOUND
    assert write.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_approved_staff_write_still_creates_change_request(
    api_client, registration_project, registration_admin
):
    invitation = make_invitation(
        registration_project, registration_admin, "PROJECT_STAFF", "STAFF-CODE"
    )
    api_client.post(
        reverse("register"), registration_payload("PROJECT_STAFF", invitation.code)
    )
    registration_request = RegistrationRequest.objects.get()
    api_client.force_authenticate(registration_admin)
    api_client.post(reverse("registration-request-approve", args=[registration_request.id]))
    staff = registration_request.user
    original_name = registration_project.name
    api_client.force_authenticate(staff)

    response = api_client.patch(
        reverse("project-detail", args=[registration_project.id]),
        {"name": "Proposed Project Name"},
    )

    assert response.status_code == status.HTTP_202_ACCEPTED
    registration_project.refresh_from_db()
    assert registration_project.name == original_name
    assert ChangeRequest.objects.filter(submitted_by=staff, status="PENDING").exists()


@pytest.mark.django_db
def test_existing_admin_login_remains_unchanged(api_client, registration_admin):
    response = api_client.post(
        reverse("token_obtain_pair"),
        {"email": registration_admin.email, "password": "AdminPass123!"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.data["access"]
    assert response.data["refresh"]


@pytest.mark.django_db(transaction=True)
def test_reseed_command_creates_invitations_idempotently():
    User.objects.create_user(
        email="seed-admin@example.com",
        password="SeedAdminPass123!",
        role="ADMIN",
    )
    call_command("seed_reseed_dasig_project", verbosity=0)
    call_command("seed_reseed_dasig_project", verbosity=0)

    assert ProjectInvitation.objects.filter(code="DASIG-EXEC-2026").count() == 1
    assert ProjectInvitation.objects.filter(code="DASIG-STAFF-2026").count() == 1
    assert ProjectInvitation.objects.filter(code__in=[
        "DASIG-EXEC-2026", "DASIG-STAFF-2026"
    ]).count() == 2

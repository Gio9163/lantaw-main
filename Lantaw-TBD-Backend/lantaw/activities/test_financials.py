from datetime import date
from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from activities.models import Activity, Objective
from activities.serializers import ActivitySerializer
from change_requests.models import ChangeRequest
from projects.management.commands.seed_reseed_dasig_project import (
    ACTIVITY_FINANCIALS,
    APPROVED_Y2,
    PROJECT_NAME,
)
from projects.models import BudgetItem, Project, ProjectMembers
from users.models import User


def create_project(name="Activity Financial Test"):
    return Project.objects.create(
        name=name,
        project_leader="Test Leader",
        description="Financial test project",
        grant_amount=Decimal("1000.00"),
        project_status="ACTIVE",
        date_start=date(2026, 1, 1),
        date_end=date(2026, 12, 31),
    )


@pytest.mark.django_db
def test_balance_budget_status_and_decimal_serializer_output():
    project = create_project()
    objective = Objective.objects.create(project=project, title="Objective")
    activity = Activity.objects.create(
        objective=objective,
        title="Completed under budget",
        activity_status="COMPLETED",
        projected_expense=Decimal("115000.00"),
        actual_expense=Decimal("105000.00"),
    )

    assert activity.balance == Decimal("10000.00")
    assert activity.budget_status == "UNDER_BUDGET"
    assert ActivitySerializer(activity).data["projected_expense"] == "115000.00"
    assert ActivitySerializer(activity).data["actual_expense"] == "105000.00"
    assert ActivitySerializer(activity).data["balance"] == "10000.00"
    assert ActivitySerializer(activity).data["budget_status"] == "UNDER_BUDGET"

    activity.activity_status = "ACTIVE"
    activity.actual_expense = Decimal("35000.00")
    assert activity.budget_status == "ON_TRACK"

    activity.activity_status = "PENDING"
    activity.actual_expense = Decimal("0.00")
    assert activity.budget_status == "NOT_STARTED"

    activity.actual_expense = activity.projected_expense
    assert activity.budget_status == "ON_BUDGET"

    activity.actual_expense = Decimal("115000.01")
    assert activity.budget_status == "OVER_BUDGET"

    activity.projected_expense = Decimal("0.00")
    activity.actual_expense = Decimal("0.00")
    assert activity.budget_status == "UNALLOCATED"


@pytest.mark.django_db(transaction=True)
def test_reseed_financial_allocations_reconcile_and_are_idempotent():
    User.objects.create_user(
        email="seed-admin@example.com",
        password="AdminPass123!",
        role="ADMIN",
        account_status="ACTIVE",
        is_active=True,
    )

    first_output = StringIO()
    call_command("seed_reseed_dasig_project", stdout=first_output)

    project = Project.objects.get(name=PROJECT_NAME)
    activities = Activity.objects.filter(objective__project=project).order_by("id")
    assert activities.count() == 11
    assert set(activities.values_list("title", flat=True)) == set(ACTIVITY_FINANCIALS)
    assert sum(
        activities.values_list("projected_expense", flat=True), Decimal("0.00")
    ) == APPROVED_Y2
    assert sum(
        activities.values_list("actual_expense", flat=True), Decimal("0.00")
    ) == Decimal("140000.00")
    assert sum((activity.balance for activity in activities), Decimal("0.00")) == Decimal(
        "1230768.00"
    )
    assert all(
        activity.actual_expense == Decimal("0.00")
        for activity in activities.filter(activity_status="PENDING")
    )
    assert project.grant_amount == APPROVED_Y2
    assert sum(
        BudgetItem.objects.filter(project=project).values_list("amount", flat=True),
        Decimal("0.00"),
    ) == APPROVED_Y2
    assert not BudgetItem.objects.filter(
        project=project, description__icontains="counterpart"
    ).exists()
    assert "Approved budget reconciliation: PASSED" in first_output.getvalue()
    assert "UP Cebu counterpart values imported: 0" in first_output.getvalue()

    first_values = list(
        activities.values_list(
            "id", "title", "projected_expense", "actual_expense", "activity_status"
        )
    )
    second_output = StringIO()
    call_command("seed_reseed_dasig_project", stdout=second_output)
    second_values = list(
        Activity.objects.filter(objective__project=project)
        .order_by("id")
        .values_list(
            "id", "title", "projected_expense", "actual_expense", "activity_status"
        )
    )

    assert second_values == first_values
    assert "Activities created: 0" in second_output.getvalue()
    assert "Activities updated: 0" in second_output.getvalue()
    assert "Duplicate activities created: 0" in second_output.getvalue()


@pytest.mark.django_db
def test_activity_financial_writes_preserve_role_approval_rules():
    project = create_project("Approval Financial Test")
    objective = Objective.objects.create(project=project, title="Objective")
    activity = Activity.objects.create(
        objective=objective,
        title="Protected activity",
        projected_expense=Decimal("100.00"),
        actual_expense=Decimal("0.00"),
    )
    staff = User.objects.create_user(
        email="finance-staff@example.com",
        password="StaffPass123!",
        role="PROJECT_STAFF",
    )
    admin = User.objects.create_user(
        email="finance-admin@example.com",
        password="AdminPass123!",
        role="ADMIN",
    )
    executive = User.objects.create_user(
        email="finance-executive@example.com",
        password="ExecutivePass123!",
        role="EXECUTIVE",
    )
    ProjectMembers.objects.create(project=project, user=staff)
    url = (
        f"/api/projects/{project.id}/objectives/{objective.id}/activities/{activity.id}/"
    )

    client = APIClient()
    client.force_authenticate(staff)
    response = client.patch(url, {"actual_expense": "25.00"}, format="json")
    assert response.status_code == 202
    activity.refresh_from_db()
    assert activity.actual_expense == Decimal("0.00")
    request = ChangeRequest.objects.get(entity_id=activity.id, change_type="ACTIVITY")
    assert request.status == "PENDING"
    assert request.proposed_changes["actual_expense"] == "25.00"

    for user in (admin, executive):
        client.force_authenticate(user)
        response = client.patch(url, {"actual_expense": "25.00"}, format="json")
        assert response.status_code == 403
        activity.refresh_from_db()
        assert activity.actual_expense == Decimal("0.00")

    client.force_authenticate(admin)
    response = client.post(f"/api/change-requests/{request.id}/approve/", {}, format="json")
    assert response.status_code == 200
    activity.refresh_from_db()
    assert activity.actual_expense == Decimal("25.00")
    assert activity.balance == Decimal("75.00")
    assert activity.budget_status == "ON_TRACK"

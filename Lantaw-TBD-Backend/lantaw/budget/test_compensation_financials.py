from datetime import date
from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from budget.models import BudgetLineItem, Compensation
from budget.serializers import CompensationSerializer
from personnel.models import Department, Personnel, Role
from projects.management.commands.seed_reseed_dasig_project import PROJECT_NAME
from projects.models import Project, ProjectMembers, ProjectPersonnel
from users.models import User


@pytest.mark.django_db(transaction=True)
def test_reseed_compensation_values_and_idempotency():
    User.objects.create_user(
        email="compensation-seed-admin@example.com",
        password="AdminPass123!",
        role="ADMIN",
        account_status="ACTIVE",
        is_active=True,
    )

    first_output = StringIO()
    call_command("seed_reseed_dasig_project", stdout=first_output)
    project = Project.objects.get(name=PROJECT_NAME)
    records = Compensation.objects.filter(budget_item__project=project).select_related(
        "personnel__role"
    )

    aide = records.get(personnel__role__name="Project Technical Aide III")
    assert aide.type == "SALARY"
    assert aide.monthly_rate == Decimal("21906.00")
    assert aide.duration_months == 12
    assert aide.amount == Decimal("262872.00")
    assert aide.monthly_rate * aide.duration_months == aide.amount

    staff = records.get(personnel__role__name="Project Staff Level 3")
    assert staff.type == "SALARY"
    assert staff.monthly_rate == Decimal("7500.00")
    assert staff.duration_months == 12
    assert staff.amount == Decimal("90000.00")
    assert staff.monthly_rate * staff.duration_months == staff.amount

    assert sum(records.values_list("amount", flat=True), Decimal("0.00")) == Decimal(
        "352872.00"
    )
    assert not records.filter(amount=Decimal("99600.00")).exists()
    assert records.count() == 2

    serializer_data = CompensationSerializer(aide).data
    assert serializer_data["role_name"] == "Project Technical Aide III"
    assert serializer_data["monthly_rate"] == "21906.00"
    assert serializer_data["monthly_salary"] == "21906.00"
    assert serializer_data["honoraria"] == "0.00"
    assert serializer_data["duration_months"] == 12
    assert serializer_data["total_compensation"] == "262872.00"
    assert "Personnel Services reconciliation: PHP 352,872.00 - PASSED" in first_output.getvalue()
    assert "UP Cebu counterpart funding imported: PHP 0.00" in first_output.getvalue()

    record_ids = list(records.order_by("id").values_list("id", flat=True))
    second_output = StringIO()
    call_command("seed_reseed_dasig_project", stdout=second_output)
    assert list(records.order_by("id").values_list("id", flat=True)) == record_ids
    assert records.count() == 2
    assert "Compensations created: 0" in second_output.getvalue()
    assert "Compensations updated: 0" in second_output.getvalue()


@pytest.mark.django_db
def test_compensation_read_access_and_protected_updates():
    project = Project.objects.create(
        name="Compensation Permission Project",
        project_leader="Test Leader",
        description="Compensation permission verification",
        grant_amount=Decimal("1000.00"),
        project_status="ACTIVE",
        date_start=date(2026, 1, 1),
        date_end=date(2026, 12, 31),
    )
    role = Role.objects.create(project=project, name="Project Staff Level 3")
    department = Department.objects.create(
        project=project, name="Innovation and Startup Support"
    )
    person = Personnel.objects.create(
        first_name="Project",
        last_name="Staff",
        role=role,
        department=department,
        employment_status="ACTIVE",
    )
    ProjectPersonnel.objects.create(project=project, personnel=person)
    ps_item, _ = BudgetLineItem.objects.get_or_create(project=project, name="PS")
    compensation = Compensation.objects.create(
        type="SALARY",
        budget_item=ps_item,
        personnel=person,
        reason="Approved salary",
        monthly_rate=Decimal("7500.00"),
        duration_months=12,
        amount=Decimal("90000.00"),
        date_effective=project.date_start,
    )
    admin = User.objects.create_user(
        email="comp-admin@example.com", password="AdminPass123!", role="ADMIN"
    )
    executive = User.objects.create_user(
        email="comp-executive@example.com",
        password="ExecutivePass123!",
        role="EXECUTIVE",
    )
    staff = User.objects.create_user(
        email="comp-staff@example.com",
        password="StaffPass123!",
        role="PROJECT_STAFF",
    )
    ProjectMembers.objects.create(project=project, user=staff)

    client = APIClient()
    list_url = f"/api/projects/{project.id}/compensations/"
    detail_url = f"{list_url}{compensation.id}/"
    for user in (admin, executive, staff):
        client.force_authenticate(user)
        response = client.get(list_url)
        assert response.status_code == 200
        response = client.patch(
            detail_url, {"monthly_rate": "8000.00"}, format="json"
        )
        assert response.status_code == 403

    compensation.refresh_from_db()
    assert compensation.monthly_rate == Decimal("7500.00")

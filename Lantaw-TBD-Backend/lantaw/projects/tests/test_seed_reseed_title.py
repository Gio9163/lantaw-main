from datetime import date
from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command

from projects.management.commands.seed_reseed_dasig_project import (
    OLD_PROJECT_NAME,
    PROJECT_DESCRIPTION,
    PROJECT_NAME,
)
from projects.models import Project
from users.models import User


@pytest.mark.django_db(transaction=True)
def test_seed_updates_existing_reseed_title_without_duplicate():
    project = Project.objects.create(
        name=OLD_PROJECT_NAME,
        project_leader="Ms. Janice V. Forster",
        description="Previous description",
        grant_amount=Decimal("1370768.00"),
        project_status="ACTIVE",
        date_start=date(2024, 1, 1),
        date_end=date(2024, 12, 31),
    )
    original_id = project.id
    User.objects.create_user(
        email="title-seed-admin@example.com",
        password="AdminPass123!",
        role="ADMIN",
        account_status="ACTIVE",
        is_active=True,
    )

    first_output = StringIO()
    call_command("seed_reseed_dasig_project", stdout=first_output)
    project.refresh_from_db()
    assert project.id == original_id
    assert project.name == PROJECT_NAME
    assert project.description == PROJECT_DESCRIPTION
    assert Project.objects.filter(name__in=(OLD_PROJECT_NAME, PROJECT_NAME)).count() == 1

    second_output = StringIO()
    call_command("seed_reseed_dasig_project", stdout=second_output)
    project.refresh_from_db()
    assert project.id == original_id
    assert project.name == PROJECT_NAME
    assert project.description == PROJECT_DESCRIPTION
    assert Project.objects.filter(name__in=(OLD_PROJECT_NAME, PROJECT_NAME)).count() == 1
    assert "Project updated: 0" in second_output.getvalue()

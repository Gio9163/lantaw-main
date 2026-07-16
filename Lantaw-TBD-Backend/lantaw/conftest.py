import pytest
from rest_framework.test import APIClient
from users.models import User
from projects.models import Project
from personnel.models import Personnel
from datetime import date
from django.db import connection

from django.contrib.auth import get_user_model

User = get_user_model()

"""
Fixtures for User
"""
@pytest.fixture
def user_data():
    return {
        "email": "test@example.com",
        "password": "12345678",
        "first_name": "Juan",
        "last_name": "de la Cruz",
    }

@pytest.fixture
def user(db, user_data):
    return User.objects.create_user(**user_data)


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="admin@example.com",
        first_name="Admin",
        last_name="User",
        password="AdminPass123!",
        role="ADMIN",
    )

@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        email="staff@example.com",
        first_name="Staff",
        last_name="User",
        password="StaffPass123!",
        role="PROJECT_STAFF",
    )

@pytest.fixture
def another_staff_user(db):
    return User.objects.create_user(
        email="otherstaff@example.com",
        first_name="Other",
        last_name="User",
        password="StaffPass123!",
        role="PROJECT_STAFF",
    )

"""
Fixtures for Personnel
"""
@pytest.fixture
def sample_personnel(db):
    return Personnel.objects.create(
        first_name="Pedro",
        last_name="Penduko",
        role=None,
        department=None,
        employment_status="ACTIVE",
    )

"""
Fixtures for API client.
"""

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client

"""
Fixtures for Project
"""

@pytest.fixture
def sample_project_data(db, user):
    return {
        "name": "Demo Project",
        "description": "This is a demo project.",
        "grant_amount": 25000.00,
        "project_status": 'ACTIVE',
        "project_leader": "Test Project Leader",
        "date_start": date(2025, 10, 13),
        "date_end": date(2025, 10, 15),
    }

@pytest.fixture
def sample_project(db, sample_project_data):
    return Project.objects.create(**sample_project_data)

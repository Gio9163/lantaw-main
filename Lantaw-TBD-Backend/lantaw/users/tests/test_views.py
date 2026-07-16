import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

# Registration endpoint
@pytest.mark.django_db
def test_user_registration_defaults_to_project_staff(api_client):
    url = reverse("register")  # Ensure your URL name matches
    payload = {
        "email": "newuser@example.com",
        "first_name": "Juan",
        "last_name": "Dela Cruz",
        "password": "StrongPass123!",
        "role": "ADMIN",  # should be ignored
    }

    response = api_client.post(url, payload)
    assert response.status_code == status.HTTP_201_CREATED

    user = User.objects.get(email="newuser@example.com")
    assert user.role == "PROJECT_STAFF"  # forced by backend

# User can view themselves
@pytest.mark.django_db
def test_user_can_view_self(api_client, staff_user):
    api_client.force_authenticate(user=staff_user)
    url = reverse("user-detail", args=[staff_user.id])

    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["email"] == staff_user.email

# User cannot view other users
@pytest.mark.django_db
def test_user_cannot_view_others(api_client, staff_user, another_staff_user):
    api_client.force_authenticate(user=staff_user)
    url = reverse("user-detail", args=[another_staff_user.id])

    response = api_client.get(url)
    assert response.status_code == status.HTTP_404_NOT_FOUND

# User cannot update role
@pytest.mark.django_db
def test_user_cannot_update_role(api_client, staff_user):
    api_client.force_authenticate(user=staff_user)
    url = reverse("user-detail", args=[staff_user.id])
    payload = {"role": "ADMIN"}

    response = api_client.patch(url, payload)
    assert response.status_code == status.HTTP_200_OK

    staff_user.refresh_from_db()
    assert staff_user.role == "PROJECT_STAFF"  # unchanged


@pytest.mark.django_db
def test_admin_can_view_all_users(api_client, admin_user, staff_user):
    api_client.force_authenticate(user=admin_user)
    url = reverse("user-list")

    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK

    data = response.data
    # If pagination is enabled, extract from 'results'
    if isinstance(data, dict) and "results" in data:
        data = data["results"]

    emails = [u["email"] for u in data]
    assert admin_user.email in emails
    assert staff_user.email in emails

# Admin can edit other users
@pytest.mark.django_db
def test_admin_can_edit_other_user(api_client, admin_user, staff_user):
    api_client.force_authenticate(user=admin_user)
    url = reverse("user-detail", args=[staff_user.id])
    payload = {"first_name": "Edited"}

    response = api_client.patch(url, payload)
    assert response.status_code == status.HTTP_200_OK

    staff_user.refresh_from_db()
    assert staff_user.first_name == "Edited"

# Password change
@pytest.mark.django_db
def test_password_change_view(api_client, staff_user):
    api_client.force_authenticate(user=staff_user)
    url = reverse("password_change") 
    payload = {
        "old_password": "StaffPass123!",
        "new_password": "NewPass456!",
    }

    response = api_client.put(url, payload)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["detail"] == "Password updated successfully."

    staff_user.refresh_from_db()
    assert staff_user.check_password("NewPass456!")

# Forbidden password change with wrong old password
@pytest.mark.django_db
def test_password_change_fails_with_wrong_old_password(api_client, staff_user):
    api_client.force_authenticate(user=staff_user)
    url = reverse("password_change")
    payload = {
        "old_password": "WrongOldPassword",
        "new_password": "NewPass456!",
    }

    response = api_client.put(url, payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "old_password" in response.data

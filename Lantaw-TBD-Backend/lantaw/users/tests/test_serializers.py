import pytest 
from users.serializers import UserSerializer, RegisterSerializer, PasswordChangeSerializer
from users.models import User
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

User = get_user_model()

# UserSerializer Tests
# Check fields, read_only, write_only, required
@pytest.mark.django_db
def test_user_serializer_fields():
    user_data = {
        "email": "test@example.com",
        "first_name": "Juan",
        "last_name": "de la Cruz",
        "password": "12345678",
    }
    user = User.objects.create_user(**user_data)
    serializer = UserSerializer(instance=user)
    data = serializer.data

    expected_fields = {
        "id",
        "first_name",
        "last_name",
        "email",
        "role",
        "account_status",
        "date_joined",
        "last_login",
        "projects",
    }

    assert set(data.keys()) == expected_fields

    assert serializer.fields["email"].required
    assert data["email"] == user_data["email"]

    assert serializer.fields["password"].write_only
    assert "password" not in data

    assert serializer.fields["id"].read_only
    assert serializer.fields["date_joined"].read_only
    assert serializer.fields["last_login"].read_only

# Test update method, role cannot be changed
@pytest.mark.django_db
def test_user_serializer_update(user):
    serializer = UserSerializer(
        instance=user,
        data={
            "first_name": "UpdatedName",
            "role": "ADMIN",  # Attempt to change role
        },
        partial=True,
    )
    assert serializer.is_valid(), serializer.errors
    updated_user = serializer.save()
    assert updated_user.first_name == "UpdatedName"
    assert updated_user.role == user.role  # Role should remain unchanged

# RegisterSerializer Tests
# Check create method, password hashing, field requirements
@pytest.mark.django_db
def test_register_serializer_create(db):
    payload = {
        "first_name": "Maria",
        "last_name": "Clara",
        "email": "maria.clara@example.com",
        "password": "StrongPass123",
        "role": "ADMIN",
    }
    serializer = RegisterSerializer(data=payload)
    assert serializer.is_valid(), serializer.errors

    user = serializer.save()
    assert user.email == payload["email"]
    assert user.check_password(payload["password"])
    assert user.first_name == payload["first_name"]
    assert user.last_name == payload["last_name"]
    assert user.role != payload["role"]
    assert not user.is_superuser
    assert user.id is not None

# Test password minimum length enforcement
@pytest.mark.django_db
def test_register_serializer_password_too_short():
    payload = {
        "first_name": "Tiny",
        "last_name": "Password",
        "email": "tiny.password@example.com",
        "password": "short",
        "role": "USER",
    }
    serializer = RegisterSerializer(data=payload)
    assert not serializer.is_valid()
    assert "password" in serializer.errors

# Test missing required email field
@pytest.mark.django_db
def test_register_serializer_missing_email():
    payload = {
        "first_name": "No",
        "last_name": "Email",
        "password": "StrongPass123",
        "role": "USER",
    }
    serializer = RegisterSerializer(data=payload)
    assert not serializer.is_valid()
    assert "email" in serializer.errors

# Test invalid email format
@pytest.mark.django_db
def test_register_serializer_invalid_email():
    payload = {
        "first_name": "Invalid",
        "last_name": "Email",
        "email": "invalid-email",
        "password": "StrongPass123",
        "role": "USER",
    }
    serializer = RegisterSerializer(data=payload)
    assert not serializer.is_valid()
    assert "email" in serializer.errors

# PasswordChangeSerializer Tests
# Check old password validation, new password validation, password change
@pytest.mark.django_db
def test_password_change_serializer_validation(user, rf):
    request = rf.post("/fake-url/")
    request.user = user
    
    serializer = PasswordChangeSerializer(
        data={
            "old_password": "12345678",
            "new_password": "EvenStronger123!"
        },
        context={"request": request},
    )
    assert serializer.is_valid(), serializer.errors
    
    serializer.save()
    user.refresh_from_db()
    assert user.check_password("EvenStronger123!")

# Test invalid old password
@pytest.mark.django_db
def test_password_change_serializer_invalid_old_password(user, rf):
    request = rf.post("/fake-url/")
    request.user = user
    
    serializer = PasswordChangeSerializer(
        data={
            "old_password": "WrongOldPass",
            "new_password": "NewStrongPass123!"
        },
        context={"request": request},
    )
    assert not serializer.is_valid()
    assert "old_password" in serializer.errors

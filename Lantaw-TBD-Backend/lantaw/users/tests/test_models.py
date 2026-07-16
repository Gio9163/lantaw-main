import pytest
from users.models import User

# Test user creation with valid email and password
@pytest.mark.django_db
def test_create_user_with_valid_email(user_data):
    user = User.objects.create_user(**user_data)
    assert user.email == user_data["email"]
    assert user.check_password(user_data["password"])
    assert user.role == "PROJECT_STAFF"
    assert user.account_status == "ACTIVE"
    assert not user.is_superuser

# Test user creation with missing email 
@pytest.mark.django_db
def test_create_user_with_missing_email():
    with pytest.raises(ValueError) as excinfo:
        User.objects.create_user(email=None, password="12345678")
    assert "Users must have an email address" in str(excinfo.value)

# Test superuser creation
@pytest.mark.django_db
def test_create_superuser(user_data):
    superuser = User.objects.create_superuser(**user_data)
    assert superuser.email == user_data["email"]
    assert superuser.check_password(user_data["password"])
    assert superuser.is_superuser
    assert superuser.is_staff
    assert superuser.account_status == "ACTIVE"

# Test user creation with existing email
@pytest.mark.django_db
def test_create_user_with_existing_email():
    user_data = {
        "email": "chancy@example.com",
        "password": "StrongPass123",
        "first_name": "Chancy",
        "last_name": "Smith",
    }
    User.objects.create_user(**user_data)
    with pytest.raises(Exception):
        User.objects.create_user(**user_data)

# Test if email input is valid
@pytest.mark.django_db
def test_create_user_with_invalid_email():
    with pytest.raises(ValueError) as excinfo:
        User.objects.create_user(email="invalid-email", password="12345678")
    assert "Enter a valid email address" in str(excinfo.value)

# Test if password is set
@pytest.mark.django_db
def test_create_user_with_no_password(user_data):
    user = User.objects.create_user(email=user_data["email"], password=None)
    assert user.email == user_data["email"]
    assert not user.has_usable_password()

# Test user string representation
@pytest.mark.django_db
def test_user_str_representation(user_data):
    user = User.objects.create_user(**user_data)
    assert str(user) == f"{user_data['first_name']} {user_data['last_name']} ({user_data['email']})"




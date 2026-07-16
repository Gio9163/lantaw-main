# Users App Documentation

## Overview

**Purpose**: The `users` app provides a custom user authentication and management system for the Lantaw TBD Backend. It implements email-based authentication instead of the default Django username-based system, and includes role-based access control with three distinct user roles: Admin, Executive, and Project Staff.

**Role in Project**: This app serves as the foundation for authentication and authorization across the entire application. All other apps depend on the custom User model for user identification, permissions, and access control. It provides JWT-based authentication endpoints and user management APIs that are consumed by frontend applications.

**Dependencies**:
- **Built-in Django**: Authentication framework (`django.contrib.auth`), Admin interface (`django.contrib.admin`)
- **Third-party packages**: Django REST Framework (`djangorestframework`), JWT authentication (`djangorestframework-simplejwt`)

## Directory Structure

```
lantaw/users/
├── __init__.py
├── admin.py              # Django admin configuration for User model
├── apps.py               # App configuration
├── models.py             # Custom User model and UserManager
├── serializers.py        # DRF serializers for user operations
├── urls.py               # URL routing for user endpoints
├── views.py              # API views and permissions
├── migrations/           # Database migration files
│   ├── __init__.py
│   ├── 0001_initial.py
│   ├── 0002_delete_projectmember.py
│   ├── 0003_remove_role_name_role_role.py
│   ├── 0004_delete_role_remove_user_username_user_role_and_more.py
│   └── 0005_alter_user_managers.py
├── management/           # Custom management commands (empty)
│   └── commands/
│       └── __init__.py
└── tests/                # Test suite
    ├── __init__.py
    ├── test_models.py
    ├── test_serializers.py
    └── test_views.py
```

## Key Components

### Models

#### UserManager
**Location**: `models.py` (lines 12-31)

**Purpose**: Custom user manager that enforces email-based authentication and validates email format. Automatically assigns default role of `PROJECT_STAFF` to new users.

**Key Methods**:
- `create_user(email, password=None, **extra_fields)`: Creates a regular user with email validation
  - Validates email format using Django's `validate_email`
  - Normalizes email address
  - Sets password securely
  - Raises `ValueError` if email is missing or invalid
- `create_superuser(email, password=None, **extra_fields)`: Creates a superuser with admin privileges
  - Sets `is_staff`, `is_superuser`, and `is_active` to `True`
  - Delegates to `create_user` for actual creation

**Important Behaviors**:
- Email is required and must be valid
- Email is normalized before storage
- Passwords are hashed automatically

#### User
**Location**: `models.py` (lines 33-87)

**Purpose**: Custom user model extending Django's `AbstractUser`. Uses email as the unique identifier instead of username.

**Key Fields**:
- `id`: Primary key (auto-generated)
- `email`: Unique email address (required, used for login)
- `first_name`: User's given name
- `last_name`: User's family name
- `password`: Securely hashed password
- `role`: User role with choices:
  - `ADMIN`: Full system access
  - `EXECUTIVE`: Executive-level access
  - `PROJECT_STAFF`: Default role for regular users
- `account_status`: Account state with choices:
  - `ACTIVE`: Account is active and operational
  - `DEACTIVATED`: Account has been deactivated
  - `SUSPENDED`: Account is temporarily suspended
- `date_joined`: Timestamp of account creation (auto-set)
- `last_login`: Timestamp of most recent login (auto-updated)
- `is_staff`: Boolean indicating admin panel access
- `is_superuser`: Boolean indicating superuser privileges
- `is_active`: Boolean indicating if account is active

**Important Attributes**:
- `USERNAME_FIELD = 'email'`: Email is used for authentication
- `REQUIRED_FIELDS = []`: No additional required fields beyond email
- `username = None`: Username field is removed
- Default `role` is `PROJECT_STAFF`
- Default `account_status` is `ACTIVE`

**Methods**:
- `__str__()`: Returns formatted string: `"{first_name} {last_name} ({email})"`

**Relationships**:
- Reverse relationship: `projectmembers_set` - Access to project memberships through the `projects` app

### Views

#### IsAdminOrSelf
**Location**: `views.py` (lines 9-28)

**Purpose**: Custom permission class that restricts access based on user role and ownership.

**Permission Logic**:
- **List-level (`has_permission`)**: Requires authenticated user
- **Object-level (`has_object_permission`)**:
  - Admins can perform any action on any user
  - Non-admins can only:
    - View their own profile (GET, HEAD, OPTIONS)
    - Update their own profile (PUT, PATCH)
    - Cannot delete any user (including themselves)

**Use Cases**: Applied to `UserViewSet` to enforce role-based access control.

#### UserViewSet
**Location**: `views.py` (lines 30-55)

**Purpose**: Provides CRUD operations for user management with role-based filtering and restrictions.

**Authentication**: Requires `IsAuthenticated` permission

**Permissions**: Uses `IsAdminOrSelf` for object-level access control

**Features**:
- **Search**: Email-based search using DRF's `SearchFilter`
- **Queryset Filtering**:
  - Admins see all users
  - Non-admins only see their own profile
- **Update Protection**: Non-admins cannot modify protected fields:
  - `role`
  - `is_staff`
  - `is_superuser`
  - `is_active`
  - `date_joined`

**Endpoints** (via router):
- `GET /api/users/`: List users (filtered by role)
- `GET /api/users/{id}/`: Retrieve user details
- `PUT /api/users/{id}/`: Full update
- `PATCH /api/users/{id}/`: Partial update
- `DELETE /api/users/{id}/`: Delete user (admin only)

#### RegisterView
**Location**: `views.py` (lines 57-60)

**Purpose**: Public endpoint for user registration. Allows anyone to create a new account.

**Authentication**: `AllowAny` (no authentication required)

**Behavior**:
- Creates new user with `RegisterSerializer`
- Automatically assigns `PROJECT_STAFF` role
- Password is hashed before storage

**Endpoint**: `POST /api/register/`

#### PasswordChangeView
**Location**: `views.py` (lines 62-79)

**Purpose**: Allows authenticated users to change their password after verifying their current password.

**Authentication**: Requires `IsAuthenticated`

**HTTP Methods**: `PUT`, `PATCH`

**Validation**:
- Verifies old password matches current password
- Validates new password using Django's password validators
- Returns error if old password is incorrect

**Endpoint**: `PUT/PATCH /api/password/change/`

**Response**: `{"detail": "Password updated successfully."}` on success

### Serializers

#### UserSerializer
**Location**: `serializers.py` (lines 10-41)

**Purpose**: Serializer for viewing and updating user details. Used in `UserViewSet` for user management operations.

**Fields**:
- `id`: Read-only primary key
- `first_name`: User's first name
- `last_name`: User's last name
- `email`: Required email address
- `password`: Write-only field (hidden in responses)
- `role`: Read-only, displays human-readable role name (e.g., "Admin" instead of "ADMIN")
- `projects`: Read-only, list of project IDs the user is a member of
- `account_status`: Current account status
- `date_joined`: Read-only timestamp
- `last_login`: Read-only timestamp

**Special Behaviors**:
- `update()` method prevents role changes by removing `role` from validated data
- `get_projects()` method retrieves project IDs from reverse relationship
- Password field is write-only (accepted on create/update, never returned)

#### RegisterSerializer
**Location**: `serializers.py` (lines 43-65)

**Purpose**: Serializer for user registration. Handles new user creation with password validation.

**Fields**:
- `id`: Read-only (auto-generated)
- `first_name`: User's first name
- `last_name`: User's last name
- `email`: Required email address
- `password`: Required, minimum 8 characters, write-only
- `role`: Read-only (automatically set to `PROJECT_STAFF`)

**Validation**:
- Email must be valid format
- Password minimum length: 8 characters
- Email is required

**Special Behaviors**:
- `create()` method:
  - Extracts password from validated data
  - Forces role to `PROJECT_STAFF` (ignores any provided role)
  - Hashes password using `set_password()`
  - Saves user to database

#### PasswordChangeSerializer
**Location**: `serializers.py` (lines 68-86)

**Purpose**: Serializer for password change operations. Validates old password and new password.

**Fields**:
- `old_password`: Required, write-only
- `new_password`: Required, write-only

**Validation**:
- `validate_old_password()`: Verifies old password matches current user's password
- `validate_new_password()`: Validates new password using Django's password validators

**Special Behaviors**:
- Requires request context to access current user
- `save()` method:
  - Sets new password using `set_password()`
  - Saves user with updated password

### URLs/API Endpoints

**Location**: `urls.py`

All endpoints are prefixed with `/api/` when included in the main URL configuration.

#### Authentication Endpoints

- **POST `/api/token/`** (`token_obtain_pair`)
  - Purpose: Obtain JWT access and refresh tokens
  - Authentication: None (public)
  - Request Body: `{"email": "user@example.com", "password": "password123"}`
  - Response: `{"access": "...", "refresh": "..."}`

- **POST `/api/token/refresh/`** (`token_refresh`)
  - Purpose: Refresh JWT access token using refresh token
  - Authentication: None (public)
  - Request Body: `{"refresh": "refresh_token_here"}`
  - Response: `{"access": "..."}`

#### User Management Endpoints

- **POST `/api/register/`** (`register`)
  - Purpose: Register a new user account
  - Authentication: None (public)
  - Request Body:
    ```json
    {
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "password": "SecurePass123"
    }
    ```
  - Response: User object with 201 Created status

- **PUT/PATCH `/api/password/change/`** (`password_change`)
  - Purpose: Change user password
  - Authentication: Required (JWT token)
  - Request Body:
    ```json
    {
      "old_password": "OldPass123",
      "new_password": "NewPass456"
    }
    ```
  - Response: `{"detail": "Password updated successfully."}`

#### User CRUD Endpoints (via Router)

- **GET `/api/users/`** (`user-list`)
  - Purpose: List all users (filtered by role)
  - Authentication: Required
  - Permissions: Admins see all, others see only themselves
  - Query Parameters: `?search=email` (email search)

- **GET `/api/users/{id}/`** (`user-detail`)
  - Purpose: Retrieve specific user details
  - Authentication: Required
  - Permissions: Admins or own profile only

- **PUT `/api/users/{id}/`** (`user-detail`)
  - Purpose: Full update of user
  - Authentication: Required
  - Permissions: Admins or own profile (with field restrictions)

- **PATCH `/api/users/{id}/`** (`user-detail`)
  - Purpose: Partial update of user
  - Authentication: Required
  - Permissions: Admins or own profile (with field restrictions)

- **DELETE `/api/users/{id}/`** (`user-detail`)
  - Purpose: Delete user account
  - Authentication: Required
  - Permissions: Admin only

### Admin

**Location**: `admin.py`

#### UserAdmin
**Purpose**: Configures Django admin interface for User model.

**Features**:
- **List Display**: Shows `id`, `first_name`, `last_name`, `email`, `role`, `account_status`, `date_joined`, `last_login`
- **List Filters**: Filter by `role`, `account_status`, `date_joined`
- **Search Fields**: Search by `first_name`, `last_name`, `email`

**Access**: Available at `/admin/` for staff users

### Tests

**Location**: `tests/` directory

The test suite uses third-party testing packages: `pytest` and `pytest-django` (not included with Django).

#### test_models.py
Tests for User model and UserManager:
- User creation with valid email and password
- User creation validation (missing email, invalid email)
- Superuser creation
- Duplicate email prevention
- Password handling (with/without password)
- String representation

#### test_serializers.py
Tests for all serializers:
- **UserSerializer**: Field validation, read-only fields, role protection, password write-only
- **RegisterSerializer**: User creation, password hashing, role assignment, validation (email, password length)
- **PasswordChangeSerializer**: Old password validation, new password validation, password update

#### test_views.py
Tests for API endpoints:
- User registration with role enforcement
- User self-view permissions
- User cannot view others
- Role update prevention for non-admins
- Admin can view all users
- Admin can edit other users
- Password change functionality
- Password change validation (wrong old password)

**Test Coverage**: Comprehensive coverage of models, serializers, and views with edge cases and permission scenarios.

## Configuration

### Django Settings

**Location**: `lantaw/settings.py`

**Key Configuration**:
```python
AUTH_USER_MODEL = 'users.User'
```

This setting tells Django to use the custom User model from the `users` app instead of the default `django.contrib.auth.models.User`. This must be set before the first migration.

**Installed Apps**:
The `users` app must be listed in `INSTALLED_APPS`:
```python
INSTALLED_APPS = [
    # ... other apps ...
    'users',
    # ... other apps ...
]
```

### Environment Variables

No app-specific environment variables are required. The app uses Django's standard configuration.

### JWT Configuration

JWT authentication is configured in the main settings file using the third-party package `djangorestframework-simplejwt`. The users app provides endpoints that integrate with this package:
- Token obtain endpoint
- Token refresh endpoint

**Note**: This package must be installed separately (not included with Django) and is listed in `requirements.txt` as `djangorestframework-simplejwt`.

## Usage Examples

### Creating a User Programmatically

```python
from django.contrib.auth import get_user_model

User = get_user_model()

# Create a regular user
user = User.objects.create_user(
    email="john.doe@example.com",
    password="SecurePass123",
    first_name="John",
    last_name="Doe"
)
# Role defaults to PROJECT_STAFF
# Account status defaults to ACTIVE

# Create a superuser
admin = User.objects.create_superuser(
    email="admin@example.com",
    password="AdminPass123",
    first_name="Admin",
    last_name="User"
)
```

### User Registration via API

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "password": "SecurePass123"
  }'
```

### Obtaining JWT Token

```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### Changing Password

```bash
curl -X PUT http://localhost:8000/api/password/change/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "OldPass123",
    "new_password": "NewPass456"
  }'
```

### Viewing User Profile

```bash
# View own profile
curl -X GET http://localhost:8000/api/users/{user_id}/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Admin viewing all users
curl -X GET http://localhost:8000/api/users/ \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### Updating User Profile

```bash
curl -X PATCH http://localhost:8000/api/users/{user_id}/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Updated",
    "last_name": "Name"
  }'
```

### Checking User Role in Views

```python
from rest_framework import permissions

class MyView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role == "ADMIN":
            # Admin-specific logic
            pass
        elif user.role == "EXECUTIVE":
            # Executive-specific logic
            pass
        else:
            # PROJECT_STAFF logic
            pass
```

## Important Notes

### Role Assignment
- New users are **always** assigned the `PROJECT_STAFF` role during registration, regardless of what is provided in the request
- Only admins can change user roles through the admin interface or API
- Role changes are prevented in serializers and views for non-admin users

### Email Uniqueness
- Email addresses must be unique across the system
- Attempting to create a user with an existing email will raise a database integrity error

### Password Security
- Passwords are never returned in API responses (write-only field)
- Passwords are hashed using Django's password hashing system
- Password validation follows Django's `AUTH_PASSWORD_VALIDATORS` settings
- Minimum password length is enforced at the serializer level (8 characters)

### Permission Model
- **Admins**: Full access to all users and can modify any field
- **Non-Admins**: Can only view and update their own profile
- **Protected Fields**: Non-admins cannot modify `role`, `is_staff`, `is_superuser`, `is_active`, or `date_joined`

### Account Status
- Account status can be set to `ACTIVE`, `DEACTIVATED`, or `SUSPENDED`
- This field is separate from Django's `is_active` field
- Both fields may need to be checked for complete access control

### Migration Considerations
- The custom User model was introduced early in the project (migration 0001)
- Username field was removed in migration 0004
- UserManager was updated in migration 0005
- **Important**: Do not change `AUTH_USER_MODEL` after initial migrations without careful planning

### Project Relationships
- Users have a reverse relationship to projects through `projectmembers_set`
- The `UserSerializer` includes a `projects` field that lists project IDs
- This relationship is managed by the `projects` app

## Related Documentation

- [Django Custom User Model](https://docs.djangoproject.com/en/stable/topics/auth/customizing/#using-a-custom-user-model-when-starting-a-project)
- [Django REST Framework Authentication](https://www.django-rest-framework.org/api-guide/authentication/)
- [JWT Authentication](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Projects App Documentation](./projects.md) - For project membership relationships
- [Django Admin Documentation](https://docs.djangoproject.com/en/stable/ref/contrib/admin/)


from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import models

"""
Custom user manager to assert that: 
- Email is used as the unique identifier
- Email is validated for correct format
- Roles are automatically assigned to PROJECT_STAFF on registration
"""
class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        try:
            validate_email(email)
        except ValidationError:
            raise ValueError("Enter a valid email address")
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    """
    Custom user model for the application.

    Fields:
    - id: Primary key (string-based identifier).
    - first_name: User’s given name.
    - last_name: User’s family name.
    - role: Category indicating the user's role (e.g., Admin, Executive, Project Staff).
    - email: Unique email address (required for login).
    - password: Securely hashed password.
    - date_joined: Timestamp of when the account was created.
    - last_login: Timestamp of the most recent login.
    - account_status: Category indicating the current status of the account
    (e.g., Active, Suspended, Deactivated).
    """


    ACCOUNT_STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('DEACTIVATED', 'Deactivated'),
        ('SUSPENDED', 'Suspended'),
    ]  

    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('EXECUTIVE', 'Executive'),
        ('PROJECT_STAFF', 'Project Staff'),
    ]

    username = None
    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='PROJECT_STAFF',
    ) 

    account_status = models.CharField(
        max_length=20,
        choices=ACCOUNT_STATUS_CHOICES,
        default='ACTIVE',
    )

    USERNAME_FIELD = 'email'    
    REQUIRED_FIELDS = []  

    objects = UserManager()

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"



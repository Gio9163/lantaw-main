from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import models
from django.utils import timezone

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
        ('PENDING_APPROVAL', 'Pending Approval'),
        ('REJECTED', 'Rejected'),
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
        null=True,
        blank=True,
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


REQUESTABLE_ROLE_CHOICES = [
    ('EXECUTIVE', 'Executive'),
    ('PROJECT_STAFF', 'Project Staff'),
]


class ProjectInvitation(models.Model):
    code = models.CharField(max_length=64, unique=True)
    email = models.EmailField(blank=True)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='registration_invitations',
    )
    allowed_role = models.CharField(max_length=20, choices=REQUESTABLE_ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    message = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    max_uses = models.PositiveIntegerField(default=1)
    used_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.PROTECT,
        related_name='created_project_invitations',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['code']

    def is_available_for(self, requested_role, email=None, at=None, allow_accepted=False):
        at = at or timezone.now()
        return (
            self.is_active
            and self.revoked_at is None
            and self.project_id is not None
            and self.allowed_role == requested_role
            and (not self.email or (email and self.email.lower() == email.lower()))
            and (self.expires_at is None or self.expires_at > at)
            and self.used_count < self.max_uses
            and (allow_accepted or self.max_uses != 1 or self.accepted_at is None)
        )

    def __str__(self):
        return f"{self.code} - {self.project} ({self.allowed_role})"


class RegistrationRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='registration_requests',
    )
    requested_role = models.CharField(max_length=20, choices=REQUESTABLE_ROLE_CHOICES)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.PROTECT,
        related_name='registration_requests',
    )
    invitation = models.ForeignKey(
        ProjectInvitation,
        on_delete=models.PROTECT,
        related_name='registration_requests',
    )
    existing_user = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='reviewed_registration_requests',
    )
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ['-submitted_at', '-id']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'project'],
                condition=models.Q(status='PENDING'),
                name='unique_pending_registration_per_user_project',
            ),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.requested_role} ({self.status})"

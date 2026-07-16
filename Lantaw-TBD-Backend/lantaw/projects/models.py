from django.db import models
from users.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

class Project(models.Model):
    """
    Model to represent a project in the application.
    Fields:
    - name: Name of the project.
    - project_leader: Name of the project leader.
    - description: Detailed description of the project.
    - grant_amount: Financial grant amount allocated to the project.
    - project_status: Current status of the project (e.g., Active, Completed, On Hold).
    - date_start: Start date of the project.
    - date_end: End date of the project.
    """

    PROJECT_STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('ON_HOLD', 'On Hold'),
    ]

    name = models.CharField(max_length=255, null=False, blank=False)
    project_leader = models.CharField(max_length=255, blank=False, null=False)
    description = models.TextField(blank=True)
    grant_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0.00), MaxValueValidator(999999999999.99)])
    project_status = models.CharField(
        max_length=20,
        choices=PROJECT_STATUS_CHOICES,
        default='ACTIVE',
    )
    date_start = models.DateField()
    date_end = models.DateField()

    def clean(self):
    # Skip comparison if either date is missing
        if self.date_start and self.date_end:
            if self.date_start > self.date_end:
                raise ValidationError("Start date cannot be after end date.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.project_status}) - {self.description}"

class ProjectMembers(models.Model):
    """
    Model to associate users that can modify the project based on their roles.

    Fields:
    - user: Foreign key to the User model.
    - project: Foreign key to the Project model.
    - date_joined: Timestamp of when the user was added to the project.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    date_joined = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'project')

    def __str__(self):
        return f"{self.user.email} - {self.project} ({self.user.role})"
    
class ProjectPersonnel(models.Model):
    """
    Model to associate personnel to projects.

    Fields:
    - personnel: Foreign key to the Personnel model.
    - project: Foreign key to the Project model.
    """

    personnel = models.ForeignKey('personnel.Personnel', on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('personnel', 'project')
    
    def __str__(self):
        return f"{self.personnel} - {self.project}"

class BudgetItem(models.Model):
    """
    Model to represent budget items for a project.
    
    Fields:
    - project: Foreign key to the Project model.
    - category: Budget category (PS, MOOE, CO).
    - description: Description of the budget item.
    - amount: Amount allocated for this item.
    - created_at: Timestamp when the item was created.
    - updated_at: Timestamp when the item was last updated.
    """
    
    CATEGORY_CHOICES = [
        ('PS', 'Personnel Services'),
        ('MOOE', 'Maintenance and Other Operating Expenses'),
        ('CO', 'Capital Outlay'),
    ]
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='budget_items')
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, null=False, blank=False)
    description = models.CharField(max_length=255, null=False, blank=False)
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=False, 
        blank=False,
        validators=[MinValueValidator(0.00)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['category', 'created_at']
    
    def __str__(self):
        return f"{self.get_category_display()} - {self.description} - ₱{self.amount}"
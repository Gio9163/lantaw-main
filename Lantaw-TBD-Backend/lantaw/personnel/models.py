from django.db import models
class Personnel(models.Model):
    """
    Model to represent personnel in the application.
    Fields:
    - first_name: Personnel's given name.
    - last_name: Personnel's family name.
    - role: Foreign key to the Role model.
    - department: Foreign key to the Department model.
    - employment_status: Current status of employment (e.g., Active, Inactive, Terminated).
    """

    EMPLOYMENT_STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('TERMINATED', 'Terminated'),
    ]

    first_name = models.CharField(max_length=100, null=False)
    last_name = models.CharField(max_length=100, null=False)
    role = models.ForeignKey('Role', on_delete=models.SET_NULL, null=True)
    department = models.ForeignKey('Department', on_delete=models.SET_NULL, null=True)
    employment_status = models.CharField(
        max_length=20, 
        choices=EMPLOYMENT_STATUS_CHOICES,
        default='ACTIVE',
    )

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.role})"

class Role(models.Model):
    """
    Role model to define different personnel roles within the organization.
    Fields:
    - name: Name of the role, must be unique
    - project: Optional ForeignKey to Project for project-specific roles
    """

    name = models.CharField(max_length=30, blank=True)
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="roles", null=False, blank=True)
    
    class Meta:
        unique_together = ('name', 'project')

    def __str__(self):
        return self.name

class Department(models.Model):
    """
    Department model to define different departments within the organization.
    Fields:
    - name: Name of the department, must be unique
    - project: Optional ForeignKey to Project for project-specific departments
    """

    name = models.CharField(max_length=50, blank=True)
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="departments", null=False, blank=True)

    class Meta:
        unique_together = ('name', 'project')
        
    def __str__(self):
        return self.name
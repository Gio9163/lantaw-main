from django.db import models
from decimal import Decimal
from projects.models import Project
from personnel.models import Personnel

class BudgetLineItem(models.Model):
    """
    Model to represent a budget line item in the application.
    Fields:
    project_id: Foreign key to the Project model.
    category: Category of the budget item (e.g., MOOE, PS, CO).
    date_created: Timestamp of when the budget item was added.
    date_modified: Timestamp of the most recent modification.
    """

    BUDGET_ITEM_CHOICES = [
        ('MOOE', 'Maintenance and Other Operating Expenses'),
        ('PS', 'Personal Services'),
        ('CO', 'Capital Outlay'),
    ]

    name = models.CharField(
        max_length=20,
        choices=BUDGET_ITEM_CHOICES,
        null=False,
        blank=False,
    )
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    date_created = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

    # Project and name should be unique together
    class Meta:
        unique_together = ('project', 'name')
        ordering = ['-date_created']

    def __str__(self):
        return f"{self.name} - {self.project.name}"

class Compensation(models.Model):
    """
    Model to represent compensation details for personnel.
    Fields:
    - type: Category of compensation (e.g., Salary, Honoraria).
    - budgetItemId: Foreign key to the BudgetLineItem model.
    - personnelId: Foreign key to the Personnel model.
    - reason: Description or reason for the compensation.
    - amount: Monetary value of the compensation.
    - dateEffective: Date when the compensation takes effect.
    - dateModided: Timestamp of the most recent modification.
    """
    COMPENSATION_TYPE_CHOICES = [
        ('SALARY', 'Salary'),
        ('HONORARIA', 'Honoraria'),
    ]
    type = models.CharField(
        max_length=20,
        choices=COMPENSATION_TYPE_CHOICES,
        null=False,
        blank=False,
    )
    budget_item = models.ForeignKey(BudgetLineItem, on_delete=models.CASCADE)
    personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE)
    reason = models.TextField(blank=True)
    monthly_rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    duration_months = models.PositiveSmallIntegerField(null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    date_effective = models.DateField()
    date_modified = models.DateTimeField(auto_now=True)

    # Type and personnel should be unique together (Personnel 1 - Salary is unique Personel 1 - Honoraria is unique and should not have multiple entries for each type)
    class Meta:
        unique_together = ('type', 'personnel')
        ordering = ['-date_modified']

    @property
    def monthly_salary(self):
        if self.type == 'SALARY':
            return self.monthly_rate or Decimal('0.00')
        return Decimal('0.00')

    @property
    def honoraria(self):
        if self.type == 'HONORARIA':
            return self.monthly_rate or Decimal('0.00')
        return Decimal('0.00')

    @property
    def total_compensation(self):
        return self.amount or Decimal('0.00')

    def __str__(self):
        return f"{self.personnel.first_name} {self.personnel.last_name} - {self.type} - {self.amount}"

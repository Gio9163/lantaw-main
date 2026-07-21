from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Project
from budget.models import BudgetLineItem

@receiver(post_save, sender=Project)
def create_default_budget_items(sender, instance, created, **kwargs):
    if kwargs.get('raw') or not created:
        return

    for code, _ in BudgetLineItem.BUDGET_ITEM_CHOICES:
        BudgetLineItem.objects.get_or_create(
            project=instance,
            name=code,
        )

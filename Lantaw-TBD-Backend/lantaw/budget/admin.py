from django.contrib import admin
from .models import BudgetLineItem, Compensation

@admin.register(BudgetLineItem)
class BudgetLineItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'project', 'date_created', 'date_modified')
    list_filter = ('name', 'date_created')
    search_fields = ('project__name', 'name')

@admin.register(Compensation)
class CompensationAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'budget_item', 'personnel', 'amount', 'date_effective', 'date_modified')
    list_filter = ('type', 'date_effective')
    search_fields = ('personnel__first_name', 'personnel__last_name', 'budget_item__name')
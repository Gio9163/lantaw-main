from django.contrib import admin
from .models import ChangeRequest


@admin.register(ChangeRequest)
class ChangeRequestAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'project',
        'change_type',
        'operation',
        'status',
        'submitted_by',
        'date_submitted',
        'approved_by',
        'date_processed',
    ]
    list_filter = ['status', 'change_type', 'operation', 'date_submitted']
    search_fields = ['project__name', 'submitted_by__email', 'description']
    readonly_fields = ['date_submitted', 'date_processed']
    ordering = ['-date_submitted']

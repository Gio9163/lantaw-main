from django.contrib import admin
from .models import HistoryLog


@admin.register(HistoryLog)
class HistoryLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'timestamp', 'user', 'action', 'change_type', 'project', 'description']
    list_filter = ['action', 'change_type', 'timestamp', 'project']
    search_fields = ['description', 'user__email', 'project__name']
    readonly_fields = ['timestamp']
    ordering = ['-timestamp']


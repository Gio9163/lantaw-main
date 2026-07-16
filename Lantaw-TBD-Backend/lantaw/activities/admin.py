from django.contrib import admin
from .models import Objective, Activity

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'activity_status', 'objective', 'date_created', 'date_modified')
    list_filter = ('activity_status', 'date_created', 'date_modified')
    search_fields = ('title', 'objective__title')

@admin.register(Objective)
class ObjectiveAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'project')
    search_fields = ('title', 'project__name')
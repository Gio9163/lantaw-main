from django.contrib import admin
from .models import Project, ProjectMembers, ProjectPersonnel

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'leader', 'description','project_status', 'date_start', 'date_end', 'grant_amount')
    list_filter = ('project_status', 'date_start', 'date_end')
    
    def leader(self, obj):
        return obj.project_leader or '-'
    leader.short_description = 'Leader'

@admin.register(ProjectMembers)
class ProjectMembersAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'project', 'date_joined')
    list_filter = ('date_joined',)
    search_fields = ('user__first_name', 'user__last_name', 'project__name')

@admin.register(ProjectPersonnel)
class ProjectPersonnelAdmin(admin.ModelAdmin):
    list_display = ('id', 'personnel', 'project')
    search_fields = ('personnel__first_name', 'personnel__last_name', 'project__name')


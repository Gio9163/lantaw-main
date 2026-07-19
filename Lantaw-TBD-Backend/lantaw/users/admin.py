from django.contrib import admin
from .models import ProjectInvitation, RegistrationRequest, User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'email', 'role', 'account_status', 'date_joined', 'last_login')
    list_filter = ('role', 'account_status', 'date_joined')
    search_fields = ('first_name', 'last_name', 'email')


@admin.register(ProjectInvitation)
class ProjectInvitationAdmin(admin.ModelAdmin):
    list_display = ('code', 'project', 'allowed_role', 'is_active', 'used_count', 'max_uses', 'expires_at')
    list_filter = ('allowed_role', 'is_active', 'project')
    search_fields = ('code', 'project__name')


@admin.register(RegistrationRequest)
class RegistrationRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'requested_role', 'project', 'status', 'submitted_at', 'reviewed_by')
    list_filter = ('status', 'requested_role', 'project')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('submitted_at', 'reviewed_at')

# Register your models here.

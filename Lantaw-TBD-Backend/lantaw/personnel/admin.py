from django.contrib import admin
from .models import Personnel, Role, Department

@admin.register(Personnel)
class PersonnelAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'role', 'department', 'employment_status')
    list_filter = ('role', 'department', 'employment_status')
    search_fields = ('first_name', 'last_name')

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)

# Register your models here.

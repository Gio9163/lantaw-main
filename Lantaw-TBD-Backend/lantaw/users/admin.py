from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'first_name', 'last_name', 'email', 'role', 'account_status', 'date_joined', 'last_login')
    list_filter = ('role', 'account_status', 'date_joined')
    search_fields = ('first_name', 'last_name', 'email')

# Register your models here.

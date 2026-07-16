import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lantaw.settings')
django.setup()

from users.models import User

superusers = User.objects.filter(is_superuser=True)

print(f"\n{'='*60}")
print(f"Found {superusers.count()} superuser(s) in the database:")
print(f"{'='*60}\n")

for su in superusers:
    print(f"Email:        {su.email}")
    print(f"Name:         {su.first_name} {su.last_name}")
    print(f"ID:           {su.id}")
    print(f"Is Staff:     {su.is_staff}")
    print(f"Is Active:    {su.is_active}")
    print(f"Role:         {su.role}")
    print(f"Account Status: {su.account_status}")
    print(f"Date Joined:  {su.date_joined}")
    print(f"Last Login:   {su.last_login or 'Never'}")
    print(f"{'-'*60}\n")



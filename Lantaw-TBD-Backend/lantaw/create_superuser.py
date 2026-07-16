import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lantaw.settings')
django.setup()

from users.models import User

# Check if superuser already exists
if User.objects.filter(is_superuser=True).exists():
    print("Superuser already exists:")
    for su in User.objects.filter(is_superuser=True):
        print(f"  - {su.email}")
    print("\nTo create a new superuser, please use: python manage.py createsuperuser")
else:
    # Create a new superuser
    email = input("Enter email address: ")
    password = input("Enter password: ")
    first_name = input("Enter first name (optional): ") or ""
    last_name = input("Enter last name (optional): ") or ""
    
    try:
        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        print(f"\n✓ Superuser created successfully!")
        print(f"  Email: {user.email}")
        print(f"  Name: {user.first_name} {user.last_name}")
    except Exception as e:
        print(f"\n✗ Error creating superuser: {e}")



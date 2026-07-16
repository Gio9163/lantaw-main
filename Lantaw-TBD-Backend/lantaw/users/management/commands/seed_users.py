from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django_seed import Seed

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database with sample users and groups'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting to seed users...'))
        
        seeder = Seed.seeder()

        # Create admin user
        admin_user, created = User.objects.get_or_create(
            email='admin@lantaw.com',
            defaults={
                'first_name': 'Admin',
                'last_name': 'User',
                'role': 'ADMIN',
                'account_status': 'ACTIVE',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created admin user: {admin_user.email}'))
        else:
            self.stdout.write(self.style.WARNING(f'Admin user already exists: {admin_user.email}'))

        # Create executive user
        executive_user, created = User.objects.get_or_create(
            email='executive@lantaw.com',
            defaults={
                'first_name': 'Executive',
                'last_name': 'User',
                'role': 'EXECUTIVE',
                'account_status': 'ACTIVE',
            }
        )
        if created:
            executive_user.set_password('executive123')
            executive_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created executive user: {executive_user.email}'))
        else:
            self.stdout.write(self.style.WARNING(f'Executive user already exists: {executive_user.email}'))

        # Create project staff users using faker
        for _ in range(3):
            first_name = seeder.faker.first_name()
            last_name = seeder.faker.last_name()
            email = f"{first_name.lower()}.{last_name.lower()}@lantaw.com"
            
            staff_user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'role': 'PROJECT_STAFF',
                    'account_status': 'ACTIVE',
                }
            )
            if created:
                staff_user.set_password('staff123')
                staff_user.save()
                self.stdout.write(self.style.SUCCESS(f'Created staff user: {staff_user.email}'))
            else:
                self.stdout.write(self.style.WARNING(f'Staff user already exists: {staff_user.email}'))

        # Seed groups
        self._seed_groups(seeder)

        self.stdout.write(self.style.SUCCESS('Successfully seeded users and groups!'))
    
    def _seed_groups(self, seeder):
        """
        Helper method to seed groups.
        """
        self.stdout.write(self.style.SUCCESS('Starting to seed groups...'))
        
        # Create standard groups based on project roles
        standard_groups = [
            'Administrators',
            'Executives',
            'Project Managers',
            'Project Staff',
            'Finance Team',
            'HR Team',
            'Development Team',
        ]

        created_count = 0
        
        # Create standard groups
        for group_name in standard_groups:
            group, created = Group.objects.get_or_create(name=group_name)
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created group: {group.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Group already exists: {group.name}'))

        # Create additional groups using faker
        department_base_names = [
            'Engineering', 'Design', 'Operations', 'Administration', 
            'Development', 'Quality Assurance', 'Marketing', 'Finance',
            'Research', 'Analytics', 'Support', 'Sales'
        ]
        
        # Generate 5-8 additional groups using faker
        num_additional = seeder.faker.random_int(min=5, max=8)
        
        for _ in range(num_additional):
            # Create group names using faker
            group_name_options = [
                f"{seeder.faker.random.choice(department_base_names)} Team",
                f"{seeder.faker.job()} Group",
                f"{seeder.faker.catch_phrase()} Committee",
                f"{seeder.faker.company()} Department",
                f"{seeder.faker.bs().title()} Team",
            ]
            group_name = seeder.faker.random.choice(group_name_options)
            
            # Ensure uniqueness by checking if it already exists
            if not Group.objects.filter(name=group_name).exists():
                group = Group.objects.create(name=group_name)
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created group: {group.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Group name already exists, skipping: {group_name}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {created_count} groups!'))



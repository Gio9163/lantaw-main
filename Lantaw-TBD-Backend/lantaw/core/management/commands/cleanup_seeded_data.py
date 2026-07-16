from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from activities.models import Activity, Objective
from budget.models import Compensation, BudgetLineItem
from personnel.models import Personnel, Role, Department
from projects.models import Project, ProjectMembers

User = get_user_model()


class Command(BaseCommand):
    help = 'Delete all seeded data from the database'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('=' * 60))
        self.stdout.write(self.style.WARNING('Starting cleanup of seeded data...'))
        self.stdout.write(self.style.WARNING('=' * 60))

        deleted_counts = {}

        # 1. Delete Activities (depends on Objectives, BudgetLineItems)
        self.stdout.write(self.style.SUCCESS('\n[ACTIVITIES] Deleting activities...'))
        count = Activity.objects.all().delete()[0]
        deleted_counts['activities'] = count
        self.stdout.write(self.style.SUCCESS(f'[ACTIVITIES] Deleted {count} activities'))

        # 2. Delete Objectives (depends on Projects)
        self.stdout.write(self.style.SUCCESS('\n[OBJECTIVES] Deleting objectives...'))
        count = Objective.objects.all().delete()[0]
        deleted_counts['objectives'] = count
        self.stdout.write(self.style.SUCCESS(f'[OBJECTIVES] Deleted {count} objectives'))

        # 3. Delete Compensations (depends on Personnel, BudgetLineItems)
        self.stdout.write(self.style.SUCCESS('\n[COMPENSATIONS] Deleting compensations...'))
        count = Compensation.objects.all().delete()[0]
        deleted_counts['compensations'] = count
        self.stdout.write(self.style.SUCCESS(f'[COMPENSATIONS] Deleted {count} compensations'))

        # 4. Delete BudgetLineItems (depends on Projects)
        self.stdout.write(self.style.SUCCESS('\n[BUDGET LINE ITEMS] Deleting budget line items...'))
        count = BudgetLineItem.objects.all().delete()[0]
        deleted_counts['budget_line_items'] = count
        self.stdout.write(self.style.SUCCESS(f'[BUDGET LINE ITEMS] Deleted {count} budget line items'))

        # 5. Delete Personnel (depends on Roles, Departments - but SET_NULL allows deletion)
        self.stdout.write(self.style.SUCCESS('\n[PERSONNEL] Deleting personnel...'))
        count = Personnel.objects.all().delete()[0]
        deleted_counts['personnel'] = count
        self.stdout.write(self.style.SUCCESS(f'[PERSONNEL] Deleted {count} personnel'))

        # 6. Delete Roles (depends on Projects)
        self.stdout.write(self.style.SUCCESS('\n[ROLES] Deleting roles...'))
        count = Role.objects.all().delete()[0]
        deleted_counts['roles'] = count
        self.stdout.write(self.style.SUCCESS(f'[ROLES] Deleted {count} roles'))

        # 7. Delete Departments (depends on Projects)
        self.stdout.write(self.style.SUCCESS('\n[DEPARTMENTS] Deleting departments...'))
        count = Department.objects.all().delete()[0]
        deleted_counts['departments'] = count
        self.stdout.write(self.style.SUCCESS(f'[DEPARTMENTS] Deleted {count} departments'))

        # 8. Delete ProjectMembers (depends on Users, Projects)
        self.stdout.write(self.style.SUCCESS('\n[PROJECT MEMBERS] Deleting project members...'))
        count = ProjectMembers.objects.all().delete()[0]
        deleted_counts['project_members'] = count
        self.stdout.write(self.style.SUCCESS(f'[PROJECT MEMBERS] Deleted {count} project members'))

        # 9. Delete Projects (no direct FK to User, but ProjectMembers links them)
        self.stdout.write(self.style.SUCCESS('\n[PROJECTS] Deleting projects...'))
        count = Project.objects.all().delete()[0]
        deleted_counts['projects'] = count
        self.stdout.write(self.style.SUCCESS(f'[PROJECTS] Deleted {count} projects'))

        # 10. Delete seeded Users
        self.stdout.write(self.style.SUCCESS('\n[USERS] Deleting seeded users...'))
        
        # Delete specific seeded users
        seeded_emails = ['admin@lantaw.com', 'executive@lantaw.com']
        deleted_users = []
        
        for email in seeded_emails:
            try:
                user = User.objects.get(email=email)
                user.delete()
                deleted_users.append(email)
                self.stdout.write(self.style.SUCCESS(f'  Deleted user: {email}'))
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  User not found: {email}'))
        
        # Delete PROJECT_STAFF users with @lantaw.com email
        project_staff_users = User.objects.filter(role='PROJECT_STAFF', email__endswith='@lantaw.com')
        count = project_staff_users.count()
        if count > 0:
            project_staff_users.delete()
            self.stdout.write(self.style.SUCCESS(f'  Deleted {count} PROJECT_STAFF users with @lantaw.com email'))
            deleted_counts['project_staff_users'] = count
        else:
            self.stdout.write(self.style.WARNING('  No PROJECT_STAFF users with @lantaw.com email found'))
        
        deleted_counts['users'] = len(deleted_users) + deleted_counts.get('project_staff_users', 0)

        # Summary
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('Cleanup Summary:'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        for key, count in deleted_counts.items():
            self.stdout.write(self.style.SUCCESS(f'  {key.replace("_", " ").title()}: {count}'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('All seeded data has been deleted successfully!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))


from django.core.management.base import BaseCommand
from activities.models import Objective, Activity
from projects.models import Project
from budget.models import BudgetLineItem
from django_seed import Seed


class Command(BaseCommand):
    help = 'Seed the database with sample objectives and activities'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting to seed activities...'))
        
        seeder = Seed.seeder()

        # Get projects (they should exist from projects seeder)
        projects = Project.objects.all()
        if not projects.exists():
            self.stdout.write(self.style.ERROR('No projects found. Please run seed_projects first.'))
            return

        # Get budget items (they should exist from budget seeder)
        budget_items = BudgetLineItem.objects.all()
        if not budget_items.exists():
            self.stdout.write(self.style.ERROR('No budget items found. Please run seed_budget first.'))
            return

        project1 = projects.first()
        mooe_item = budget_items.filter(name='MOOE').first()
        ps_item = budget_items.filter(name='PS').first()
        co_item = budget_items.filter(name='CO').first()

        # Create objectives for the first project using faker
        created_objectives = []
        for _ in range(2):
            title = seeder.faker.sentence(nb_words=4).rstrip('.')
            description = seeder.faker.text(max_nb_chars=200)
            
            objective, created = Objective.objects.get_or_create(
                title=title,
                project=project1,
                defaults={
                    'project': project1,
                    'title': title,
                    'description': description,
                }
            )
            if created:
                created_objectives.append(objective)
                self.stdout.write(self.style.SUCCESS(f'Created objective: {objective.title}'))
            else:
                self.stdout.write(self.style.WARNING(f'Objective already exists: {objective.title}'))

        # Create activities for objectives using faker
        if created_objectives:
            activity_statuses = ['COMPLETED', 'ACTIVE', 'COMPLETED', 'ACTIVE', 'PENDING']
            budget_items_list = [mooe_item, mooe_item, ps_item, ps_item, ps_item]
            
            for i, objective in enumerate(created_objectives):
                # Create 2-3 activities per objective
                num_activities = 2 if i == 0 else 3
                
                for j in range(num_activities):
                    activity_index = (i * 2) + j if i == 0 else (i * 2) + j
                    if activity_index >= len(activity_statuses):
                        activity_index = activity_index % len(activity_statuses)
                    
                    title = seeder.faker.sentence(nb_words=3).rstrip('.')
                    activity_status = activity_statuses[activity_index] if activity_index < len(activity_statuses) else 'PENDING'
                    activity_budget_item = budget_items_list[activity_index] if activity_index < len(budget_items_list) else ps_item
                    
                    projected_expense = float(seeder.faker.random_int(min=10000, max=100000))
                    actual_expense = None
                    if activity_status == 'COMPLETED':
                        # For completed activities, actual expense is close to projected
                        variance = seeder.faker.random_int(min=-5000, max=5000)
                        actual_expense = max(0, projected_expense + variance)
                    
                    activity, created = Activity.objects.get_or_create(
                        title=title,
                        objective=objective,
                        defaults={
                            'objective': objective,
                            'title': title,
                            'activity_status': activity_status,
                            'activity_budget_item': activity_budget_item,
                            'projected_expense': projected_expense,
                            'actual_expense': actual_expense,
                        }
                    )
                    if created:
                        self.stdout.write(self.style.SUCCESS(f'Created activity: {activity.title}'))
                    else:
                        self.stdout.write(self.style.WARNING(f'Activity already exists: {activity.title}'))

        self.stdout.write(self.style.SUCCESS('Successfully seeded activities!'))



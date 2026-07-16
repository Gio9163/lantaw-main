from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from budget.models import BudgetLineItem, Compensation
from projects.models import Project
from personnel.models import Personnel
from django_seed import Seed


class Command(BaseCommand):
    help = 'Seed the database with sample budget data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting to seed budget...'))
        
        seeder = Seed.seeder()

        # Get projects (they should exist from projects seeder)
        projects = Project.objects.all()
        if not projects.exists():
            self.stdout.write(self.style.ERROR('No projects found. Please run seed_projects first.'))
            return

        # Get personnel (they should exist from personnel seeder)
        personnel_list = Personnel.objects.all()
        if not personnel_list.exists():
            self.stdout.write(self.style.ERROR('No personnel found. Please run seed_personnel first.'))
            return

        # Create budget line items for all projects
        all_budget_items = []
        for project in projects:
            budget_items_data = [
                {'name': 'MOOE', 'project': project},
                {'name': 'PS', 'project': project},
                {'name': 'CO', 'project': project},
            ]
            
            for item_data in budget_items_data:
                budget_item, created = BudgetLineItem.objects.get_or_create(
                    name=item_data['name'],
                    project=item_data['project'],
                    defaults=item_data
                )
                if created:
                    all_budget_items.append(budget_item)
                    self.stdout.write(self.style.SUCCESS(f'Created budget item: {budget_item.name} for {budget_item.project.name}'))
                else:
                    # Add existing items to the list if they're PS items
                    if budget_item.name == 'PS':
                        all_budget_items.append(budget_item)

        # Create compensations using faker for all personnel
        if all_budget_items and personnel_list.exists():
            # Get PS (Personal Services) budget items
            ps_items = [item for item in all_budget_items if item.name == 'PS']
            
            if ps_items:
                compensation_types = ['SALARY', 'HONORARIA']
                created_count = 0
                
                # Create compensations for all personnel
                for personnel in personnel_list:
                    # Randomly select a PS budget item for this personnel
                    ps_item = seeder.faker.random.choice(ps_items)
                    
                    for comp_type in compensation_types:
                        # Generate more varied reasons using faker
                        if comp_type == 'HONORARIA':
                            reason_options = [
                                seeder.faker.sentence(nb_words=6),
                                f"Consultation services for {seeder.faker.catch_phrase()}",
                                f"Advisory role in {seeder.faker.bs()}",
                                f"Special project: {seeder.faker.sentence(nb_words=4)}",
                            ]
                            reason = seeder.faker.random.choice(reason_options)
                            amount = float(seeder.faker.random_int(min=5000, max=25000))
                        else:
                            reason_options = [
                                'Monthly salary',
                                'Regular monthly compensation',
                                'Base salary payment',
                                f"Salary for {seeder.faker.month_name()}",
                            ]
                            reason = seeder.faker.random.choice(reason_options)
                            amount = float(seeder.faker.random_int(min=30000, max=100000))
                        
                        days_ago = seeder.faker.random_int(min=1, max=90)
                        date_effective = timezone.now().date() - timedelta(days=days_ago)
                        
                        compensation, created = Compensation.objects.get_or_create(
                            type=comp_type,
                            personnel=personnel,
                            defaults={
                                'type': comp_type,
                                'budget_item': ps_item,
                                'personnel': personnel,
                                'reason': reason,
                                'amount': amount,
                                'date_effective': date_effective,
                            }
                        )
                        if created:
                            created_count += 1
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f'Created compensation: {compensation.type} for {compensation.personnel.first_name} {compensation.personnel.last_name} - ${compensation.amount:,.2f}'
                                )
                            )
                        else:
                            self.stdout.write(
                                self.style.WARNING(
                                    f'Compensation already exists: {compensation.type} for {compensation.personnel.first_name} {compensation.personnel.last_name}'
                                )
                            )
                
                self.stdout.write(self.style.SUCCESS(f'Created {created_count} compensation entries!'))

        self.stdout.write(self.style.SUCCESS('Successfully seeded budget!'))



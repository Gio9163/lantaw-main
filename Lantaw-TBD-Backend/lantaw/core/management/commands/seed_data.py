from django.core.management.base import BaseCommand

from users.management.commands import seed_users
from projects.management.commands import seed_projects
from personnel.management.commands import seed_personnel
from budget.management.commands import seed_budget
from activities.management.commands import seed_activities
from core.management.commands import seed_core


class Command(BaseCommand):
    help = "Seed data for all apps"

    def handle(self, *args, **options):
        seed_users.Command().handle()
        seed_projects.Command().handle()
        seed_personnel.Command().handle()
        seed_budget.Command().handle()
        seed_activities.Command().handle()
        seed_core.Command().handle()

        self.stdout.write(self.style.SUCCESS('✔ All data seeded successfully!'))


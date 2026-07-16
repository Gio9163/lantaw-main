from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Seed the database with core data (currently no models to seed)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting to seed core...'))

        # Core app currently has no models
        # This seeder is a placeholder for future core data seeding

        self.stdout.write(self.style.SUCCESS('Core seeding completed (no data to seed).'))



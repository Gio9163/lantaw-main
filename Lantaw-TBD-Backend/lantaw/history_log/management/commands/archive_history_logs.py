from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction

from history_log.models import ArchivedHistoryLog


class Command(BaseCommand):
    help = 'Purge archived history log entries 30 days after archived_at.'

    def add_arguments(self, parser):
        parser.add_argument('--purge-days', type=int, default=30, help='Permanently delete archived entries older than this many days.')

    def handle(self, *args, **options):
        purge_days = options['purge_days']
        if purge_days <= 0:
            raise CommandError('purge-days must be greater than zero.')

        purge_cutoff = timezone.now() - timezone.timedelta(days=purge_days)

        with transaction.atomic():
            purged_count = ArchivedHistoryLog.objects.filter(
                archived_at__lte=purge_cutoff
            ).delete()[0]

        self.stdout.write(self.style.SUCCESS(f'Purged {purged_count} archived history log entries.'))

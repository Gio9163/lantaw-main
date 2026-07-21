from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction

from history_log.models import ArchivedHistoryLog, HistoryLog


class Command(BaseCommand):
    help = (
        'Archive active history logs after 7 days and purge archived entries '
        '30 days after archived_at.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--archive-days',
            type=int,
            default=7,
            help='Archive active entries older than this many days.',
        )
        parser.add_argument('--purge-days', type=int, default=30, help='Permanently delete archived entries older than this many days.')

    def handle(self, *args, **options):
        archive_days = options['archive_days']
        purge_days = options['purge_days']
        if archive_days <= 0:
            raise CommandError('archive-days must be greater than zero.')
        if purge_days <= archive_days:
            raise CommandError('purge-days must be greater than archive-days.')

        archive_cutoff = timezone.now() - timezone.timedelta(days=archive_days)
        purge_cutoff = timezone.now() - timezone.timedelta(days=purge_days)

        with transaction.atomic():
            due_entries = list(
                HistoryLog.objects.select_for_update()
                .filter(timestamp__lte=archive_cutoff, archived_copy__isnull=True)
                .order_by('id')
            )
            for entry in due_entries:
                ArchivedHistoryLog.objects.create(
                    history_log=entry,
                    timestamp=entry.timestamp,
                    user=entry.user,
                    action=entry.action,
                    change_type=entry.change_type,
                    module=entry.module,
                    description=entry.description,
                    project=entry.project,
                    object_name=entry.object_name,
                    entity_id=entry.entity_id,
                    old_state=entry.old_state,
                    new_state=entry.new_state,
                    user_role=entry.user_role,
                    related_change_request=entry.related_change_request,
                )

            if due_entries:
                HistoryLog.objects.filter(
                    pk__in=[entry.pk for entry in due_entries]
                ).delete()

            purged_count = ArchivedHistoryLog.objects.filter(
                archived_at__lte=purge_cutoff
            ).delete()[0]

        self.stdout.write(
            self.style.SUCCESS(f'Archived {len(due_entries)} history log entries.')
        )
        self.stdout.write(self.style.SUCCESS(f'Purged {purged_count} archived history log entries.'))

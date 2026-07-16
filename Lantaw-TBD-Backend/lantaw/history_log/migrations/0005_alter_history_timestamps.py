from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [('history_log', '0004_alter_archivedhistorylog_history_log')]

    operations = [
        migrations.AlterField(
            model_name='historylog', name='timestamp',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AlterField(
            model_name='archivedhistorylog', name='timestamp',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]

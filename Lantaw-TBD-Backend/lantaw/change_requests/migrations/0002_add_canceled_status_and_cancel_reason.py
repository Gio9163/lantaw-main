# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('change_requests', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='changerequest',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'Pending'),
                    ('APPROVED', 'Approved'),
                    ('REJECTED', 'Rejected'),
                    ('CANCELED', 'Canceled'),
                ],
                default='PENDING',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='changerequest',
            name='cancel_reason',
            field=models.TextField(blank=True),
        ),
    ]


from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('budget', '0006_alter_budgetlineitem_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='compensation',
            name='duration_months',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='compensation',
            name='monthly_rate',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
    ]

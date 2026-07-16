from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('change_requests', '0003_alter_changerequest_options_and_more')]

    operations = [
        migrations.AlterField(
            model_name='changerequest',
            name='project',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='projects.project',
            ),
        ),
    ]

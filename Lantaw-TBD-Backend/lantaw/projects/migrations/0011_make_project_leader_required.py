# Generated manually

from django.db import migrations, models


def set_default_project_leader(apps, schema_editor):
    """Set a default value for existing projects without a project leader"""
    Project = apps.get_model('projects', 'Project')
    Project.objects.filter(project_leader__isnull=True).update(project_leader='')


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0010_project_project_leader'),
    ]

    operations = [
        migrations.RunPython(set_default_project_leader),
        migrations.AlterField(
            model_name='project',
            name='project_leader',
            field=models.CharField(max_length=255),
        ),
    ]

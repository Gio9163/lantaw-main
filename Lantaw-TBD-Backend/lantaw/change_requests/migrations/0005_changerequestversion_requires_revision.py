from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('change_requests', '0004_changerequest_project_nullable'),
    ]

    operations = [
        migrations.AddField(
            model_name='changerequestversion',
            name='requires_revision',
            field=models.BooleanField(
                default=False,
                help_text='The applied change was reverted and must be revised by Project Staff before review.',
            ),
        ),
    ]

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('history_log', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ArchivedHistoryLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('action', models.CharField(choices=[('CREATE', 'Create'), ('UPDATE', 'Update'), ('DELETE', 'Delete'), ('REVERT', 'Revert'), ('ASSIGN', 'Assign'), ('REMOVE', 'Remove'), ('SUBMIT', 'Submit'), ('APPROVE', 'Approve'), ('REJECT', 'Reject'), ('CANCEL', 'Cancel'), ('LOGIN', 'Login'), ('LOGOUT', 'Logout')], max_length=10)),
                ('change_type', models.CharField(choices=[('ACTIVITY', 'Activity'), ('OBJECTIVE', 'Objective'), ('PERSONNEL', 'Personnel'), ('BUDGET', 'Budget'), ('COMPENSATION', 'Compensation'), ('PROJECT', 'Project'), ('ROLE', 'Role'), ('DEPARTMENT', 'Department'), ('CHANGE_REQUEST', 'Change Request'), ('USER', 'User')], max_length=20)),
                ('module', models.CharField(blank=True, default='GENERAL', max_length=30)),
                ('description', models.TextField()),
                ('object_name', models.CharField(blank=True, max_length=255, null=True)),
                ('entity_id', models.IntegerField(blank=True, null=True)),
                ('old_state', models.JSONField(blank=True, null=True)),
                ('new_state', models.JSONField(blank=True, null=True)),
                ('user_role', models.CharField(blank=True, max_length=20, null=True)),
                ('archived_at', models.DateTimeField(auto_now_add=True)),
                ('history_log', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='archived_copy', to='history_log.historylog')),
                ('project', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='archived_history_log_entries', to='projects.project')),
                ('related_change_request', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='archived_history_log_entries', to='change_requests.changerequest')),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='archived_history_log_entries', to='users.user')),
            ],
            options={
                'ordering': ['-archived_at'],
                'indexes': [
                    models.Index(fields=['project', 'archived_at'], name='history_log_project_archived_at_idx'),
                    models.Index(fields=['user', 'archived_at'], name='history_log_user_archived_at_idx'),
                    models.Index(fields=['change_type', 'archived_at'], name='history_log_change_type_archived_at_idx'),
                ],
            },
        ),
    ]

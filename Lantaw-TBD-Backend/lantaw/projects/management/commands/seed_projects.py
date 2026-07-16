from decimal import Decimal
from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed realistic sample projects, objectives, activities, personnel assignments, budgets, compensation, and history logs.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting to seed projects...'))

        Project = self._get_model('projects', 'Project')
        ProjectMembers = self._get_model('projects', 'ProjectMembers')
        ProjectPersonnel = self._get_model('projects', 'ProjectPersonnel')
        Objective = self._get_model('activities', 'Objective')
        Activity = self._get_model('activities', 'Activity')
        BudgetLineItem = self._get_model('budget', 'BudgetLineItem')
        Compensation = self._get_model('budget', 'Compensation')
        Personnel = self._get_model('personnel', 'Personnel')
        Role = self._get_model('personnel', 'Role')
        Department = self._get_model('personnel', 'Department')
        HistoryLog = self._get_model('history_log', 'HistoryLog')

        if not all([Project, ProjectMembers, ProjectPersonnel, Objective, Activity]):
            self.stdout.write(self.style.ERROR('Required project-related models are unavailable.'))
            return

        with transaction.atomic():
            admin_user = self._ensure_user('admin@lantaw.com', 'admin123', 'ADMIN', 'Admin', 'User')
            executive_user = self._ensure_user('executive@lantaw.com', 'executive123', 'EXECUTIVE', 'Executive', 'User')
            staff_users = [
                self._ensure_user('staff1@lantaw.com', 'staff123', 'PROJECT_STAFF', 'Staff', 'One'),
                self._ensure_user('staff2@lantaw.com', 'staff123', 'PROJECT_STAFF', 'Staff', 'Two'),
                self._ensure_user('staff3@lantaw.com', 'staff123', 'PROJECT_STAFF', 'Staff', 'Three'),
            ]

            project_templates = [
                {
                    'name': 'Community Health Information System',
                    'description': 'A centralized platform for managing patient records, appointments, and reporting for community health centers.',
                    'grant_amount': Decimal('2500000.00'),
                    'date_start': '2026-01-01',
                    'date_end': '2026-06-30',
                    'project_status': 'ACTIVE',
                    'project_leader': 'Admin User',
                    'staff_user': staff_users[0],
                    'objectives': [
                        {
                            'title': 'Improve patient record management.',
                            'description': 'Create a reliable digital record system for health centers.',
                            'activities': ['Develop Electronic Medical Records', 'Train hospital staff'],
                        },
                        {
                            'title': 'Reduce patient waiting time.',
                            'description': 'Streamline appointment and workflow processes.',
                            'activities': ['Implement online appointment scheduling', 'Optimize patient workflow'],
                        },
                        {
                            'title': 'Increase reporting accuracy.',
                            'description': 'Improve reporting and auditing workflows.',
                            'activities': ['Generate automated reports', 'Conduct monthly audits'],
                        },
                    ],
                },
                {
                    'name': 'Smart Agriculture Monitoring System',
                    'description': 'An IoT-powered agriculture platform that monitors environmental conditions and assists farmers with decision-making.',
                    'grant_amount': Decimal('3200000.00'),
                    'date_start': '2026-02-01',
                    'date_end': '2026-09-30',
                    'project_status': 'ACTIVE',
                    'project_leader': 'Admin User',
                    'staff_user': staff_users[1],
                    'objectives': [
                        {
                            'title': 'Monitor soil conditions.',
                            'description': 'Track environmental variables and soil health.',
                            'activities': ['Install IoT sensors', 'Collect environmental data'],
                        },
                        {
                            'title': 'Improve irrigation efficiency.',
                            'description': 'Automate irrigation and alerting.',
                            'activities': ['Deploy automated irrigation', 'Configure alert notifications'],
                        },
                        {
                            'title': 'Increase crop productivity.',
                            'description': 'Use analytics to guide farm operations.',
                            'activities': ['Analyze crop performance', 'Generate farmer reports'],
                        },
                    ],
                },
                {
                    'name': 'Disaster Response Coordination Platform',
                    'description': 'A disaster management system for coordinating emergency response, evacuation centers, and relief operations.',
                    'grant_amount': Decimal('4000000.00'),
                    'date_start': '2026-03-01',
                    'date_end': '2026-12-31',
                    'project_status': 'ACTIVE',
                    'project_leader': 'Admin User',
                    'staff_user': staff_users[2],
                    'objectives': [
                        {
                            'title': 'Improve emergency communication.',
                            'description': 'Support communication with responders and communities.',
                            'activities': ['Deploy SMS notification system', 'Integrate emergency hotline'],
                        },
                        {
                            'title': 'Track evacuation centers.',
                            'description': 'Coordinate shelter and relief logistics.',
                            'activities': ['Monitor evacuation occupancy', 'Manage relief distribution'],
                        },
                        {
                            'title': 'Enhance disaster reporting.',
                            'description': 'Improve incident visibility and reporting.',
                            'activities': ['Create incident reports', 'Build disaster dashboard'],
                        },
                    ],
                },
            ]

            created_projects = []
            for template in project_templates:
                project, created = Project.objects.get_or_create(
                    name=template['name'],
                    defaults={
                        'description': template['description'],
                        'grant_amount': template['grant_amount'],
                        'project_status': template['project_status'],
                        'date_start': template['date_start'],
                        'date_end': template['date_end'],
                        'project_leader': template['project_leader'],
                    },
                )
                if not created:
                    project.description = template['description']
                    project.grant_amount = template['grant_amount']
                    project.project_status = template['project_status']
                    project.date_start = template['date_start']
                    project.date_end = template['date_end']
                    project.project_leader = template['project_leader']
                    project.save()

                if created:
                    created_projects.append(project)
                    self.stdout.write(self.style.SUCCESS(f'Created project: {project.name}'))
                else:
                    self.stdout.write(self.style.WARNING(f'Project already exists: {project.name}'))

                ProjectMembers.objects.get_or_create(user=admin_user, project=project)
                ProjectMembers.objects.get_or_create(user=executive_user, project=project)
                ProjectMembers.objects.get_or_create(user=template['staff_user'], project=project)

                role_names = ['Project Lead', 'Executive', 'Project Staff']
                roles = {}
                for role_name in role_names:
                    role, _ = Role.objects.get_or_create(
                        name=role_name,
                        project=project,
                        defaults={'name': role_name, 'project': project},
                    )
                    roles[role_name] = role

                department, _ = Department.objects.get_or_create(
                    name='Program Management',
                    project=project,
                    defaults={'name': 'Program Management', 'project': project},
                )

                lead_personnel = self._ensure_personnel(Personnel, admin_user, roles['Project Lead'], department)
                executive_personnel = self._ensure_personnel(Personnel, executive_user, roles['Executive'], department)
                staff_personnel = self._ensure_personnel(Personnel, template['staff_user'], roles['Project Staff'], department)

                for personnel in [lead_personnel, executive_personnel, staff_personnel]:
                    ProjectPersonnel.objects.get_or_create(personnel=personnel, project=project)

                for objective_data in template['objectives']:
                    objective, _ = Objective.objects.get_or_create(
                        project=project,
                        title=objective_data['title'],
                        defaults={'description': objective_data['description']},
                    )
                    for activity_title in objective_data['activities']:
                        Activity.objects.get_or_create(
                            objective=objective,
                            title=activity_title,
                            defaults={'activity_status': 'PENDING'},
                        )

                if BudgetLineItem:
                    for budget_name in ['MOOE', 'PS', 'CO']:
                        BudgetLineItem.objects.get_or_create(project=project, name=budget_name)

                if Compensation and BudgetLineItem and Personnel:
                    budget_item = BudgetLineItem.objects.filter(project=project).order_by('name').first()
                    if budget_item:
                        for personnel in [lead_personnel, executive_personnel, staff_personnel]:
                            Compensation.objects.get_or_create(
                                type='SALARY',
                                personnel=personnel,
                                defaults={
                                    'budget_item': budget_item,
                                    'reason': 'Monthly project compensation',
                                    'amount': Decimal('120000.00') if personnel == lead_personnel else Decimal('90000.00'),
                                    'date_effective': project.date_start,
                                },
                            )

                if HistoryLog:
                    self._ensure_history_log(
                        HistoryLog,
                        project=project,
                        user=admin_user,
                        action='CREATE',
                        change_type='PROJECT',
                        description=f'Project "{project.name}" created by the seed command.',
                    )
                    self._ensure_history_log(
                        HistoryLog,
                        project=project,
                        user=admin_user,
                        action='CREATE',
                        change_type='OBJECTIVE',
                        description=f'Objectives seeded for project "{project.name}".',
                    )
                    self._ensure_history_log(
                        HistoryLog,
                        project=project,
                        user=admin_user,
                        action='CREATE',
                        change_type='PERSONNEL',
                        description=f'Personnel assignments seeded for project "{project.name}".',
                    )

            self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(project_templates)} projects and related sample data.'))

    def _get_model(self, app_label, model_name):
        try:
            return apps.get_model(app_label, model_name)
        except LookupError:
            return None

    def _ensure_user(self, email, password, role, first_name, last_name):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first_name,
                'last_name': last_name,
                'role': role,
                'account_status': 'ACTIVE',
                'is_active': True,
                'is_staff': role == 'ADMIN',
                'is_superuser': role == 'ADMIN',
            },
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created user: {user.email}'))
        else:
            self.stdout.write(self.style.WARNING(f'User already exists: {user.email}'))
        return user

    def _ensure_personnel(self, Personnel, user, role, department):
        first_name = user.first_name or 'User'
        last_name = user.last_name or 'User'
        personnel, created = Personnel.objects.get_or_create(
            first_name=first_name,
            last_name=last_name,
            defaults={
                'role': role,
                'department': department,
                'employment_status': 'ACTIVE',
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created personnel: {personnel.first_name} {personnel.last_name}'))
        else:
            if personnel.role_id != role.id or personnel.department_id != department.id:
                personnel.role = role
                personnel.department = department
                personnel.employment_status = 'ACTIVE'
                personnel.save()
        return personnel

    def _ensure_history_log(self, HistoryLog, **kwargs):
        defaults = {
            'old_state': None,
            'new_state': None,
            'entity_id': None,
            'related_change_request': None,
        }
        defaults.update(kwargs)
        HistoryLog.objects.get_or_create(
            project=defaults['project'],
            action=defaults['action'],
            change_type=defaults['change_type'],
            description=defaults['description'],
            defaults={
                'user': defaults['user'],
                'entity_id': None,
                'old_state': None,
                'new_state': None,
                'related_change_request': None,
            },
        )



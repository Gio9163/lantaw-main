from django.core.management.base import BaseCommand
from personnel.models import Role, Department, Personnel
from projects.models import Project, ProjectPersonnel
from django_seed import Seed


class Command(BaseCommand):
    help = 'Seed the database with sample personnel, roles, and departments'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting to seed personnel...'))
        
        seeder = Seed.seeder()

        # Get projects (they should exist from projects seeder)
        projects = Project.objects.all()
        if not projects.exists():
            self.stdout.write(self.style.ERROR('No projects found. Please run seed_projects first.'))
            return

        project1 = projects.first()
        project2 = projects[1] if projects.count() > 1 else project1

        # Create roles for projects using faker
        role_names = [
            seeder.faker.job(),
            seeder.faker.job(),
            seeder.faker.job(),
            seeder.faker.job(),
            seeder.faker.job(),
        ]
        
        projects_for_roles = [project1, project1, project1, project2, project2]
        
        created_roles = []
        for role_name, project in zip(role_names, projects_for_roles):
            role, created = Role.objects.get_or_create(
                name=role_name,
                project=project,
                defaults={'name': role_name, 'project': project}
            )
            if created:
                created_roles.append(role)
                self.stdout.write(self.style.SUCCESS(f'Created role: {role.name} for {role.project.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Role already exists: {role.name}'))

        # Create departments for projects using faker
        department_base_names = ['Engineering', 'Design', 'Operations', 'Administration', 'Development', 'Quality', 'Marketing', 'Finance']
        department_names = [
            seeder.faker.random.choice(department_base_names),
            seeder.faker.random.choice(department_base_names),
            seeder.faker.random.choice(department_base_names),
            seeder.faker.random.choice(department_base_names),
        ]
        
        projects_for_depts = [project1, project1, project2, project2]
        
        created_departments = []
        for dept_name, project in zip(department_names, projects_for_depts):
            department, created = Department.objects.get_or_create(
                name=dept_name,
                project=project,
                defaults={'name': dept_name, 'project': project}
            )
            if created:
                created_departments.append(department)
                self.stdout.write(self.style.SUCCESS(f'Created department: {department.name} for {department.project.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Department already exists: {department.name}'))

        # Create personnel using faker
        employment_statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']
        
        for i in range(4):
            first_name = seeder.faker.first_name()
            last_name = seeder.faker.last_name()
            employment_status = employment_statuses[i]
            
            # Assign role and department based on index
            role = created_roles[i] if i < len(created_roles) else None
            dept_index = i if i < len(created_departments) else (i % len(created_departments) if created_departments else None)
            department = created_departments[dept_index] if dept_index is not None and created_departments else None
            
            personnel, created = Personnel.objects.get_or_create(
                first_name=first_name,
                last_name=last_name,
                defaults={
                    'role': role,
                    'department': department,
                    'employment_status': employment_status,
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created personnel: {personnel.first_name} {personnel.last_name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Personnel already exists: {personnel.first_name} {personnel.last_name}'))

        # Seed project personnel associations now that personnel exist
        self._seed_project_personnel(seeder)

        self.stdout.write(self.style.SUCCESS('Successfully seeded personnel!'))
    
    def _seed_project_personnel(self, seeder):
        """
        Helper method to seed project personnel associations.
        Called after personnel are created to associate them with projects.
        """
        # Get all projects (including existing ones)
        all_projects = Project.objects.all()
        if not all_projects.exists():
            return
        
        # Get all personnel (including newly created ones)
        personnel_list = Personnel.objects.all()
        if not personnel_list.exists():
            return
        
        self.stdout.write(self.style.SUCCESS('Starting to seed project personnel associations...'))
        
        # Create project-personnel associations using faker
        # Assign each personnel to 1-3 random projects
        created_count = 0
        
        for personnel in personnel_list:
            # Randomly assign personnel to 1-3 projects
            num_projects = seeder.faker.random_int(min=1, max=min(3, all_projects.count()))
            selected_projects = seeder.faker.random.sample(list(all_projects), num_projects)
            
            for project in selected_projects:
                project_personnel, created = ProjectPersonnel.objects.get_or_create(
                    personnel=personnel,
                    project=project,
                    defaults={
                        'personnel': personnel,
                        'project': project,
                    }
                )
                if created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Created project personnel: {personnel.first_name} {personnel.last_name} -> {project.name}'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Project personnel already exists: {personnel.first_name} {personnel.last_name} -> {project.name}'
                        )
                    )
        
        if created_count > 0:
            self.stdout.write(self.style.SUCCESS(f'Successfully seeded {created_count} project personnel associations!'))



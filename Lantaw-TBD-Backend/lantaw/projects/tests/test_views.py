from django.test import TestCase
from rest_framework.test import APIClient

from projects.models import Project
from users.models import User


class ProjectAdminReadOnlyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="secret123",
            role="ADMIN",
            first_name="Admin",
            last_name="User",
        )
        self.client.force_authenticate(user=self.admin)

    def test_admin_cannot_create_project(self):
        response = self.client.post(
            "/api/projects/",
            {
                "name": "New Project",
                "project_leader": "Leader",
                "description": "Description",
                "grant_amount": "1000.00",
                "project_status": "ACTIVE",
                "date_start": "2024-01-01",
                "date_end": "2024-12-31",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

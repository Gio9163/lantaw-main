from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from projects.models import Project, ProjectMembers
from users.models import User


class ChangeRequestWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            password="AdminPass123!",
            role="ADMIN",
        )
        self.staff = User.objects.create_user(
            email="staff@example.com",
            first_name="Staff",
            last_name="User",
            password="StaffPass123!",
            role="PROJECT_STAFF",
        )
        self.project = Project.objects.create(
            name="Demo Project",
            description="Demo",
            grant_amount=25000.00,
            project_status="ACTIVE",
            date_start=date(2025, 1, 1),
            date_end=date(2025, 12, 31),
            project_leader="Lead",
        )
        ProjectMembers.objects.create(project=self.project, user=self.staff)

    def test_resubmitted_request_is_reviewable_again(self):
        self.client.force_authenticate(user=self.staff)
        create_response = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/",
            {
                "project": self.project.id,
                "change_type": "PROJECT",
                "operation": "UPDATE",
                "entity_id": self.project.id,
                "description": "First submission",
                "current_state": {"name": self.project.name},
                "proposed_changes": {"name": "Updated name"},
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, 201)
        request_id = create_response.data["id"]

        self.client.force_authenticate(user=self.admin)
        reject_response = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/reject/",
            {"rejection_reason": "Needs more detail"},
            format="json",
        )
        self.assertEqual(reject_response.status_code, 200)

        self.client.force_authenticate(user=self.staff)
        resubmit_response = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/resubmit/",
            {
                "description": "Resubmitted request",
                "proposed_changes": {"name": "Corrected project name"},
                "entity_id": 999999,
                "operation": "DELETE",
                "change_type": "ACTIVITY",
                "current_state": {"name": "Tampered snapshot"},
            },
            format="json",
        )

        self.assertEqual(resubmit_response.status_code, 200)
        self.assertEqual(resubmit_response.data["latest_status"], "PENDING")
        self.assertEqual(resubmit_response.data["status"], "PENDING")
        self.assertIsNone(resubmit_response.data["approved_by"])
        self.assertEqual(resubmit_response.data["proposed_changes"]["name"], "Corrected project name")
        self.assertEqual(resubmit_response.data["entity_id"], self.project.id)
        self.assertEqual(resubmit_response.data["operation"], "UPDATE")
        self.assertEqual(resubmit_response.data["change_type"], "PROJECT")
        self.assertEqual(resubmit_response.data["current_state"], {"name": "Demo Project"})
        self.assertEqual(resubmit_response.data["versions"][0]["proposed_changes"]["name"], "Updated name")
        self.assertEqual(resubmit_response.data["versions"][0]["status"], "REJECTED")

        self.client.force_authenticate(user=self.admin)
        second_reject_response = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/reject/",
            {"rejection_reason": "Still needs changes"},
            format="json",
        )

        self.assertEqual(second_reject_response.status_code, 200)
        self.assertEqual(second_reject_response.data["latest_status"], "REJECTED")

        self.client.force_authenticate(user=self.staff)
        third_submission = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/resubmit/",
            {"description": "Third version"}, format="json",
        )
        self.assertEqual(third_submission.data["current_version"], 3)
        self.client.force_authenticate(user=self.admin)
        approve_response = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/approve/", {}, format="json"
        )
        self.assertEqual(approve_response.status_code, 200)
        self.project.refresh_from_db()
        self.assertEqual(self.project.name, "Corrected project name")

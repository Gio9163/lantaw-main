from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from projects.models import Project, ProjectMembers
from users.models import User
from history_log.models import HistoryLog


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

    def test_admin_can_revert_approved_update_for_staff_revision(self):
        self.client.force_authenticate(user=self.staff)
        create_response = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/",
            {
                "project": self.project.id,
                "change_type": "PROJECT",
                "operation": "UPDATE",
                "entity_id": self.project.id,
                "description": "Rename project",
                "current_state": {"name": "Demo Project"},
                "proposed_changes": {"name": "Incorrect approved name"},
            },
            format="json",
        )
        request_id = create_response.data["id"]

        self.client.force_authenticate(user=self.admin)
        approve_response = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(approve_response.status_code, 200)
        self.project.refresh_from_db()
        self.assertEqual(self.project.name, "Incorrect approved name")

        revert_response = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/revert/",
            {"feedback": "The project name is incomplete. Please correct it."},
            format="json",
        )
        self.assertEqual(revert_response.status_code, 200)
        self.assertEqual(revert_response.data["status"], "PENDING")
        self.assertEqual(revert_response.data["latest_status"], "PENDING")
        self.assertTrue(revert_response.data["latest_version"]["requires_revision"])
        self.assertEqual(
            revert_response.data["latest_feedback"],
            "The project name is incomplete. Please correct it.",
        )
        self.assertEqual(revert_response.data["versions"][0]["status"], "APPROVED")
        self.project.refresh_from_db()
        self.assertEqual(self.project.name, "Demo Project")
        self.assertTrue(
            HistoryLog.objects.filter(
                related_change_request_id=request_id,
                action="REVERT",
            ).exists()
        )

        blocked_approval = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(blocked_approval.status_code, 400)

        self.client.force_authenticate(user=self.staff)
        resubmit_response = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/resubmit/",
            {
                "description": "Corrected project rename",
                "proposed_changes": {"name": "Correct final name"},
            },
            format="json",
        )
        self.assertEqual(resubmit_response.status_code, 200)
        self.assertFalse(resubmit_response.data["latest_version"]["requires_revision"])
        self.assertEqual(resubmit_response.data["current_version"], 3)

        self.client.force_authenticate(user=self.admin)
        final_approval = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/approve/",
            {},
            format="json",
        )
        self.assertEqual(final_approval.status_code, 200)
        self.project.refresh_from_db()
        self.assertEqual(self.project.name, "Correct final name")

    def test_revert_requires_admin_feedback_and_unchanged_applied_data(self):
        self.client.force_authenticate(user=self.staff)
        create_response = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/",
            {
                "project": self.project.id,
                "change_type": "PROJECT",
                "operation": "UPDATE",
                "entity_id": self.project.id,
                "description": "Rename project",
                "current_state": {"name": "Demo Project"},
                "proposed_changes": {"name": "Approved name"},
            },
            format="json",
        )
        request_id = create_response.data["id"]

        self.client.force_authenticate(user=self.admin)
        self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/approve/",
            {},
            format="json",
        )
        missing_feedback = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/revert/",
            {},
            format="json",
        )
        self.assertEqual(missing_feedback.status_code, 400)

        self.project.name = "A later independent edit"
        self.project.save(update_fields=["name"])
        conflict_response = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/revert/",
            {"feedback": "Undo the rename"},
            format="json",
        )
        self.assertEqual(conflict_response.status_code, 400)
        self.project.refresh_from_db()
        self.assertEqual(self.project.name, "A later independent edit")

        self.client.force_authenticate(user=self.staff)
        forbidden_response = self.client.post(
            f"/api/projects/{self.project.id}/change-requests/{request_id}/revert/",
            {"feedback": "Staff cannot revert approvals"},
            format="json",
        )
        self.assertEqual(forbidden_response.status_code, 403)

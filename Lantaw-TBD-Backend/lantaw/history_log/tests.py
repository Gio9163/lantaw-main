from datetime import date
from django.utils import timezone

from django.test import TestCase
from rest_framework.test import APIClient

from history_log.models import ArchivedHistoryLog, HistoryLog
from projects.models import Project
from users.models import User


class HistoryLogArchiveFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email="history-admin@example.com",
            first_name="History",
            last_name="Admin",
            password="AdminPass123!",
            role="ADMIN",
        )
        self.client.force_authenticate(user=self.admin)
        self.project = Project.objects.create(
            name="Archive Project",
            description="For archive tests",
            grant_amount=5000.00,
            project_status="ACTIVE",
            date_start=date(2025, 1, 1),
            date_end=date(2025, 12, 31),
            project_leader="Lead",
        )

    def test_archive_and_restore_workflow(self):
        history_entry = HistoryLog.objects.create(
            timestamp=timezone.now() - timezone.timedelta(days=5),
            user=self.admin,
            action="UPDATE",
            change_type="PROJECT",
            module="PROJECT",
            description="A sample entry",
            project=self.project,
            object_name=self.project.name,
            entity_id=self.project.id,
            user_role=self.admin.role,
        )

        archive_response = self.client.post(f"/api/history-log/{history_entry.id}/archive/")
        self.assertEqual(archive_response.status_code, 200)
        self.assertFalse(HistoryLog.objects.filter(pk=history_entry.id).exists())
        archived_entry = ArchivedHistoryLog.objects.get(description="A sample entry")
        self.assertEqual(archived_entry.description, "A sample entry")
        self.assertEqual(archive_response.data["description"], "A sample entry")
        self.assertIn("purge_at", archive_response.data)
        self.assertEqual(archive_response.data["remaining_days"], 30)

        archive_list_response = self.client.get("/api/history-log/archive/")
        self.assertEqual(archive_list_response.status_code, 200)
        self.assertGreaterEqual(archive_list_response.data["count"], 1)

        restore_response = self.client.post(f"/api/history-log/archive/{archived_entry.id}/restore/")
        self.assertEqual(restore_response.status_code, 201)
        self.assertTrue(HistoryLog.objects.filter(description="A sample entry").exists())
        self.assertFalse(ArchivedHistoryLog.objects.filter(pk=archived_entry.id).exists())
        restored = HistoryLog.objects.get(description="A sample entry")
        self.assertEqual(restored.timestamp, history_entry.timestamp)

    def test_archive_permissions_and_permanent_delete(self):
        staff = User.objects.create_user(
            email="history-staff@example.com",
            password="StaffPass123!",
            role="PROJECT_STAFF",
        )
        history_entry = HistoryLog.objects.create(
            user=self.admin,
            action="UPDATE",
            change_type="PROJECT",
            module="PROJECT",
            description="Permission archive entry",
            project=self.project,
        )

        self.client.force_authenticate(user=staff)
        denied = self.client.post(f"/api/history-log/{history_entry.id}/archive/")
        self.assertEqual(denied.status_code, 403)
        self.assertTrue(HistoryLog.objects.filter(pk=history_entry.id).exists())

        self.client.force_authenticate(user=self.admin)
        archived = self.client.post(f"/api/history-log/{history_entry.id}/archive/")
        self.assertEqual(archived.status_code, 200)
        self.assertIn("archived_at", archived.data)
        self.assertIn("purge_at", archived.data)
        self.assertEqual(archived.data["remaining_days"], 30)
        archived_id = archived.data["id"]

        self.client.force_authenticate(user=staff)
        denied_delete = self.client.delete(
            f"/api/history-log/archive/{archived_id}/permanent-delete/"
        )
        self.assertEqual(denied_delete.status_code, 403)
        self.assertTrue(ArchivedHistoryLog.objects.filter(pk=archived_id).exists())

        self.client.force_authenticate(user=self.admin)
        deleted = self.client.delete(
            f"/api/history-log/archive/{archived_id}/permanent-delete/"
        )
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(ArchivedHistoryLog.objects.filter(pk=archived_id).exists())

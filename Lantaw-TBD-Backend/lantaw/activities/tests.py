from datetime import date

from django.test import TestCase

from activities.models import Activity, Objective
from activities.serializers import ObjectiveReadSerializer
from projects.models import Project


class ObjectiveStatusTests(TestCase):
    def setUp(self):
        self.project = Project.objects.create(
            name="Objective Status Project",
            project_leader="Test Leader",
            description="Status verification",
            grant_amount=1000,
            project_status="ACTIVE",
            date_start=date(2026, 1, 1),
            date_end=date(2026, 12, 31),
        )
        self.objective = Objective.objects.create(
            project=self.project,
            title="Status Objective",
            description="Derived from activities",
        )

    def status(self):
        return ObjectiveReadSerializer(self.objective).data["objective_status"]

    def test_objective_status_tracks_activity_completion(self):
        self.assertEqual(self.status(), "NOT_STARTED")

        first = Activity.objects.create(
            objective=self.objective,
            title="First",
            activity_status="PENDING",
        )
        second = Activity.objects.create(
            objective=self.objective,
            title="Second",
            activity_status="ACTIVE",
        )
        self.assertEqual(self.status(), "NOT_STARTED")

        first.activity_status = "COMPLETED"
        first.save(update_fields=["activity_status", "date_modified"])
        self.assertEqual(self.status(), "IN_PROGRESS")

        second.activity_status = "COMPLETED"
        second.save(update_fields=["activity_status", "date_modified"])
        self.assertEqual(self.status(), "COMPLETED")

        first.activity_status = "PENDING"
        first.save(update_fields=["activity_status", "date_modified"])
        self.assertEqual(self.status(), "IN_PROGRESS")

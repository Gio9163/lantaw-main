"""Development/presentation seed for the ReSEED-DASIG Growth Track Year 2 project."""

from datetime import date, datetime
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from activities.models import Activity, Objective
from budget.models import BudgetLineItem, Compensation
from history_log.models import HistoryLog
from history_log.services import log_history
from personnel.models import Department, Personnel, Role
from projects.models import BudgetItem, Project, ProjectMembers, ProjectPersonnel
from users.models import ProjectInvitation, User


OLD_PROJECT_NAME = (
    "HEIRIT ReSEED 2.0: DASIG Region VII – Development and Acceleration "
    "Support for Innovation Growth"
)
PROJECT_NAME = "HEIRIT ReSEED 2.0: DASIG Region VII"
PROJECT_DESCRIPTION = "Development and Acceleration Support for Innovation Growth"
APPROVED_Y2 = Decimal("1370768.00")
YEAR_1_CARRYOVER = Decimal("49662.00")
NET_RELEASE = Decimal("1321106.00")

ACTIVITY_FINANCIALS = {
    "Conduct Regional Startup Ecosystem Mapping": (Decimal("115000.00"), "MOOE"),
    "Organize Stakeholder Coordination Sessions": (Decimal("173000.00"), "MOOE"),
    "Develop an Ecosystem Engagement Plan": (Decimal("62000.00"), "MOOE"),
    "Conduct Startup Needs Assessment": (Decimal("86000.00"), "MOOE"),
    "Deliver Mentoring and Capacity-Building Sessions": (Decimal("193000.00"), "MOOE"),
    "Conduct Startup Acceleration Activities": (Decimal("235000.00"), "MOOE"),
    "Organize Innovation Growth Showcase": (Decimal("104000.00"), "MOOE"),
    "Maintain Project Implementation Records": (Decimal("145000.00"), "PS"),
    "Prepare Periodic Monitoring Reports": (Decimal("110000.00"), "PS"),
    "Monitor Budget Utilization": (Decimal("79896.00"), "PS"),
    "Conduct Final Project Review and Documentation": (Decimal("67872.00"), "PS"),
}

DEMO_ACTUAL_OVERRIDES = {
    "Conduct Regional Startup Ecosystem Mapping": Decimal("105000.00"),
    "Conduct Startup Needs Assessment": Decimal("35000.00"),
}

PERSONNEL_COMPENSATION_SPECS = {
    "Project Technical Aide III": {
        "monthly_rate": Decimal("21906.00"),
        "duration_months": 12,
        "total": Decimal("262872.00"),
        "reason": "Approved salary: PHP 21,906.00 monthly for 12 months (PCIEERD-GIA Y2).",
    },
    "Project Staff Level 3": {
        "monthly_rate": Decimal("7500.00"),
        "duration_months": 12,
        "total": Decimal("90000.00"),
        "reason": "Approved salary: PHP 7,500.00 monthly for 12 months (PCIEERD-GIA Y2 only).",
    },
}


class Command(BaseCommand):
    help = "Create or update the development-only ReSEED-DASIG presentation project."

    def handle(self, *args, **options):
        counters = {
            "project_created": 0,
            "project_updated": 0,
            "users_created": 0,
            "users_updated": 0,
            "memberships_created": 0,
            "departments_created": 0,
            "roles_created": 0,
            "personnel_created": 0,
            "objectives_created": 0,
            "activities_created": 0,
            "activities_found": 0,
            "activities_updated": 0,
            "budget_items_created": 0,
            "compensations_created": 0,
            "compensations_found": 0,
            "compensations_updated": 0,
            "history_logs_created": 0,
            "invitations_created": 0,
            "invitations_updated": 0,
        }

        projected_total = sum(
            (projected for projected, _ in ACTIVITY_FINANCIALS.values()),
            Decimal("0.00"),
        )
        if projected_total != APPROVED_Y2:
            raise CommandError(
                f"Activity allocation total {projected_total} does not equal approved Y2 budget {APPROVED_Y2}."
            )

        for role_name, spec in PERSONNEL_COMPENSATION_SPECS.items():
            calculated_total = spec["monthly_rate"] * spec["duration_months"]
            if calculated_total != spec["total"]:
                raise CommandError(
                    f"Compensation calculation failed for {role_name}: {calculated_total}."
                )
        personnel_services_total = sum(
            (spec["total"] for spec in PERSONNEL_COMPENSATION_SPECS.values()),
            Decimal("0.00"),
        )
        if personnel_services_total != Decimal("352872.00"):
            raise CommandError(
                f"Personnel Services compensation total is {personnel_services_total}, expected 352872.00."
            )

        with transaction.atomic():
            admin = User.objects.filter(role="ADMIN", is_active=True).order_by("id").first()
            if not admin:
                raise CommandError("No active existing Admin account was found; no Admin account was created.")

            project, project_changed = self._ensure_project(counters)
            invitation_expiry = timezone.make_aware(datetime(2026, 12, 31, 23, 59, 59))
            for code, allowed_role in (
                ("DASIG-EXEC-2026", "EXECUTIVE"),
                ("DASIG-STAFF-2026", "PROJECT_STAFF"),
            ):
                invitation, created = ProjectInvitation.objects.get_or_create(
                    code=code,
                    defaults={
                        "project": project,
                        "allowed_role": allowed_role,
                        "is_active": True,
                        "expires_at": invitation_expiry,
                        "max_uses": 50,
                        "used_count": 0,
                        "created_by": admin,
                    },
                )
                changed = created
                expected = {
                    "project": project,
                    "allowed_role": allowed_role,
                    "is_active": True,
                    "expires_at": invitation_expiry,
                    "max_uses": 50,
                }
                for field, value in expected.items():
                    if getattr(invitation, field) != value:
                        setattr(invitation, field, value)
                        changed = True
                if changed and not created:
                    invitation.save(update_fields=list(expected))
                counters["invitations_created"] += int(created)
                counters["invitations_updated"] += int(changed and not created)
            executive = self._ensure_user(
                "upcebuinit@lantaw.com", "executive123", "EXECUTIVE",
                "UP Cebu INIT", "Executive", counters,
            )
            staff = self._ensure_user(
                "projectstaff123@lantaw.com", "staff123", "PROJECT_STAFF",
                "Project", "Staff 123", counters,
            )

            for user in (admin, executive, staff):
                _, created = ProjectMembers.objects.get_or_create(project=project, user=user)
                counters["memberships_created"] += int(created)

            departments = self._ensure_named_records(
                Department,
                project,
                [
                    "Project Management",
                    "Innovation and Startup Support",
                    "Finance and Administration",
                    "Monitoring and Evaluation",
                ],
                "departments_created",
                counters,
            )
            roles = self._ensure_named_records(
                Role,
                project,
                [
                    "Project Leader",
                    "Co-implementor",
                    "Executive Representative",
                    "Project Technical Aide III",
                    "Project Staff Level 3",
                    "Finance and Administrative Support",
                    "Monitoring and Evaluation Support",
                ],
                "roles_created",
                counters,
            )

            personnel_specs = [
                ("Janice V.", "Forster", "Project Leader", "Project Management"),
                ("Jason", "Nieva", "Co-implementor", "Project Management"),
                ("UP Cebu INIT", "Executive", "Executive Representative", "Project Management"),
                ("Project", "Staff 123", "Project Staff Level 3", "Innovation and Startup Support"),
                ("Seed Project", "Technical Aide", "Project Technical Aide III", "Innovation and Startup Support"),
            ]
            personnel = {}
            personnel_changed = False
            for first_name, last_name, role_name, department_name in personnel_specs:
                person, changed = self._ensure_personnel(
                    project, first_name, last_name, roles[role_name], departments[department_name], counters
                )
                personnel[role_name] = person
                personnel_changed = personnel_changed or changed

            objective_specs = [
                (
                    "Strengthen the Region VII Startup and Innovation Ecosystem",
                    "Develop stronger coordination, support mechanisms, and stakeholder engagement for startup and innovation ecosystem participants in Region VII.",
                    [
                        ("Conduct Regional Startup Ecosystem Mapping", "COMPLETED"),
                        ("Organize Stakeholder Coordination Sessions", "PENDING"),
                        ("Develop an Ecosystem Engagement Plan", "PENDING"),
                    ],
                ),
                (
                    "Provide Development and Acceleration Support to Innovation-Led Startups",
                    "Deliver mentoring, technical guidance, capability-building, and acceleration assistance to eligible startup and innovation teams.",
                    [
                        ("Conduct Startup Needs Assessment", "ACTIVE"),
                        ("Deliver Mentoring and Capacity-Building Sessions", "PENDING"),
                        ("Conduct Startup Acceleration Activities", "PENDING"),
                        ("Organize Innovation Growth Showcase", "PENDING"),
                    ],
                ),
                (
                    "Improve Project Monitoring, Documentation, and Stakeholder Reporting",
                    "Maintain accurate monitoring records, activity documentation, financial tracking, and progress reporting for project implementation.",
                    [
                        ("Maintain Project Implementation Records", "PENDING"),
                        ("Prepare Periodic Monitoring Reports", "PENDING"),
                        ("Monitor Budget Utilization", "PENDING"),
                        ("Conduct Final Project Review and Documentation", "PENDING"),
                    ],
                ),
            ]
            objectives_changed, activities_changed = self._ensure_objectives(project, objective_specs, counters)

            category_items = {}
            for name in ("PS", "MOOE"):
                item, created = BudgetLineItem.objects.get_or_create(project=project, name=name)
                category_items[name] = item

            financial_summary, financials_changed = self._ensure_activity_financials(
                project, category_items, counters
            )
            activities_changed = activities_changed or financials_changed

            detailed_budget = [
                ("PS", "Project Technical Aide III – PHP 21,906.00 per month for 12 months", Decimal("262872.00")),
                ("PS", "Project Staff Level 3 – PHP 7,500.00 per month for 12 months", Decimal("90000.00")),
                ("MOOE", "Traveling Expenses – Local", Decimal("150000.00")),
                ("MOOE", "Office Supplies Expenses", Decimal("10000.00")),
                ("MOOE", "Consulting Services", Decimal("377896.00")),
                ("MOOE", "Other Professional Services", Decimal("50000.00")),
                ("MOOE", "Printing and Publication Expenses", Decimal("10000.00")),
                ("MOOE", "Representation Expenses", Decimal("420000.00")),
            ]
            budget_changed = False
            for category, description, amount in detailed_budget:
                item, created = BudgetItem.objects.get_or_create(
                    project=project,
                    category=category,
                    description=description,
                    defaults={"amount": amount},
                )
                changed = created
                if item.amount != amount:
                    item.amount = amount
                    item.save(update_fields=["amount", "updated_at"])
                    changed = True
                counters["budget_items_created"] += int(created)
                budget_changed = budget_changed or changed

            compensation_changed = False
            seeded_compensations = []
            for role_name, spec in PERSONNEL_COMPENSATION_SPECS.items():
                person = personnel[role_name]
                compensation, created = Compensation.objects.get_or_create(
                    type="SALARY",
                    personnel=person,
                    defaults={
                        "budget_item": category_items["PS"],
                        "reason": spec["reason"],
                        "monthly_rate": spec["monthly_rate"],
                        "duration_months": spec["duration_months"],
                        "amount": spec["total"],
                        "date_effective": project.date_start,
                    },
                )
                changed = created
                expected = {
                    "budget_item": category_items["PS"],
                    "reason": spec["reason"],
                    "monthly_rate": spec["monthly_rate"],
                    "duration_months": spec["duration_months"],
                    "amount": spec["total"],
                    "date_effective": project.date_start,
                }
                for field, value in expected.items():
                    if getattr(compensation, field) != value:
                        setattr(compensation, field, value)
                        changed = True
                if changed and not created:
                    compensation.save()
                counters["compensations_created"] += int(created)
                counters["compensations_found"] += 1
                counters["compensations_updated"] += int(changed and not created)
                compensation_changed = compensation_changed or changed
                seeded_compensations.append(compensation)

            compensation_total = sum(
                (item.amount for item in seeded_compensations), Decimal("0.00")
            )
            if compensation_total != Decimal("352872.00"):
                raise CommandError("Persisted compensation records do not reconcile to Personnel Services.")
            if Compensation.objects.filter(
                budget_item__project=project, amount=Decimal("99600.00")
            ).exists():
                raise CommandError("UP Cebu counterpart compensation must not be imported.")
            compensation_summary = {
                "records": seeded_compensations,
                "total": compensation_total,
            }

            ps_total = sum(amount for category, _, amount in detailed_budget if category == "PS")
            mooe_total = sum(amount for category, _, amount in detailed_budget if category == "MOOE")
            if ps_total != Decimal("352872.00"):
                raise CommandError(f"Unexpected Personnel Services total: {ps_total}")
            if mooe_total != Decimal("1017896.00"):
                raise CommandError(f"Unexpected MOOE total: {mooe_total}")
            if ps_total + mooe_total != APPROVED_Y2:
                raise CommandError("Approved Y2 budget validation failed.")
            if APPROVED_Y2 - YEAR_1_CARRYOVER != NET_RELEASE:
                raise CommandError("Net release validation failed.")

            setup_events = [
                (project_changed, "PROJECT", "Project profile created or updated for the ReSEED-DASIG presentation setup."),
                (counters["memberships_created"] > 0, "USER", "Admin, Executive, and Project Staff project access verified."),
                (objectives_changed, "OBJECTIVE", "ReSEED-DASIG presentation objectives initialized."),
                (activities_changed, "ACTIVITY", "ReSEED-DASIG presentation activities initialized."),
                (personnel_changed, "PERSONNEL", "ReSEED-DASIG departments, roles, and personnel initialized."),
                (budget_changed or compensation_changed, "BUDGET", "PCIEERD-GIA-only Y2 budget and compensation initialized."),
            ]
            for changed, change_type, description in setup_events:
                if changed and not HistoryLog.objects.filter(project=project, description=description).exists():
                    log_history(
                        user=admin,
                        action="CREATE" if counters["project_created"] else "UPDATE",
                        module=change_type,
                        change_type=change_type,
                        project=project,
                        object_name=project.name,
                        description=description,
                    )
                    counters["history_logs_created"] += 1

        self._print_summary(
            project,
            admin,
            counters,
            ps_total,
            mooe_total,
            financial_summary,
            compensation_summary,
        )

    def _ensure_project(self, counters):
        defaults = {
            "project_leader": "Ms. Janice V. Forster",
            "description": PROJECT_DESCRIPTION,
            "grant_amount": APPROVED_Y2,
            "project_status": "ACTIVE",
            "date_start": date(2024, 1, 1),
            "date_end": date(2024, 12, 31),
        }
        known_names = (OLD_PROJECT_NAME, PROJECT_NAME)
        project = Project.objects.filter(pk=5, name__in=known_names).first()
        if project is None:
            project = Project.objects.filter(name__in=known_names).order_by("id").first()

        created = project is None
        if created:
            project = Project.objects.create(name=PROJECT_NAME, **defaults)

        changed = created
        if not created:
            if project.name != PROJECT_NAME:
                project.name = PROJECT_NAME
                changed = True
            for field, value in defaults.items():
                if getattr(project, field) != value:
                    setattr(project, field, value)
                    changed = True
            if changed:
                project.save()
        counters["project_created"] = int(created)
        counters["project_updated"] = int(changed and not created)
        return project, changed

    def _ensure_user(self, email, password, role, first_name, last_name, counters):
        user, created = User.objects.get_or_create(email=email)
        changed = created
        expected = {
            "role": role, "first_name": first_name, "last_name": last_name,
            "account_status": "ACTIVE", "is_active": True,
        }
        for field, value in expected.items():
            if getattr(user, field) != value:
                setattr(user, field, value)
                changed = True
        if not user.check_password(password):
            user.set_password(password)
            changed = True
        if changed:
            user.save()
        counters["users_created"] += int(created)
        counters["users_updated"] += int(changed and not created)
        return user

    def _ensure_named_records(self, model, project, names, counter, counters):
        result = {}
        for name in names:
            record, created = model.objects.get_or_create(project=project, name=name)
            result[name] = record
            counters[counter] += int(created)
        return result

    def _ensure_personnel(self, project, first_name, last_name, role, department, counters):
        person, created = Personnel.objects.get_or_create(first_name=first_name, last_name=last_name)
        changed = created
        expected = {"role": role, "department": department, "employment_status": "ACTIVE"}
        for field, value in expected.items():
            if getattr(person, field) != value:
                setattr(person, field, value)
                changed = True
        if changed:
            person.save()
        _, assignment_created = ProjectPersonnel.objects.get_or_create(project=project, personnel=person)
        counters["personnel_created"] += int(created)
        return person, changed or assignment_created

    def _ensure_objectives(self, project, specs, counters):
        objectives_changed = False
        activities_changed = False
        for title, description, activities in specs:
            objective, created = Objective.objects.get_or_create(
                project=project, title=title, defaults={"description": description}
            )
            changed = created
            if objective.description != description:
                objective.description = description
                objective.save(update_fields=["description"])
                changed = True
            counters["objectives_created"] += int(created)
            objectives_changed = objectives_changed or changed
            for activity_title, activity_status in activities:
                _, activity_created = Activity.objects.get_or_create(
                    objective=objective,
                    title=activity_title,
                    defaults={"activity_status": activity_status},
                )
                counters["activities_created"] += int(activity_created)
                activities_changed = activities_changed or activity_created
        return objectives_changed, activities_changed

    def _demo_actual_expense(self, activity, projected):
        if activity.activity_status == "PENDING":
            return Decimal("0.00")

        override = DEMO_ACTUAL_OVERRIDES.get(activity.title)
        if override is not None:
            return override

        ratio = Decimal("0.90") if activity.activity_status == "COMPLETED" else Decimal("0.25")
        return (projected * ratio).quantize(Decimal("0.01"))

    def _ensure_activity_financials(self, project, category_items, counters):
        activities = []
        changed_any = False

        for title, (projected, category) in ACTIVITY_FINANCIALS.items():
            matches = list(
                Activity.objects.filter(objective__project=project, title=title)
                .select_related("objective")
                .order_by("id")
            )
            if len(matches) != 1:
                raise CommandError(
                    f'Expected exactly one activity titled "{title}" for project {project.id}; found {len(matches)}.'
                )

            activity = matches[0]
            actual = self._demo_actual_expense(activity, projected)
            if actual < Decimal("0.00") or actual > projected:
                raise CommandError(
                    f'Invalid demo actual expense {actual} for "{title}" with allocation {projected}.'
                )

            expected = {
                "projected_expense": projected,
                "actual_expense": actual,
                "activity_budget_item": category_items[category],
            }
            changed_fields = []
            for field, value in expected.items():
                if getattr(activity, field) != value:
                    setattr(activity, field, value)
                    changed_fields.append(field)

            if changed_fields:
                activity.save(update_fields=[*changed_fields, "date_modified"])
                counters["activities_updated"] += 1
                changed_any = True

            counters["activities_found"] += 1
            activities.append(activity)

        projected_total = sum((item.projected_expense for item in activities), Decimal("0.00"))
        actual_total = sum((item.actual_expense for item in activities), Decimal("0.00"))
        balance_total = sum((item.balance for item in activities), Decimal("0.00"))
        if projected_total != APPROVED_Y2:
            raise CommandError("Persisted activity allocations do not reconcile to the approved Y2 budget.")
        if balance_total != projected_total - actual_total:
            raise CommandError("Derived activity balances do not reconcile.")

        status_counts = {
            status: sum(item.activity_status == status for item in activities)
            for status in ("PENDING", "ACTIVE", "COMPLETED")
        }
        budget_status_counts = {
            status: sum(item.budget_status == status for item in activities)
            for status in (
                "NOT_STARTED",
                "ON_TRACK",
                "UNDER_BUDGET",
                "ON_BUDGET",
                "OVER_BUDGET",
                "UNALLOCATED",
            )
        }
        return {
            "activities": activities,
            "projected_total": projected_total,
            "actual_total": actual_total,
            "balance_total": balance_total,
            "status_counts": status_counts,
            "budget_status_counts": budget_status_counts,
        }, changed_any

    def _print_summary(
        self,
        project,
        admin,
        counters,
        ps_total,
        mooe_total,
        financial_summary,
        compensation_summary,
    ):
        self.stdout.write(self.style.SUCCESS("ReSEED-DASIG presentation setup complete."))
        self.stdout.write(f"Project created: {counters['project_created']}")
        self.stdout.write(f"Project updated: {counters['project_updated']}")
        self.stdout.write(f"Users created: {counters['users_created']}")
        self.stdout.write(f"Users updated: {counters['users_updated']}")
        self.stdout.write(f"Project memberships created: {counters['memberships_created']}")
        self.stdout.write(f"Registration invitations created: {counters['invitations_created']}")
        self.stdout.write(f"Registration invitations updated: {counters['invitations_updated']}")
        self.stdout.write("Executive invitation: DASIG-EXEC-2026")
        self.stdout.write("Project Staff invitation: DASIG-STAFF-2026")
        self.stdout.write(f"Existing Admin access verified: {admin.email}")
        self.stdout.write(f"Departments created: {counters['departments_created']}")
        self.stdout.write(f"Roles created: {counters['roles_created']}")
        self.stdout.write(f"Personnel created: {counters['personnel_created']}")
        self.stdout.write(f"Objectives created: {counters['objectives_created']}")
        self.stdout.write(f"Activities created: {counters['activities_created']}")
        self.stdout.write(f"Activities found: {counters['activities_found']}")
        self.stdout.write(f"Activities updated: {counters['activities_updated']}")
        self.stdout.write(f"Detailed budget items created: {counters['budget_items_created']}")
        self.stdout.write(f"Compensations created: {counters['compensations_created']}")
        self.stdout.write(f"Personnel records found: {counters['compensations_found']}")
        self.stdout.write(f"Compensations updated: {counters['compensations_updated']}")
        for compensation in compensation_summary["records"]:
            self.stdout.write(f"{compensation.personnel.role.name}:")
            self.stdout.write(f"Monthly salary: PHP {compensation.monthly_rate:,.2f}")
            self.stdout.write(f"Duration: {compensation.duration_months} months")
            self.stdout.write(f"Approved total: PHP {compensation.amount:,.2f}")
        self.stdout.write(
            f"Personnel Services reconciliation: PHP {compensation_summary['total']:,.2f} - PASSED"
        )
        self.stdout.write("UP Cebu counterpart funding imported: PHP 0.00")
        self.stdout.write("UP Cebu counterpart budget items created: 0")
        self.stdout.write(f"Personnel Services verified: PHP {ps_total:,.2f}")
        self.stdout.write(f"MOOE verified: PHP {mooe_total:,.2f}")
        self.stdout.write(f"Approved Y2 budget verified: PHP {APPROVED_Y2:,.2f}")
        self.stdout.write(f"Unexpended Year 1 budget verified: PHP {YEAR_1_CARRYOVER:,.2f}")
        self.stdout.write(f"Net release verified: PHP {NET_RELEASE:,.2f}")
        self.stdout.write(
            f"Projected expenses assigned: PHP {financial_summary['projected_total']:,.2f}"
        )
        self.stdout.write(
            f"Actual demo expenses assigned: PHP {financial_summary['actual_total']:,.2f}"
        )
        self.stdout.write(
            f"Remaining activity balance: PHP {financial_summary['balance_total']:,.2f}"
        )
        self.stdout.write(
            f"Not Started activities: {financial_summary['status_counts']['PENDING']}"
        )
        self.stdout.write(
            f"In Progress activities: {financial_summary['status_counts']['ACTIVE']}"
        )
        self.stdout.write(
            f"Completed activities: {financial_summary['status_counts']['COMPLETED']}"
        )
        for label, status in (
            ("Under Budget", "UNDER_BUDGET"),
            ("On Track", "ON_TRACK"),
            ("Not Started", "NOT_STARTED"),
            ("On Budget", "ON_BUDGET"),
            ("Over Budget", "OVER_BUDGET"),
            ("Unallocated", "UNALLOCATED"),
        ):
            self.stdout.write(
                f"{label}: {financial_summary['budget_status_counts'][status]}"
            )
        self.stdout.write("Approved budget reconciliation: PASSED")
        self.stdout.write("UP Cebu counterpart values imported: 0")
        self.stdout.write("Duplicate activities created: 0")
        self.stdout.write(f"History logs created: {counters['history_logs_created']}")
        self.stdout.write(f"Project ID: {project.id}")

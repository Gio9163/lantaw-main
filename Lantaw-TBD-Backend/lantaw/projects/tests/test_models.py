import pytest 
from projects.models import Project, ProjectMembers, ProjectPersonnel
from django.core.exceptions import ValidationError
from django.utils import timezone

"""
Project Test
"""

# Test project creation 
@pytest.mark.django_db
def test_create_project(sample_project_data):
    project = Project.objects.create(**sample_project_data)
    assert project.name == sample_project_data["name"]
    assert project.description == sample_project_data["description"]
    assert project.grant_amount == sample_project_data["grant_amount"]
    assert project.project_status == sample_project_data["project_status"]
    assert project.date_start == sample_project_data["date_start"]
    assert project.date_end == sample_project_data["date_end"]

# Test project creation with missing name
@pytest.mark.django_db
def test_create_project_with_missing_name(sample_project_data):
    sample_project_data["name"] = ""
    project = Project(**sample_project_data)

    with pytest.raises(ValidationError) as excinfo:
        project.full_clean()  
        project.save()

    assert "name" in excinfo.value.message_dict
    assert "This field cannot be blank." in excinfo.value.message_dict["name"]

# Test project creation with empty description
@pytest.mark.django_db
def test_create_project_with_empty_description(sample_project_data):
    sample_project_data["description"] = ""
    project = Project.objects.create(**sample_project_data)
    assert project.description == ""

# Test project creation with negative grant amount
@pytest.mark.django_db
def test_create_project_with_negative_grant(sample_project_data):
    sample_project_data["grant_amount"] = -1000.00
    project = Project(**sample_project_data)

    with pytest.raises(ValidationError) as excinfo:
        project.full_clean()

    assert "grant_amount" in excinfo.value.message_dict
    assert "Ensure this value is greater than or equal to 0.0." in excinfo.value.message_dict["grant_amount"]

# Test project creation with huge grant amount 
@pytest.mark.django_db
def test_create_project_with_huge_grant(sample_project_data):
    sample_project_data["grant_amount"] = 10**15  # Exceeds max_digits=12
    project = Project(**sample_project_data)

    with pytest.raises(ValidationError) as excinfo:
        project.full_clean()  

    assert "grant_amount" in excinfo.value.message_dict
    assert "Ensure that there are no more than 12 digits" in str(excinfo.value)

# Test project creation with invalid status
@pytest.mark.django_db
def test_create_project_with_invalid_status(sample_project_data):
    sample_project_data["project_status"] = "INVALID_STATUS"
    project = Project(**sample_project_data)

    with pytest.raises(ValidationError) as excinfo:
        project.full_clean()

    assert "Value 'INVALID_STATUS' is not a valid choice" in str(excinfo.value)

# Test project creation with invalid date range
@pytest.mark.django_db
def test_create_project_with_invalid_dates(sample_project_data):
    sample_project_data["date_start"] = "2025-10-15"
    sample_project_data["date_end"] = "2025-10-13"
    project = Project(**sample_project_data)

    with pytest.raises(ValidationError) as excinfo:
        project.full_clean()
        project.save()

    assert "Start date cannot be after end date." in str(excinfo.value)

# Test project creation with same start and end date
@pytest.mark.django_db
def test_create_project_with_same_start_end_date(sample_project_data):
    sample_project_data["date_start"] = "2025-10-13"
    sample_project_data["date_end"] = "2025-10-13"
    project = Project.objects.create(**sample_project_data)
    assert project.date_start == project.date_end

# Test project creation with non-date inputs
@pytest.mark.django_db
def test_create_project_with_non_date_inputs(sample_project_data):
    sample_project_data["date_start"] = "not-a-date"
    sample_project_data["date_end"] = "also-not-a-date"
    project = Project(**sample_project_data)

    with pytest.raises(ValidationError) as excinfo:
        project.full_clean()

    assert "invalid date format" in str(excinfo.value)

# Test project creation with no start date
@pytest.mark.django_db
def test_create_project_with_no_start_date(sample_project_data):
    sample_project_data["date_start"] = None
    with pytest.raises(Exception) as excinfo:
        Project.objects.create(**sample_project_data)
    assert "This field cannot be null" in str(excinfo.value)

# Test project creation with no end date
@pytest.mark.django_db
def test_create_project_with_no_end_date(sample_project_data):
    sample_project_data["date_end"] = None
    with pytest.raises(Exception) as excinfo:
        Project.objects.create(**sample_project_data)
    assert "This field cannot be null" in str(excinfo.value)

"""
Project Members Test
"""
# Test creation for project members
@pytest.mark.django_db
def test_create_project_member(staff_user, sample_project):
    project_member = ProjectMembers.objects.create(user=staff_user, project=sample_project)
    assert project_member.user == staff_user
    assert project_member.project == sample_project
    assert timezone.localdate(project_member.date_joined) == timezone.localdate()

# Test duplicate project member addition
@pytest.mark.django_db
def test_duplicate_project_member_addition(staff_user, sample_project):
    ProjectMembers.objects.create(user=staff_user, project=sample_project)
    with pytest.raises(Exception) as excinfo:
        ProjectMembers.objects.create(user=staff_user, project=sample_project)
    assert "UNIQUE constraint failed" in str(excinfo.value) or "duplicate key value violates unique constraint" in str(excinfo.value)

"""
Project Personnel Test
"""

# Test creation for project personnel 
@pytest.mark.django_db
def test_create_project_personnel(sample_personnel, sample_project):
    project_personnel = ProjectPersonnel.objects.create(personnel=sample_personnel, project=sample_project)
    assert project_personnel.personnel == sample_personnel
    assert project_personnel.project == sample_project

# Test duplication project personnel addition
@pytest.mark.django_db
def test_duplicate_project_personnel_addition(sample_personnel, sample_project):
    ProjectPersonnel.objects.create(personnel=sample_personnel, project=sample_project)
    with pytest.raises(Exception) as excinfo:
        ProjectPersonnel.objects.create(personnel=sample_personnel, project=sample_project)
    assert "UNIQUE constraint failed" in str(excinfo.value) or "duplicate key value violates unique constraint" in str(excinfo.value)

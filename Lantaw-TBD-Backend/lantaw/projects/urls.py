from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, public_projects_list

router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")

urlpatterns = [
    path("projects-public/", public_projects_list, name="projects-public"),
] + router.urls
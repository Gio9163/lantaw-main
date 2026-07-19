from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_nested import routers 

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


from projects.views import ProjectViewSet, ProjectMembersViewSet, public_projects_list
from activities.views import ObjectiveViewSet, ActivityViewSet
from personnel.views import RoleViewSet, DepartmentViewSet, PersonnelViewSet
from budget.views import BudgetLineItemViewSet, CompensationViewSet
from change_requests.views import ChangeRequestViewSet
from history_log.views import ArchivedHistoryLogViewSet, HistoryLogViewSet
from users.views import ProjectInvitationViewSet

router = routers.SimpleRouter()

# Change requests (Admin-only top-level endpoint)
router.register(r'change-requests', ChangeRequestViewSet, basename='change-requests')

# History log (accessible to all authenticated users)
# Register the archive router before the main history-log router so that the list route
# /api/history-log/archive/ is matched before /api/history-log/<pk>/.
router.register(r'history-log/archive', ArchivedHistoryLogViewSet, basename='history-log-archive')
router.register(r'history-log', HistoryLogViewSet, basename='history-log')

# Projects and its nested routes
router.register(r'projects', ProjectViewSet, basename='project')
projects_router = routers.NestedSimpleRouter(router, r'projects', lookup='project')
projects_router.register(r'objectives', ObjectiveViewSet, basename='project-objectives')
projects_router.register(r'roles', RoleViewSet, basename='project-roles')
projects_router.register(r'departments', DepartmentViewSet, basename='project-departments')
projects_router.register(r'personnel', PersonnelViewSet, basename='project-personnel')
projects_router.register(r'members', ProjectMembersViewSet, basename='project-members')
projects_router.register(r'budget-line-items', BudgetLineItemViewSet, basename='project-budgetlineitems')
projects_router.register(r'compensations', CompensationViewSet, basename='project-compensations')
projects_router.register(r'change-requests', ChangeRequestViewSet, basename='project-change-requests')
projects_router.register(r'invitations', ProjectInvitationViewSet, basename='project-invitations')

objectives_router = routers.NestedSimpleRouter(projects_router, r'objectives', lookup='objective')
objectives_router.register(r'activities', ActivityViewSet, basename='objective-activities')

urlpatterns = [
    path('', RedirectView.as_view(url='/api/docs/', permanent=False), name='index'),
    path('admin/', admin.site.urls),

    # API schema and documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/projects-public/', public_projects_list, name='projects-public'),

    path('api/', include(router.urls)),  # all projects API under /api/
    path('api/', include(projects_router.urls)),  # nested objectives API under /api/
    path('api/', include(objectives_router.urls)),  # nested activities API under /api

    path('api/', include('activities.urls')),  # all activities API under /api/
    path('api/', include('users.urls')),  # all users API under /api/
    path('api/', include('personnel.urls')),  # all personnel API under /api/
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

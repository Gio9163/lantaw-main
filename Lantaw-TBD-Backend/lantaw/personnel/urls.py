from rest_framework.routers import DefaultRouter
from .views import RoleViewSet, DepartmentViewSet, PersonnelViewSet

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'personnel', PersonnelViewSet, basename='personnel')

urlpatterns = router.urls

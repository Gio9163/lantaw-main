from rest_framework.routers import DefaultRouter
from .views import ObjectiveViewSet, ActivityViewSet

router = DefaultRouter()
router.register(r'objectives', ObjectiveViewSet, basename='objective')
router.register(r'activities', ActivityViewSet, basename='activity')

urlpatterns = router.urls

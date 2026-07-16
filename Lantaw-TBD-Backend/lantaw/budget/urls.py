from rest_framework.routers import DefaultRouter
from .views import BudgetLineItemViewSet, CompensationViewSet

router = DefaultRouter()
router.register(r'budget-line-items', BudgetLineItemViewSet, basename='budgetlineitem')
router.register(r'compensations', CompensationViewSet, basename='compensation')

urlpatterns = router.urls
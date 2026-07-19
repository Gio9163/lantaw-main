# users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from .views import (
    UserViewSet,
    RegisterView,
    RegistrationRequestViewSet,
    PasswordChangeView,
    check_user_exists,
    CustomTokenObtainPairView,
    logout_view,
    validate_invitation,
    accept_invitation,
)

# Router for CRUD on users
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(
    r'registration-requests',
    RegistrationRequestViewSet,
    basename='registration-request',
)

urlpatterns = [
    # JWT auth endpoints
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Registration + password change
    path("register/", RegisterView.as_view(), name="register"),
    path("invitations/<str:code>/validate/", validate_invitation, name="invitation-validate"),
    path("invitations/<str:code>/accept/", accept_invitation, name="invitation-accept"),
    path("password/change/", PasswordChangeView.as_view(), name="password_change"),
    
    # Logout endpoint (updates last_login)
    path("logout/", logout_view, name="logout"),
    
    # Check if user exists by email
    path("users/check/", check_user_exists, name="check_user_exists"),

    # Include router-based endpoints (list/retrieve/update users)
    path("", include(router.urls)),
]

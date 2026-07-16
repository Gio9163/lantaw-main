from rest_framework import viewsets, permissions, generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, RegisterSerializer, PasswordChangeSerializer
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from history_log.services import get_user_project_context_description, log_history

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer for JWT authentication.
    Note: last_login is now updated on logout, not on login.
    """
    pass

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom token view that uses CustomTokenObtainPairSerializer to update last_login.
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.filter(email=request.data.get('email')).first()
            if user:
                log_history(
                    user=user,
                    action='LOGIN',
                    module='USER',
                    object_name=user.get_full_name() or user.email,
                    description=get_user_project_context_description(user, 'logged in'),
                    change_type='USER',
                    entity_id=user.id,
                )
        return response

class IsAdminOrSelf(permissions.BasePermission):
    """
    Custom permission:
    - Admin can do anything.
    - Normal users can only view/update their own profile.
    """
    def has_permission(self, request, view):
        # Add list-level permission check
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if request.user.role == "ADMIN":
            return True
        # Only allow safe methods (GET, HEAD, OPTIONS) or updates for own profile
        if request.method in permissions.SAFE_METHODS:
            return obj == request.user
        # Restrict DELETE for non-admins
        if request.method == 'DELETE':
            return False
        return obj == request.user

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSelf]
    filter_backends = [filters.SearchFilter]
    search_fields = ['email'] 

    def get_queryset(self):
        user = self.request.user
        queryset = User.objects.all().order_by("-date_joined")

        # If not admin, only see personal data
        if user.role != "ADMIN":
            queryset = queryset.filter(id=user.id)

        return queryset

    def perform_update(self, serializer):
        user = self.request.user

        # Make sure non-admins can't update roles or other restricted fields
        if user.role != "ADMIN":
            protected_fields = ['role', 'is_staff', 'is_superuser', 'is_active', 'date_joined', 'account_status']
            for field in protected_fields:
                serializer.validated_data.pop(field, None)

        serializer.save()

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny] 
    queryset = User.objects.all()

class PasswordChangeView(generics.UpdateAPIView):
    serializer_class = PasswordChangeSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['put', 'patch']

    def get_object(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            raise PermissionDenied("Authentication required")
        return user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def check_user_exists(request):
    """
    Check if a user exists by exact email match.
    Only accessible to authenticated users (admins can check any email).
    """
    email = request.query_params.get('email', '').strip()
    
    if not email:
        return Response({"exists": False, "error": "Email parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email__iexact=email)
        # Only return user data if requester is admin or checking their own email
        if request.user.role == "ADMIN" or request.user.email.lower() == email.lower():
            return Response({
                "exists": True,
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name
            })
        else:
            # User exists but requester doesn't have permission to see it
            return Response({"exists": False}, status=status.HTTP_403_FORBIDDEN)
    except User.DoesNotExist:
        return Response({"exists": False})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    """
    Logout endpoint that updates last_login when user logs out.
    This ensures last_login reflects when the user last logged out.
    """
    try:
        # Update last_login to current time when user logs out
        User.objects.filter(pk=request.user.pk).update(last_login=timezone.now())
        log_history(
            user=request.user,
            action='LOGOUT',
            module='USER',
            object_name=request.user.get_full_name() or request.user.email,
            description=get_user_project_context_description(request.user, 'logged out'),
            change_type='USER',
            entity_id=request.user.id,
        )
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)
    except Exception as e:
        # Even if update fails, still allow logout
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)
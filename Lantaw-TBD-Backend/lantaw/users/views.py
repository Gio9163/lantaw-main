from rest_framework import viewsets, permissions, generics, status, filters, mixins
from rest_framework.decorators import api_view, permission_classes, action
from django.contrib.auth import get_user_model
from django.db import models, transaction
from .models import ProjectInvitation, RegistrationRequest
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    PasswordChangeSerializer,
    RegistrationRequestSerializer,
    RegistrationRejectionSerializer,
    ProjectInvitationSerializer,
    InvitationValidationSerializer,
)
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied, ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from history_log.services import get_user_project_context_description, log_history
from projects.models import Project, ProjectMembers

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer for JWT authentication.
    Note: last_login is now updated on logout, not on login.
    """
    def validate(self, attrs):
        email = attrs.get(self.username_field)
        password = attrs.get("password")
        pending_user = User.objects.filter(email__iexact=email).first() if email else None
        if (
            pending_user
            and password
            and not pending_user.is_active
            and pending_user.check_password(password)
        ):
            if pending_user.account_status == "PENDING_APPROVAL":
                raise AuthenticationFailed(
                    "Your account is awaiting Administrator approval.",
                    code="account_pending",
                )
            if pending_user.account_status == "REJECTED":
                raise AuthenticationFailed(
                    "Your registration request was rejected.",
                    code="account_rejected",
                )
        return super().validate(attrs)

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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registration_request = serializer.save()
        return Response(
            {
                "message": "Registration submitted for Administrator approval.",
                "status": registration_request.status,
                "requested_role": registration_request.requested_role,
                "project_name": registration_request.project.name,
            },
            status=status.HTTP_201_CREATED,
        )


class IsAdministrator(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == "ADMIN"
        )


class ProjectInvitationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ProjectInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ProjectInvitation.objects.select_related("project", "created_by").order_by(
        "-created_at", "-id"
    )

    def _project(self):
        try:
            return Project.objects.get(pk=self.kwargs.get("project_pk"))
        except Project.DoesNotExist:
            raise ValidationError({"project": "Project not found."})

    def _is_assigned_staff(self, project):
        return (
            self.request.user.role == "PROJECT_STAFF"
            and ProjectMembers.objects.filter(project=project, user=self.request.user).exists()
        )

    def get_queryset(self):
        project = self._project()
        user = self.request.user
        if user.role == "ADMIN" or self._is_assigned_staff(project):
            return self.queryset.filter(project=project)
        raise PermissionDenied("You are not allowed to view invitations for this project.")

    def perform_create(self, serializer):
        project = self._project()
        if not self._is_assigned_staff(project):
            raise PermissionDenied("Only assigned Project Staff may create invitations.")
        email = serializer.validated_data["email"]
        role = serializer.validated_data["allowed_role"]
        duplicate = ProjectInvitation.objects.filter(
            project=project,
            email__iexact=email,
            allowed_role=role,
            is_active=True,
            revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
            used_count__lt=models.F("max_uses"),
        ).exists()
        if duplicate:
            raise ValidationError(
                {"email": "An active invitation already exists for this email and role."}
            )
        invitation = serializer.save(project=project, created_by=self.request.user)
        log_history(
            user=self.request.user,
            action="CREATE",
            module="USER",
            change_type="USER",
            project=project,
            object_name=invitation.email,
            entity_id=invitation.id,
            description=(
                f"Created a {invitation.get_allowed_role_display()} project invitation "
                f"for {invitation.email}."
            ),
            new_state={
                "role": invitation.allowed_role,
                "email": invitation.email,
                "token_hint": f"{invitation.code[:6]}...",
            },
        )

    @action(detail=True, methods=["post"])
    def revoke(self, request, project_pk=None, pk=None):
        project = self._project()
        if not self._is_assigned_staff(project):
            raise PermissionDenied("Only assigned Project Staff may revoke invitations.")
        with transaction.atomic():
            try:
                invitation = ProjectInvitation.objects.select_for_update().get(
                    pk=pk,
                    project=project,
                )
            except ProjectInvitation.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)
            if invitation.created_by_id != request.user.id:
                raise PermissionDenied("You may only revoke invitations you created.")
            if invitation.used_count or invitation.accepted_at:
                return Response(
                    {"detail": "Accepted invitations cannot be revoked."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if invitation.revoked_at or not invitation.is_active:
                return Response(
                    {"detail": "This invitation has already been revoked."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            invitation.is_active = False
            invitation.revoked_at = timezone.now()
            invitation.save(update_fields=["is_active", "revoked_at"])
            log_history(
                user=request.user,
                action="CANCEL",
                module="USER",
                change_type="USER",
                project=project,
                object_name=invitation.email,
                entity_id=invitation.id,
                description=f"Revoked project invitation for {invitation.email}.",
                new_state={"status": "REVOKED", "token_hint": f"{invitation.code[:6]}..."},
            )
        return Response(ProjectInvitationSerializer(invitation).data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def validate_invitation(request, code):
    invitation = ProjectInvitation.objects.select_related("project").filter(code=code).first()
    if invitation is None:
        return Response({"detail": "Invalid invitation."}, status=status.HTTP_404_NOT_FOUND)
    if not invitation.is_available_for(invitation.allowed_role, email=invitation.email or None):
        return Response(
            {"detail": "This invitation is expired, revoked, accepted, or unavailable."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(InvitationValidationSerializer(invitation).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def accept_invitation(request, code):
    with transaction.atomic():
        invitation = (
            ProjectInvitation.objects.select_for_update()
            .select_related("project")
            .filter(code=code)
            .first()
        )
        if invitation is None:
            return Response({"detail": "Invalid invitation."}, status=status.HTTP_404_NOT_FOUND)
        user = request.user
        if not invitation.is_available_for(invitation.allowed_role, email=user.email):
            return Response(
                {"detail": "This invitation is expired, revoked, accepted, or unavailable."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if invitation.email and invitation.email.lower() != user.email.lower():
            return Response(
                {"detail": "This invitation was issued to a different email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.role != invitation.allowed_role:
            return Response(
                {"detail": "Your current system role does not match this invitation."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if ProjectMembers.objects.filter(user=user, project=invitation.project).exists():
            return Response(
                {"detail": "You are already a member of this project."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if RegistrationRequest.objects.filter(
            user=user, project=invitation.project, status="PENDING"
        ).exists():
            return Response(
                {"detail": "A membership request is already pending for this project."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        registration_request = RegistrationRequest.objects.create(
            user=user,
            requested_role=invitation.allowed_role,
            project=invitation.project,
            invitation=invitation,
            existing_user=True,
        )
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["accepted_at"])
        log_history(
            user=user,
            action="SUBMIT",
            module="USER",
            change_type="USER",
            project=invitation.project,
            object_name=user.get_full_name() or user.email,
            entity_id=user.id,
            description=f"Submitted a project membership request for {user.email}.",
            new_state={"status": "PENDING", "token_hint": f"{invitation.code[:6]}..."},
        )
    return Response(
        RegistrationRequestSerializer(registration_request).data,
        status=status.HTTP_201_CREATED,
    )


class RegistrationRequestViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RegistrationRequestSerializer
    permission_classes = [IsAdministrator]
    queryset = RegistrationRequest.objects.select_related(
        "user", "project", "invitation", "reviewed_by"
    ).order_by("-submitted_at", "-id")
    filter_backends = [filters.SearchFilter]
    search_fields = ["user__first_name", "user__last_name", "user__email"]

    def get_queryset(self):
        queryset = self.queryset
        request_status = self.request.query_params.get("status")
        if request_status:
            queryset = queryset.filter(status=request_status.upper())
        return queryset

    def _locked_request(self, pk):
        try:
            return (
                RegistrationRequest.objects.select_for_update()
                .select_related("user", "project", "invitation", "reviewed_by")
                .get(pk=pk)
            )
        except RegistrationRequest.DoesNotExist:
            return None

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        with transaction.atomic():
            registration_request = self._locked_request(pk)
            if registration_request is None:
                return Response(status=status.HTTP_404_NOT_FOUND)
            if registration_request.status != "PENDING":
                return Response(
                    {"detail": "This registration request has already been processed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            invitation = ProjectInvitation.objects.select_for_update().get(
                pk=registration_request.invitation_id
            )
            if registration_request.requested_role not in {"EXECUTIVE", "PROJECT_STAFF"}:
                return Response(
                    {"detail": "The requested role is not allowed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if invitation.project_id != registration_request.project_id:
                return Response(
                    {"detail": "The invitation project does not match the request."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not invitation.is_available_for(
                registration_request.requested_role,
                email=registration_request.user.email,
                allow_accepted=True,
            ):
                if invitation.allowed_role != registration_request.requested_role:
                    detail = "The invitation role does not match the requested role."
                elif invitation.email and invitation.email.lower() != registration_request.user.email.lower():
                    detail = "The invitation was issued to a different email address."
                elif invitation.revoked_at or not invitation.is_active:
                    detail = "The project invitation has been revoked or deactivated."
                elif invitation.expires_at and invitation.expires_at <= timezone.now():
                    detail = "The project invitation expired before this request was approved."
                elif invitation.used_count >= invitation.max_uses:
                    detail = "The project invitation has reached its usage limit."
                else:
                    detail = "The project invitation is no longer valid."
                return Response(
                    {"detail": detail},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = registration_request.user
            if registration_request.existing_user:
                if not user.is_active or user.role != registration_request.requested_role:
                    return Response(
                        {"detail": "The existing user's active role no longer matches the request."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                user.role = registration_request.requested_role
                user.account_status = "ACTIVE"
                user.is_active = True
                user.save(update_fields=["role", "account_status", "is_active"])
            membership, membership_created = ProjectMembers.objects.get_or_create(
                user=user,
                project=registration_request.project,
            )
            invitation.used_count += 1
            invitation.save(update_fields=["used_count"])

            registration_request.status = "APPROVED"
            registration_request.reviewed_by = request.user
            registration_request.reviewed_at = timezone.now()
            registration_request.rejection_reason = ""
            registration_request.save(
                update_fields=[
                    "status", "reviewed_by", "reviewed_at", "rejection_reason"
                ]
            )

            display_role = registration_request.get_requested_role_display()
            log_history(
                user=request.user,
                action="APPROVE",
                module="USER",
                change_type="USER",
                project=registration_request.project,
                object_name=user.get_full_name() or user.email,
                entity_id=user.id,
                description=f"Approved {display_role} registration for {user.email}.",
                old_state={"status": "PENDING"},
                new_state={"status": "APPROVED", "role": registration_request.requested_role},
            )
            if membership_created:
                log_history(
                    user=request.user,
                    action="ASSIGN",
                    module="USER",
                    change_type="USER",
                    project=registration_request.project,
                    object_name=user.get_full_name() or user.email,
                    entity_id=user.id,
                    description=(
                        f"Assigned {display_role} {user.email} to project "
                        f'"{registration_request.project.name}".'
                    ),
                    new_state={"membership_id": membership.id},
                )

        return Response(
            RegistrationRequestSerializer(registration_request).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        rejection = RegistrationRejectionSerializer(data=request.data)
        rejection.is_valid(raise_exception=True)
        with transaction.atomic():
            registration_request = self._locked_request(pk)
            if registration_request is None:
                return Response(status=status.HTTP_404_NOT_FOUND)
            if registration_request.status != "PENDING":
                return Response(
                    {"detail": "This registration request has already been processed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = registration_request.user
            if not registration_request.existing_user:
                user.role = None
                user.account_status = "REJECTED"
                user.is_active = False
                user.save(update_fields=["role", "account_status", "is_active"])

            registration_request.status = "REJECTED"
            registration_request.reviewed_by = request.user
            registration_request.reviewed_at = timezone.now()
            registration_request.rejection_reason = rejection.validated_data["reason"]
            registration_request.save(
                update_fields=[
                    "status", "reviewed_by", "reviewed_at", "rejection_reason"
                ]
            )
            log_history(
                user=request.user,
                action="REJECT",
                module="USER",
                change_type="USER",
                project=registration_request.project,
                object_name=user.get_full_name() or user.email,
                entity_id=user.id,
                description=f"Rejected registration for {user.email}.",
                old_state={"status": "PENDING"},
                new_state={"status": "REJECTED"},
            )

        return Response(
            RegistrationRequestSerializer(registration_request).data,
            status=status.HTTP_200_OK,
        )

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

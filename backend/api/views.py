from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie
from django.conf import settings
from django.db.models import Q
import logging
from .models import Job, UserProfile
from .serializers import (
    JobSerializer, LoginSerializer, UserSerializer, UserUpdateSerializer,
    AdminUserSerializer, AdminUserCreateSerializer, AdminUserUpdateSerializer
)

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token_view(request):
    """
    Get CSRF token
    GET /api/auth/csrf
    """
    return Response({'detail': 'CSRF cookie set'})


@api_view(['POST'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def login_view(request):
    """
    Login endpoint
    POST /api/auth/login
    """
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        # Find user by email
        try:
            user = User.objects.get(email=email)
            user = authenticate(request, username=user.username, password=password)
        except User.DoesNotExist:
            user = None

        if user is not None:
            login(request, user)
            # Get or create token for the user
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'message': 'Login successful',
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    Register new user
    POST /api/auth/register
    """
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')

    # Validation
    if not username or not email or not password:
        return Response({
            'error': 'Username, email, and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check if user already exists
    if User.objects.filter(username=username).exists():
        return Response({
            'error': 'Username already exists'
        }, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({
            'error': 'Email already exists'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Create user
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name
    )

    # Create token for the user
    token = Token.objects.create(user=user)

    return Response({
        'message': 'Registration successful',
        'user': UserSerializer(user).data,
        'token': token.key
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """
    Get current authenticated user
    GET /api/auth/me
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """
    Get or update user profile
    GET /api/profile - Get current user profile
    PUT/PATCH /api/profile - Update user profile
    """
    if request.method == 'GET':
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Return updated user data
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout endpoint - deletes the user's token
    POST /api/auth/logout
    """
    try:
        # Delete the user's token to logout
        request.user.auth_token.delete()
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class JobViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Job model

    Endpoints:
    - GET /api/jobs - List all jobs (with filtering)
    - POST /api/jobs - Create a new job
    - GET /api/jobs/:id - Get job details
    - PUT/PATCH /api/jobs/:id - Update job (selection, favorite)
    - DELETE /api/jobs/:id - Delete job
    - POST /api/jobs/:id/select - Select best simulation
    - POST /api/jobs/:id/favorite - Toggle favorite
    - GET /api/jobs/history - Get job history
    - GET /api/jobs/favorites - Get favorite jobs
    """
    serializer_class = JobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only return jobs for the current user
        queryset = Job.objects.filter(user=self.request.user)

        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by favorites
        favorites_only = self.request.query_params.get('favorites', None)
        if favorites_only and favorites_only.lower() == 'true':
            queryset = queryset.filter(is_favorite=True)

        # Filter by date range
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)

        # Search by region or scenario
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(region__icontains=search) | Q(scenario__icontains=search)
            )

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        # Automatically set the user to the current user
        logger.info(f"Creating job for user: {self.request.user.username}")

        # Create job with 'queued' status
        job = serializer.save(user=self.request.user, status='queued')

        # Log storage information
        if job.original_image:
            logger.info(f"Original image uploaded: {job.original_image.name}")
            logger.info(f"Original image URL: {job.original_image.url}")
            logger.info(f"Storage backend: {job.original_image.storage.__class__.__name__}")

        # Queue the job for async processing with WebSocket notifications
        from .tasks import process_image_generation
        task = process_image_generation.delay(str(job.id))
        logger.info(f"Job {job.id} queued for processing (task_id: {task.id})")

        return job

    def perform_destroy(self, instance):
        """
        Delete job and its associated images from storage
        DELETE /api/jobs/:id
        """
        # Delete images from storage
        if instance.original_image:
            instance.original_image.delete(save=False)
        if instance.simulation_image:
            instance.simulation_image.delete(save=False)

        # Delete the job record
        instance.delete()
        logger.info(f"Job {instance.id} deleted by user {instance.user.username}")

    @action(detail=True, methods=['post'])
    def favorite(self, request, pk=None):
        """
        Toggle favorite status
        POST /api/jobs/:id/favorite
        """
        job = self.get_object()
        job.is_favorite = not job.is_favorite
        job.save()

        return Response({
            'message': 'Favorite toggled',
            'is_favorite': job.is_favorite,
            'job': JobSerializer(job, context={'request': request}).data
        })

    @action(detail=False, methods=['get'])
    def history(self, request):
        """
        Get job history with pagination
        GET /api/jobs/history
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def favorites(self, request):
        """
        Get favorite jobs
        GET /api/jobs/favorites
        """
        queryset = self.get_queryset().filter(is_favorite=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ============== Admin Views ==============

class IsSuperUser(IsAuthenticated):
    """Permission class that only allows superusers"""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_superuser


@api_view(['GET'])
@permission_classes([IsSuperUser])
def admin_user_list(request):
    """
    List all users (admin only)
    GET /api/admin/users/
    """
    users = User.objects.all().order_by('-date_joined')

    # Search filter
    search = request.query_params.get('search', None)
    if search:
        users = users.filter(
            Q(username__icontains=search) |
            Q(email__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search)
        )

    # Active filter
    is_active = request.query_params.get('is_active', None)
    if is_active is not None:
        users = users.filter(is_active=is_active.lower() == 'true')

    serializer = AdminUserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsSuperUser])
def admin_user_create(request):
    """
    Create a new user (admin only)
    POST /api/admin/users/
    """
    serializer = AdminUserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        logger.info(f"Admin {request.user.username} created user {user.username}")
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsSuperUser])
def admin_user_detail(request, user_id):
    """
    Get, update, or delete a user (admin only)
    GET /api/admin/users/:id/
    PATCH /api/admin/users/:id/
    DELETE /api/admin/users/:id/
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = AdminUserSerializer(user)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        # Prevent admin from deactivating themselves
        if user.id == request.user.id and request.data.get('is_active') is False:
            return Response(
                {'error': 'You cannot deactivate your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AdminUserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Admin {request.user.username} updated user {user.username}")
            return Response(AdminUserSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Prevent admin from deleting themselves
        if user.id == request.user.id:
            return Response(
                {'error': 'You cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        username = user.username
        user.delete()
        logger.info(f"Admin {request.user.username} deleted user {username}")
        return Response({'message': f'User {username} deleted'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsSuperUser])
def admin_user_jobs(request, user_id):
    """
    Get jobs for a specific user (admin only)
    GET /api/admin/users/:id/jobs/
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    jobs = Job.objects.filter(user=user).order_by('-created_at')
    serializer = JobSerializer(jobs, many=True, context={'request': request})
    return Response(serializer.data)

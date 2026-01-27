from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import Job
from .serializers import JobSerializer, LoginSerializer, UserSerializer


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
    GET /api/jobs - List all jobs
    POST /api/jobs - Create a new job
    GET /api/jobs/:id - Get job details
    PUT/PATCH /api/jobs/:id - Update job
    DELETE /api/jobs/:id - Delete job
    """
    serializer_class = JobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only return jobs for the current user
        return Job.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Automatically set the user to the current user
        # Phase 0: Mark as completed immediately (using sample images)
        # In production, this will be 'queued' and processed by background workers
        serializer.save(user=self.request.user, status='completed')

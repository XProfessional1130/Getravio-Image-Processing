from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JobViewSet,
    login_view,
    register_view,
    current_user_view,
    logout_view,
    csrf_token_view,
    profile_view
)

router = DefaultRouter()
router.register(r'jobs', JobViewSet, basename='job')

urlpatterns = [
    path('auth/csrf', csrf_token_view, name='csrf-token'),
    path('auth/login', login_view, name='login'),
    path('auth/register', register_view, name='register'),
    path('auth/logout', logout_view, name='logout'),
    path('auth/me', current_user_view, name='current-user'),
    path('profile', profile_view, name='profile'),
    path('', include(router.urls)),
]

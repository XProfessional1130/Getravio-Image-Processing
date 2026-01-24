from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobViewSet, login_view, current_user_view

router = DefaultRouter()
router.register(r'jobs', JobViewSet, basename='job')

urlpatterns = [
    path('auth/login', login_view, name='login'),
    path('auth/me', current_user_view, name='current-user'),
    path('', include(router.urls)),
]

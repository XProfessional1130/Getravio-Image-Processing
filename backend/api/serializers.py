from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Job
from .sample_images import get_sample_simulation_urls


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""

    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class JobSerializer(serializers.ModelSerializer):
    """Serializer for Job model"""

    user = UserSerializer(read_only=True)
    original_image_url = serializers.SerializerMethodField()
    simulation1_url = serializers.SerializerMethodField()
    simulation2_url = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            'id',
            'user',
            'region',
            'scenario',
            'status',
            'message',
            'original_image',
            'original_image_url',
            'simulation1_image',
            'simulation1_url',
            'simulation2_image',
            'simulation2_url',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at', 'updated_at']

    def get_original_image_url(self, obj):
        request = self.context.get('request')
        if obj.original_image and request:
            return request.build_absolute_uri(obj.original_image.url)
        return None

    def get_simulation1_url(self, obj):
        request = self.context.get('request')
        if obj.simulation1_image and request:
            return request.build_absolute_uri(obj.simulation1_image.url)
        # Phase 0: Return sample image if job is completed but no real simulation exists
        elif obj.status == 'completed':
            sample_urls = get_sample_simulation_urls()
            return sample_urls['simulation1']
        return None

    def get_simulation2_url(self, obj):
        request = self.context.get('request')
        if obj.simulation2_image and request:
            return request.build_absolute_uri(obj.simulation2_image.url)
        # Phase 0: Return sample image if job is completed but no real simulation exists
        elif obj.status == 'completed':
            sample_urls = get_sample_simulation_urls()
            return sample_urls['simulation2']
        return None


class LoginSerializer(serializers.Serializer):
    """Serializer for login"""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

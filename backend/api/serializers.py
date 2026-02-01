from rest_framework import serializers
from django.contrib.auth.models import User
from django.conf import settings
from .models import Job, UserProfile
from .sample_images import get_sample_simulation_urls


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model"""

    class Meta:
        model = UserProfile
        fields = ['age', 'gender', 'phone', 'bio', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""

    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user and profile"""

    age = serializers.IntegerField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=UserProfile.GENDER_CHOICES, required=False, allow_null=True)
    phone = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)
    bio = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'age', 'gender', 'phone', 'bio']

    def update(self, instance, validated_data):
        # Extract profile fields
        profile_fields = {
            'age': validated_data.pop('age', None),
            'gender': validated_data.pop('gender', None),
            'phone': validated_data.pop('phone', None),
            'bio': validated_data.pop('bio', None),
        }

        # Update user fields
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()

        # Get or create profile (for users created before UserProfile model was added)
        profile, created = UserProfile.objects.get_or_create(user=instance)

        # Update profile fields
        for field, value in profile_fields.items():
            if value is not None:
                setattr(profile, field, value)
        profile.save()

        return instance


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
            'selected_simulation',
            'is_favorite',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at', 'updated_at']

    def _get_s3_url(self, image_field):
        """Generate URL for image - uses presigned URL for S3, regular URL otherwise"""
        if not image_field:
            return None

        # Check if using S3 storage
        if hasattr(image_field.storage, 's3_client'):
            # Generate presigned URL valid for 7 days
            return image_field.storage.url(image_field.name, expire=604800)
        else:
            # Local storage - use regular URL
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image_field.url)
            return image_field.url

    def get_original_image_url(self, obj):
        return self._get_s3_url(obj.original_image)

    def get_simulation1_url(self, obj):
        url = self._get_s3_url(obj.simulation1_image)
        if url:
            return url
        # Return sample image if job is completed but no real simulation exists
        if obj.status == 'completed':
            sample_urls = get_sample_simulation_urls()
            return sample_urls['simulation1']
        return None

    def get_simulation2_url(self, obj):
        url = self._get_s3_url(obj.simulation2_image)
        if url:
            return url
        # Return sample image if job is completed but no real simulation exists
        if obj.status == 'completed':
            sample_urls = get_sample_simulation_urls()
            return sample_urls['simulation2']
        return None


class LoginSerializer(serializers.Serializer):
    """Serializer for login"""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

# Storage configuration - Use S3 if enabled, otherwise local filesystem
# Note: Set to None to use DEFAULT_FILE_STORAGE from settings
media_storage = None


class UserProfile(models.Model):
    """Extended user profile with additional information"""

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    age = models.IntegerField(blank=True, null=True, help_text="User's age")
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    bio = models.TextField(blank=True, null=True, help_text="User biography")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"Profile of {self.user.username}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create profile when user is created"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save profile when user is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()


class Job(models.Model):
    """Model for image simulation jobs"""

    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    REGION_CHOICES = [
        ('gluteal', 'Gluteal Region'),
    ]

    SCENARIO_CHOICES = [
        ('projection-level-1', 'Projection Level 1'),
        ('projection-level-2', 'Projection Level 2'),
        ('projection-level-3', 'Projection Level 3'),
    ]

    SELECTION_CHOICES = [
        (None, 'None Selected'),
        ('simulation1', 'Simulation 1'),
        ('simulation2', 'Simulation 2'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='jobs')
    region = models.CharField(max_length=50, choices=REGION_CHOICES, default='gluteal')
    scenario = models.CharField(max_length=50, choices=SCENARIO_CHOICES, default='projection-level-1')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    message = models.TextField(blank=True, null=True)

    # User selection and favorites
    selected_simulation = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Which simulation result the user selected as best"
    )
    is_favorite = models.BooleanField(
        default=False,
        help_text="Whether user marked this job as favorite"
    )

    # Image fields (stored in S3 if USE_S3=True, otherwise local storage)
    original_image = models.ImageField(
        upload_to='originals/',
        storage=media_storage
    )
    simulation1_image = models.ImageField(
        upload_to='simulations/',
        storage=media_storage,
        blank=True,
        null=True
    )
    simulation2_image = models.ImageField(
        upload_to='simulations/',
        storage=media_storage,
        blank=True,
        null=True
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Job {self.id} - {self.user.username} - {self.status}"

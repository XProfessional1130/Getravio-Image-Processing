from django.db import models
from django.contrib.auth.models import User
from django.conf import settings

# Storage configuration - Use S3 if enabled, otherwise local filesystem
if hasattr(settings, 'USE_S3') and settings.USE_S3:
    from api.s3_storage import PublicMediaStorage
    media_storage = PublicMediaStorage()
else:
    # Use default Django storage (local filesystem)
    media_storage = None


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

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='jobs')
    region = models.CharField(max_length=50, choices=REGION_CHOICES, default='gluteal')
    scenario = models.CharField(max_length=50, choices=SCENARIO_CHOICES, default='projection-level-1')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    message = models.TextField(blank=True, null=True)

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

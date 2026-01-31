"""
Celery tasks for asynchronous image generation with WebSocket notifications.
"""
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)


def send_job_update_via_websocket(user_id, job_data):
    """
    Send job status update via WebSocket to the user's channel.
    """
    try:
        channel_layer = get_channel_layer()
        user_channel_name = f'job_updates_{user_id}'

        # Send update to user's WebSocket channel
        async_to_sync(channel_layer.group_send)(
            user_channel_name,
            {
                'type': 'job_status_update',
                'job': job_data
            }
        )
        logger.info(f"[WebSocket] Sent job update to user {user_id}: status={job_data.get('status')}")
    except Exception as e:
        logger.error(f"[WebSocket] Failed to send update to user {user_id}: {str(e)}")


@shared_task(bind=True, max_retries=3)
def process_image_generation(self, job_id):
    """
    Process image generation using on-server GPU with SDXL + ControlNet.
    Sends WebSocket notifications at each status change for real-time updates.

    Args:
        job_id: The ID of the job to process
    """
    from .models import Job
    from .ml_service import ImageGenerationService
    from .serializers import JobSerializer
    from django.core.files.base import ContentFile
    from PIL import Image
    import io

    try:
        # Fetch job
        job = Job.objects.get(id=job_id)
        user_id = job.user.id

        # Update status to processing and notify via WebSocket
        job.status = 'processing'
        job.save()

        # Serialize and send WebSocket update
        job_data = JobSerializer(job).data
        send_job_update_via_websocket(user_id, job_data)

        logger.info(f"[Job {job_id}] Starting GPU image generation for user {user_id}")

        # Load original image
        logger.info(f"[Job {job_id}] Loading original image...")
        original_image = Image.open(job.original_image)

        # Ensure RGB mode
        if original_image.mode != 'RGB':
            original_image = original_image.convert('RGB')

        logger.info(f"[Job {job_id}] Image loaded: {original_image.size}")

        # Initialize ML service
        ml_service = ImageGenerationService(device="cuda")

        # Generate both simulation views
        logger.info(f"[Job {job_id}] Generating rear and side views...")
        results = ml_service.generate_both_views(
            image=original_image,
            region=job.region,
            scenario=job.scenario,
            message=job.message or '',
            num_inference_steps=30,
            guidance_scale=7.5,
        )

        # Save generated images
        logger.info(f"[Job {job_id}] Saving generated images...")

        # Save rear view (simulation1_image)
        rear_buffer = io.BytesIO()
        results['rear'].save(rear_buffer, format='JPEG', quality=95)
        rear_buffer.seek(0)
        rear_content = ContentFile(rear_buffer.read())
        job.simulation1_image.save(
            f'simulations/{job_id}_rear.jpg',
            rear_content,
            save=False
        )
        logger.info(f"[Job {job_id}] ✓ Rear view saved")

        # Save side view (simulation2_image)
        side_buffer = io.BytesIO()
        results['side'].save(side_buffer, format='JPEG', quality=95)
        side_buffer.seek(0)
        side_content = ContentFile(side_buffer.read())
        job.simulation2_image.save(
            f'simulations/{job_id}_side.jpg',
            side_content,
            save=False
        )
        logger.info(f"[Job {job_id}] ✓ Side view saved")

        # Mark as completed
        job.status = 'completed'
        job.save()

        # Send final WebSocket update
        job_data = JobSerializer(job).data
        send_job_update_via_websocket(user_id, job_data)

        logger.info(f"[Job {job_id}] ✓ Successfully completed for user {user_id}")
        logger.info(f"[Job {job_id}] Rear view URL: {job.simulation1_image.url}")
        logger.info(f"[Job {job_id}] Side view URL: {job.simulation2_image.url}")

        return {
            'success': True,
            'job_id': str(job_id),
            'rear_url': job.simulation1_image.url if job.simulation1_image else None,
            'side_url': job.simulation2_image.url if job.simulation2_image else None,
        }

    except Job.DoesNotExist:
        logger.error(f"[Job {job_id}] Job not found")
        return {'success': False, 'error': 'Job not found'}

    except Exception as e:
        logger.error(f"[Job {job_id}] Error: {str(e)}")

        # Update job status to failed and notify via WebSocket
        try:
            job = Job.objects.get(id=job_id)
            job.status = 'failed'
            job.save()

            # Send error WebSocket update
            job_data = JobSerializer(job).data
            send_job_update_via_websocket(job.user.id, job_data)

        except Exception as inner_e:
            logger.error(f"[Job {job_id}] Failed to update error status: {str(inner_e)}")

        # Retry the task if max retries not reached
        if self.request.retries < self.max_retries:
            logger.info(f"[Job {job_id}] Retrying... (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=e, countdown=60)  # Retry after 60 seconds

        return {'success': False, 'error': str(e)}

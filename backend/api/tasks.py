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
    Process image generation using Replicate API.
    Sends WebSocket notifications at each status change.

    Args:
        job_id: The ID of the job to process
    """
    from .models import Job
    from .ml_service import ImageGenerationService
    from .serializers import JobSerializer
    import requests
    from django.core.files.base import ContentFile

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

        logger.info(f"[Job {job_id}] Starting image generation for user {user_id}")

        # Initialize ML service
        ml_service = ImageGenerationService()

        # Generate both simulation views
        results = ml_service.generate_both_views(
            original_image_url=job.original_image.url,
            region=job.region,
            scenario=job.scenario,
            message=job.message or ''
        )

        # Download and save generated images
        logger.info(f"[Job {job_id}] Downloading generated images")

        # Download simulation 1 (rear view)
        simulation1_response = requests.get(results['rear_view']['url'], timeout=60)
        simulation1_response.raise_for_status()
        job.simulation1.save(
            f'simulation1_{job_id}.png',
            ContentFile(simulation1_response.content),
            save=False
        )

        # Download simulation 2 (side view)
        simulation2_response = requests.get(results['side_view']['url'], timeout=60)
        simulation2_response.raise_for_status()
        job.simulation2.save(
            f'simulation2_{job_id}.png',
            ContentFile(simulation2_response.content),
            save=False
        )

        # Mark as completed
        job.status = 'completed'
        job.save()

        # Send final WebSocket update
        job_data = JobSerializer(job).data
        send_job_update_via_websocket(user_id, job_data)

        logger.info(f"[Job {job_id}] Successfully completed for user {user_id}")
        logger.info(f"[Job {job_id}] Simulation 1 URL: {job.simulation1.url}")
        logger.info(f"[Job {job_id}] Simulation 2 URL: {job.simulation2.url}")

        return {
            'success': True,
            'job_id': str(job_id),
            'simulation1_url': job.simulation1.url,
            'simulation2_url': job.simulation2.url
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
            job.error_message = str(e)
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

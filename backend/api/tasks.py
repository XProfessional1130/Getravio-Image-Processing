"""
Celery tasks for asynchronous image generation processing
"""
from celery import shared_task
from django.core.files.base import ContentFile
import requests
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_image_generation(self, job_id):
    """
    Process image generation using Replicate API

    This task:
    1. Fetches the job from database
    2. Gets the original image URL
    3. Calls ML service to generate rear and side views
    4. Downloads the results
    5. Saves them to S3
    6. Updates job status

    Args:
        job_id: ID of the Job to process

    Returns:
        dict: Status information
    """
    from .models import Job
    from .ml_service import ImageGenerationService

    try:
        # Get the job
        job = Job.objects.get(id=job_id)
        logger.info(f"[Task {self.request.id}] Starting generation for job {job_id}")

        # Update status to processing
        job.status = 'processing'
        job.save()

        # Get publicly accessible URL for original image
        # S3 URLs should already be public based on your setup
        original_image_url = job.original_image.url

        logger.info(f"[Task {self.request.id}] Original image URL: {original_image_url[:100]}...")

        # Initialize ML service
        ml_service = ImageGenerationService()

        # Generate both views
        logger.info(f"[Task {self.request.id}] Generating rear and side views...")
        results = ml_service.generate_both_views(
            image_url=original_image_url,
            region=job.region,
            scenario=job.scenario,
            message=job.message or "",
        )

        logger.info(f"[Task {self.request.id}] Generation complete, downloading results...")

        # Download and save rear view to S3
        try:
            rear_response = requests.get(results["rear"], timeout=60)
            rear_response.raise_for_status()
            rear_content = ContentFile(rear_response.content)
            job.simulation1_url.save(
                f'simulations/{job.id}_rear.jpg',
                rear_content,
                save=False
            )
            logger.info(f"[Task {self.request.id}] Rear view saved to S3")
        except Exception as e:
            logger.error(f"[Task {self.request.id}] Failed to download/save rear view: {e}")
            raise

        # Download and save side view to S3
        try:
            side_response = requests.get(results["side"], timeout=60)
            side_response.raise_for_status()
            side_content = ContentFile(side_response.content)
            job.simulation2_url.save(
                f'simulations/{job.id}_side.jpg',
                side_content,
                save=False
            )
            logger.info(f"[Task {self.request.id}] Side view saved to S3")
        except Exception as e:
            logger.error(f"[Task {self.request.id}] Failed to download/save side view: {e}")
            raise

        # Mark as completed
        job.status = 'completed'
        job.save()

        logger.info(f"[Task {self.request.id}] Job {job_id} completed successfully")

        return {
            'status': 'success',
            'job_id': job_id,
            'rear_url': job.simulation1_url.url if job.simulation1_url else None,
            'side_url': job.simulation2_url.url if job.simulation2_url else None,
        }

    except Job.DoesNotExist:
        logger.error(f"[Task {self.request.id}] Job {job_id} not found")
        raise

    except Exception as e:
        logger.error(f"[Task {self.request.id}] Job {job_id} failed: {e}", exc_info=True)

        # Update job status to failed
        try:
            job = Job.objects.get(id=job_id)
            job.status = 'failed'
            job.error_message = str(e)[:500]  # Limit error message length
            job.save()
        except Exception as save_error:
            logger.error(f"[Task {self.request.id}] Could not save error status: {save_error}")

        # Retry the task (up to max_retries)
        try:
            raise self.retry(exc=e, countdown=60)  # Retry after 60 seconds
        except self.MaxRetriesExceededError:
            logger.error(f"[Task {self.request.id}] Max retries exceeded for job {job_id}")
            return {
                'status': 'failed',
                'job_id': job_id,
                'error': str(e),
            }

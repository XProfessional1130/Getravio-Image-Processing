"""
Celery tasks for local image generation processing
Uses local SDXL + ControlNet pipeline instead of external API
"""
from celery import shared_task
from django.core.files.base import ContentFile
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

# Global ML service instance (loaded once, reused across tasks)
_ml_service = None


def get_ml_service():
    """
    Get or create ML service instance
    Reuses the same instance across tasks to avoid reloading models
    """
    global _ml_service
    if _ml_service is None:
        from .local_ml_service import LocalImageGenerationService
        logger.info("Initializing local ML service...")
        _ml_service = LocalImageGenerationService(device="cuda")
    return _ml_service


@shared_task(bind=True, max_retries=1)
def process_image_generation_local(self, job_id):
    """
    Process image generation using local SDXL pipeline

    This task:
    1. Fetches the job from database
    2. Downloads original image
    3. Runs local SDXL + ControlNet to generate rear and side views
    4. Saves results to S3
    5. Updates job status

    Args:
        job_id: ID of the Job to process

    Returns:
        dict: Status information
    """
    from .models import Job

    try:
        # Get the job
        job = Job.objects.get(id=job_id)
        logger.info(f"[Task {self.request.id}] Starting LOCAL generation for job {job_id}")

        # Update status to processing
        job.status = 'processing'
        job.save()

        # Download original image
        logger.info(f"[Task {self.request.id}] Loading original image...")
        original_image = Image.open(job.original_image)

        if original_image.mode != 'RGB':
            original_image = original_image.convert('RGB')

        logger.info(f"[Task {self.request.id}] Image loaded: {original_image.size}")

        # Get ML service
        ml_service = get_ml_service()

        # Log GPU memory before generation
        memory_info = ml_service.get_memory_usage()
        if memory_info:
            logger.info(f"[Task {self.request.id}] GPU Memory before: {memory_info['allocated_gb']:.2f}GB / {memory_info['reserved_gb']:.2f}GB")

        # Generate both views
        logger.info(f"[Task {self.request.id}] Generating rear and side views locally...")
        results = ml_service.generate_both_views(
            image=original_image,
            region=job.region,
            scenario=job.scenario,
            message=job.message or "",
            num_inference_steps=30,
            guidance_scale=7.5,
        )

        logger.info(f"[Task {self.request.id}] Generation complete, saving to S3...")

        # Save rear view to S3
        rear_buffer = io.BytesIO()
        results["rear"].save(rear_buffer, format='JPEG', quality=95)
        rear_buffer.seek(0)
        rear_content = ContentFile(rear_buffer.read())
        job.simulation1_url.save(
            f'simulations/{job.id}_rear.jpg',
            rear_content,
            save=False
        )
        logger.info(f"[Task {self.request.id}] ✓ Rear view saved to S3")

        # Save side view to S3
        side_buffer = io.BytesIO()
        results["side"].save(side_buffer, format='JPEG', quality=95)
        side_buffer.seek(0)
        side_content = ContentFile(side_buffer.read())
        job.simulation2_url.save(
            f'simulations/{job.id}_side.jpg',
            side_content,
            save=False
        )
        logger.info(f"[Task {self.request.id}] ✓ Side view saved to S3")

        # Mark as completed
        job.status = 'completed'
        job.save()

        # Log GPU memory after generation
        memory_info = ml_service.get_memory_usage()
        if memory_info:
            logger.info(f"[Task {self.request.id}] GPU Memory after: {memory_info['allocated_gb']:.2f}GB / {memory_info['reserved_gb']:.2f}GB")

        logger.info(f"[Task {self.request.id}] ✓ Job {job_id} completed successfully")

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
            job.error_message = str(e)[:500]
            job.save()
        except Exception as save_error:
            logger.error(f"[Task {self.request.id}] Could not save error status: {save_error}")

        # Only retry once for local generation (no point retrying GPU errors)
        if self.request.retries < self.max_retries:
            logger.info(f"[Task {self.request.id}] Retrying job {job_id} (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=e, countdown=30)
        else:
            logger.error(f"[Task {self.request.id}] Max retries exceeded for job {job_id}")
            return {
                'status': 'failed',
                'job_id': job_id,
                'error': str(e),
            }


@shared_task
def warm_up_model():
    """
    Warm up the ML model by loading it into memory
    Run this after Celery worker starts to avoid first-request delay
    """
    try:
        logger.info("Warming up local ML model...")
        ml_service = get_ml_service()
        ml_service._load_pipeline()
        logger.info("✓ Model warmed up and ready")
        return {'status': 'success', 'message': 'Model loaded'}
    except Exception as e:
        logger.error(f"Model warm-up failed: {e}", exc_info=True)
        return {'status': 'failed', 'error': str(e)}


@shared_task
def unload_model():
    """
    Unload model from memory to free GPU VRAM
    Useful for maintenance or when switching models
    """
    global _ml_service
    if _ml_service is not None:
        _ml_service.unload_model()
        _ml_service = None
        logger.info("Model unloaded from memory")
        return {'status': 'success', 'message': 'Model unloaded'}
    return {'status': 'success', 'message': 'No model loaded'}


@shared_task
def get_gpu_status():
    """
    Get current GPU memory usage
    Useful for monitoring
    """
    try:
        ml_service = get_ml_service()
        memory_info = ml_service.get_memory_usage()
        return {
            'status': 'success',
            'memory': memory_info
        }
    except Exception as e:
        logger.error(f"Failed to get GPU status: {e}")
        return {
            'status': 'failed',
            'error': str(e)
        }

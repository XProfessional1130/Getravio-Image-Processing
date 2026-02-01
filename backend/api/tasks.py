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


def send_progress_update(user_id, job_id, progress_data):
    """
    Send real-time progress update via WebSocket.
    """
    try:
        channel_layer = get_channel_layer()
        user_channel_name = f'job_updates_{user_id}'

        async_to_sync(channel_layer.group_send)(
            user_channel_name,
            {
                'type': 'job_progress_update',
                'job_id': str(job_id),
                'progress': progress_data
            }
        )
        logger.info(f"[WebSocket] Progress update for job {job_id}: {progress_data.get('step')}/{progress_data.get('total_steps')}")
    except Exception as e:
        logger.error(f"[WebSocket] Failed to send progress: {str(e)}")


@shared_task(bind=True, max_retries=3)
def process_image_generation(self, job_id):
    """
    Process image generation with real-time progress updates.
    Sends WebSocket notifications for progress and immediate image display.
    """
    from .models import Job
    from .ml_service import ImageGenerationService, PROMPTS
    from .serializers import JobSerializer
    from django.core.files.base import ContentFile
    from PIL import Image
    import io
    import os

    try:
        # Fetch job
        job = Job.objects.get(id=job_id)
        user_id = job.user.id

        # Update status to processing
        job.status = 'processing'
        job.save()

        job_data = JobSerializer(job).data
        send_job_update_via_websocket(user_id, job_data)

        logger.info(f"[Job {job_id}] Starting image generation for user {user_id}")

        # Load original image
        original_image = Image.open(job.original_image)
        if original_image.mode != 'RGB':
            original_image = original_image.convert('RGB')

        logger.info(f"[Job {job_id}] Image loaded: {original_image.size}")

        # Initialize ML service
        ml_service = ImageGenerationService(device="cuda")

        # Get inference steps from config
        mode = "dev" if os.getenv('ML_MODEL', 'sdxl') == 'sd21' else "prod"
        num_steps = PROMPTS.get(mode, {}).get("inference_steps", 20)

        # Create progress callback
        def progress_callback(step, total_steps, view_name):
            send_progress_update(user_id, job_id, {
                'view': view_name,
                'step': step,
                'total_steps': total_steps,
                'percentage': int((step / total_steps) * 100)
            })

        # ========== Generate REAR view ==========
        logger.info(f"[Job {job_id}] Generating rear view...")
        send_progress_update(user_id, job_id, {
            'view': 'rear',
            'step': 0,
            'total_steps': num_steps,
            'percentage': 0,
            'message': 'Starting rear view generation...'
        })

        rear_image = ml_service.generate_image(
            image=original_image,
            region=job.region,
            scenario=job.scenario,
            view="rear",
            message=job.message or '',
            num_inference_steps=num_steps,
            guidance_scale=7.5,
            progress_callback=lambda step, total: progress_callback(step, total, 'rear')
        )

        # Save rear view immediately
        rear_buffer = io.BytesIO()
        rear_image.save(rear_buffer, format='JPEG', quality=95)
        rear_buffer.seek(0)
        job.simulation1_image.save(
            f'simulations/{job_id}_rear.jpg',
            ContentFile(rear_buffer.read()),
            save=True  # Save to DB immediately
        )
        logger.info(f"[Job {job_id}] ✓ Rear view saved")

        # Send update with rear image available
        job.refresh_from_db()
        job_data = JobSerializer(job).data
        job_data['rear_complete'] = True
        send_job_update_via_websocket(user_id, job_data)

        # ========== Generate SIDE view ==========
        logger.info(f"[Job {job_id}] Generating side view...")
        send_progress_update(user_id, job_id, {
            'view': 'side',
            'step': 0,
            'total_steps': num_steps,
            'percentage': 0,
            'message': 'Starting side view generation...'
        })

        side_image = ml_service.generate_image(
            image=original_image,
            region=job.region,
            scenario=job.scenario,
            view="side",
            message=job.message or '',
            num_inference_steps=num_steps,
            guidance_scale=7.5,
            progress_callback=lambda step, total: progress_callback(step, total, 'side')
        )

        # Save side view
        side_buffer = io.BytesIO()
        side_image.save(side_buffer, format='JPEG', quality=95)
        side_buffer.seek(0)
        job.simulation2_image.save(
            f'simulations/{job_id}_side.jpg',
            ContentFile(side_buffer.read()),
            save=True
        )
        logger.info(f"[Job {job_id}] ✓ Side view saved")

        # Mark as completed
        job.status = 'completed'
        job.save()

        # Send final update
        job.refresh_from_db()
        job_data = JobSerializer(job).data
        job_data['side_complete'] = True
        send_job_update_via_websocket(user_id, job_data)

        logger.info(f"[Job {job_id}] ✓ Successfully completed")

        return {
            'success': True,
            'job_id': str(job_id),
        }

    except Job.DoesNotExist:
        logger.error(f"[Job {job_id}] Job not found")
        return {'success': False, 'error': 'Job not found'}

    except Exception as e:
        logger.error(f"[Job {job_id}] Error: {str(e)}")

        try:
            job = Job.objects.get(id=job_id)
            job.status = 'failed'
            job.save()

            job_data = JobSerializer(job).data
            send_job_update_via_websocket(job.user.id, job_data)

        except Exception as inner_e:
            logger.error(f"[Job {job_id}] Failed to update error status: {str(inner_e)}")

        if self.request.retries < self.max_retries:
            logger.info(f"[Job {job_id}] Retrying... (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=e, countdown=60)

        return {'success': False, 'error': str(e)}

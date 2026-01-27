# Phase 0 Testing - Sample Images

## Overview

For Phase 0 development, the system uses **sample/placeholder images** instead of real AI-generated simulations. This allows testing the complete workflow without implementing actual image processing.

## How It Works

### Backend Behavior

1. **Job Creation**
   - User uploads original image
   - Job is created with status: `completed` (instant)
   - No actual AI processing occurs

2. **Sample Images**
   - When job status is `completed` and no real simulation images exist
   - API returns sample image URLs automatically
   - Sample images are hosted on Unsplash

3. **Sample Images Used**
   - **REAR View**: `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80`
   - **SIDE View**: `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80`

### Files Modified

1. **api/sample_images.py** (NEW)
   - Contains sample image URLs
   - Returns placeholder images for testing

2. **api/serializers.py**
   - Modified `get_simulation1_url()` to return sample URL for completed jobs
   - Modified `get_simulation2_url()` to return sample URL for completed jobs

3. **api/views.py**
   - Modified `perform_create()` to save jobs as `completed` instead of `queued`
   - This simulates instant processing with results

## Testing the Flow

### 1. Start Backend
```bash
cd backend
venv\Scripts\activate
python manage.py runserver
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Test Complete Workflow

1. **Login**: http://localhost:5173
   - Email: test@example.com
   - Password: testpass123

2. **Upload Image**
   - Click on "ORIGINAL" box
   - Select any image file
   - See immediate preview

3. **Submit Job**
   - Select region and projection level
   - Click "Generate Simulation"
   - Job status changes to "PROCESSING"

4. **View Results**
   - Job immediately shows as "COMPLETED"
   - REAR and SIDE views show sample images
   - Original image shows your uploaded file

### 4. Verify in Database

```bash
# Django shell
python manage.py shell

# Check jobs
from api.models import Job
jobs = Job.objects.all()
for job in jobs:
    print(f"Job {job.id}: {job.status}, User: {job.user.email}")
```

### 5. Check Django Admin

1. Go to http://127.0.0.1:8000/admin
2. Login: admin / admin123
3. View Jobs section
4. See all submitted jobs with uploaded images

## API Response Example

```json
{
  "id": 1,
  "user": {
    "id": 2,
    "username": "testuser",
    "email": "test@example.com"
  },
  "region": "gluteal",
  "scenario": "projection-level-1",
  "status": "completed",
  "message": "Test simulation",
  "original_image": "/media/originals/test.jpg",
  "original_image_url": "http://127.0.0.1:8000/media/originals/test.jpg",
  "simulation1_image": null,
  "simulation1_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  "simulation2_image": null,
  "simulation2_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
  "created_at": "2026-01-27T12:00:00Z",
  "updated_at": "2026-01-27T12:00:00Z"
}
```

Notice:
- `simulation1_image` and `simulation2_image` are `null` (no files uploaded)
- `simulation1_url` and `simulation2_url` return sample image URLs
- `status` is `completed`

## Production Implementation (Future)

When implementing real AI processing:

1. **Change Job Status Flow**
   ```python
   # In views.py perform_create()
   serializer.save(user=self.request.user, status='queued')  # Not 'completed'
   ```

2. **Add Background Processing**
   - Use Celery for async task processing
   - Worker processes images from queue
   - Updates job status: queued → processing → completed

3. **Save Real Simulations**
   ```python
   # In processing worker
   job.simulation1_image.save('result1.jpg', image_file)
   job.simulation2_image.save('result2.jpg', image_file)
   job.status = 'completed'
   job.save()
   ```

4. **Remove Sample Images**
   - Delete or disable `sample_images.py`
   - Remove sample URL logic from serializers
   - Only return real uploaded simulation images

## Benefits of This Approach

✅ Test complete user workflow without AI
✅ No need to implement image processing yet
✅ Database structure is production-ready
✅ API contract is correct
✅ Frontend UI works as expected
✅ Easy to switch to real processing later

## Current Limitations

⚠️ No actual image processing
⚠️ All jobs complete instantly
⚠️ Sample images are same for all jobs
⚠️ No processing queue or workers
⚠️ No job status polling needed (instant completion)

---

**Status**: Phase 0 - Working prototype with sample data
**Next Phase**: Implement actual AI image processing pipeline

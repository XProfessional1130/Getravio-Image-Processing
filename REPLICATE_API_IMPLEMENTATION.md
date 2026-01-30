# Replicate API Implementation - Setup Guide

This guide helps you set up and deploy the Replicate API integration for AI-powered gluteal enhancement simulation.

## Overview

The implementation uses:
- **Replicate API** for AI image generation (Stable Diffusion XL)
- **Celery** for async task processing
- **Redis** as message broker
- **AWS S3** for image storage (already configured)

## Prerequisites

1. **Replicate Account**
   - Sign up at https://replicate.com/
   - Get API token from https://replicate.com/account/api-tokens

2. **Redis Server** (for Celery)
   - Install Redis: https://redis.io/download
   - Windows: https://github.com/microsoftarchive/redis/releases
   - Or use Redis Cloud (free tier): https://redis.com/try-free/

3. **Python Packages**
   - Already added to `requirements.txt`

## Installation Steps

### Step 1: Install Dependencies (5 minutes)

```bash
cd backend
pip install -r requirements.txt
```

This installs:
- `replicate>=0.23.1` - Replicate API client
- `celery>=5.3.6` - Task queue
- `redis>=5.0.1` - Redis client
- `requests>=2.31.0` - HTTP client for downloads

### Step 2: Configure Environment (3 minutes)

Edit your `backend/.env` file and add:

```bash
# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Replicate API Token
REPLICATE_API_TOKEN=r8_your_token_here
```

**Get your Replicate token:**
1. Go to https://replicate.com/account/api-tokens
2. Click "Create token"
3. Copy the token (starts with `r8_`)
4. Paste into `.env` file

### Step 3: Start Redis Server (2 minutes)

**Option A: Local Redis**
```bash
# Linux/Mac
redis-server

# Windows (if installed as service)
net start Redis

# Windows (manual)
redis-server.exe
```

**Option B: Redis Cloud (Recommended for Production)**
1. Sign up at https://redis.com/try-free/
2. Create a free database
3. Copy connection string
4. Update CELERY_BROKER_URL in `.env`

### Step 4: Test Configuration (5 minutes)

Run the test script:

```bash
cd backend
python test_replicate.py
```

This will:
- ✓ Check environment variables
- ✓ Test Replicate API connection
- ✓ Test prompt generation
- ⚠ Optionally test image generation (~$0.04)

**Expected Output:**
```
======================================================================
 REPLICATE API INTEGRATION TEST SUITE
======================================================================
======================================================================
TESTING ENVIRONMENT CONFIGURATION
======================================================================
✓ REPLICATE_API_TOKEN configured: r8_xxxxx...
✓ CELERY_BROKER_URL configured: redis://localhost:6379/0
✓ AWS S3 enabled: bucket=your-bucket

✓ All environment variables configured!

======================================================================
TESTING REPLICATE API CONNECTION
======================================================================
✓ ImageGenerationService initialized successfully
✓ Replicate API connection successful

======================================================================
TESTING PROMPT GENERATION
======================================================================
...
✓ Prompt generation working correctly
```

### Step 5: Start Celery Worker (2 minutes)

Open a **new terminal** window and run:

```bash
cd backend
celery -A getravio worker --loglevel=info --pool=solo
```

**Note for Windows**: Use `--pool=solo` flag on Windows

Keep this terminal running. You should see:
```
-------------- celery@hostname v5.3.6
...
[tasks]
  . api.tasks.process_image_generation

[2024-01-30 12:00:00,000: INFO/MainProcess] Connected to redis://localhost:6379/0
[2024-01-30 12:00:00,000: INFO/MainProcess] mingle: searching for neighbors
[2024-01-30 12:00:00,000: INFO/MainProcess] mingle: all alone
[2024-01-30 12:00:00,000: INFO/MainProcess] celery@hostname ready.
```

### Step 6: Start Django Server (1 minute)

In your **original terminal**, start Django:

```bash
cd backend
python manage.py runserver
```

### Step 7: Test End-to-End (5 minutes)

1. Open frontend: http://localhost:5173
2. Upload an image
3. Submit generation request
4. Watch the Celery terminal for processing logs:
   ```
   [Task 123] Starting generation for job 5
   [Task 123] Generating rear and side views...
   [Task 123] Generation complete, downloading results...
   [Task 123] Job 5 completed successfully
   ```
5. View results in the frontend (usually takes 30-60 seconds)

## Architecture

```
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │ Upload image
       ↓
┌─────────────┐
│   Django    │
│   Views     │
└──────┬──────┘
       │ Create job (status='queued')
       │ Upload to S3
       ↓
┌─────────────┐
│   Celery    │──→ Queue in Redis
│   Worker    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Replicate  │
│    API      │ Generate images (SDXL)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Download   │
│  Save to S3 │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Update Job │ status='completed'
│  (Database) │
└─────────────┘
```

## File Structure

```
backend/
├── api/
│   ├── ml_service.py          # Replicate API service
│   ├── tasks.py               # Celery tasks
│   ├── views.py               # Updated to queue jobs
│   └── models.py              # Job model (unchanged)
├── getravio/
│   ├── __init__.py            # Celery app import
│   ├── celery.py              # Celery configuration
│   └── settings.py            # Updated with Celery & Replicate config
├── test_replicate.py          # Test script
└── requirements.txt           # Updated with new packages
```

## Monitoring & Debugging

### Check Celery Logs

The Celery terminal shows real-time processing:
```bash
[2024-01-30 12:05:23,456: INFO/MainProcess] Task api.tasks.process_image_generation[abc-123] received
[2024-01-30 12:05:23,457: INFO/ForkPoolWorker-1] [Task abc-123] Starting generation for job 5
[2024-01-30 12:05:45,678: INFO/ForkPoolWorker-1] [Task abc-123] Generation complete
[2024-01-30 12:05:47,890: INFO/ForkPoolWorker-1] [Task abc-123] Job 5 completed successfully
[2024-01-30 12:05:48,012: INFO/ForkPoolWorker-1] Task api.tasks.process_image_generation[abc-123] succeeded
```

### Check Job Status in Database

```bash
python manage.py shell
```

```python
from api.models import Job

# Get all jobs
jobs = Job.objects.all()

# Check specific job
job = Job.objects.get(id=5)
print(f"Status: {job.status}")
print(f"Original: {job.original_image.url}")
print(f"Rear: {job.simulation1_url.url if job.simulation1_url else 'Not ready'}")
print(f"Side: {job.simulation2_url.url if job.simulation2_url else 'Not ready'}")
```

### Check Replicate Dashboard

Monitor costs and usage:
1. Go to https://replicate.com/account
2. View "Usage" tab
3. See cost per prediction (~$0.02 per image)

### Common Issues

#### Issue: "Connection refused" for Redis
**Solution**: Make sure Redis is running
```bash
redis-cli ping
# Should return: PONG
```

#### Issue: "REPLICATE_API_TOKEN not configured"
**Solution**: Check `.env` file has the token
```bash
cd backend
cat .env | grep REPLICATE
# Should show: REPLICATE_API_TOKEN=r8_...
```

#### Issue: Celery not receiving tasks
**Solution**: Restart Celery worker
```bash
# Ctrl+C to stop Celery
celery -A getravio worker --loglevel=info --pool=solo
```

#### Issue: Images not uploading to S3
**Solution**: Check AWS credentials
```bash
cd backend
python manage.py shell
```
```python
from django.conf import settings
print(f"USE_S3: {settings.USE_S3}")
print(f"Bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
```

#### Issue: Generation takes too long (>5 minutes)
**Possible causes**:
1. Replicate API is slow (check status.replicate.com)
2. Network issue downloading results
3. S3 upload is slow

**Debug**:
- Check Celery logs for specific step timing
- Try test_replicate.py to test Replicate directly

## Cost Estimation

### Per Image Generation
- **Rear view**: ~$0.01
- **Side view**: ~$0.01
- **Total per job**: ~$0.02

### Monthly Estimates

| Users/Month | Jobs/Month | Cost/Month |
|-------------|------------|------------|
| 50 | 100 | $2 |
| 100 | 250 | $5 |
| 500 | 1,000 | $20 |
| 1,000 | 2,500 | $50 |
| 5,000 | 10,000 | $200 |

### Optimization Tips

1. **Cache results**: Don't regenerate identical requests
2. **Reduce steps**: Lower `num_inference_steps` from 30 to 25 (faster, cheaper)
3. **Batch requests**: Process multiple jobs together
4. **Monitor usage**: Set billing alerts in Replicate dashboard

## Deployment to Production

### Option 1: Same Server (Simple)

1. Install Redis on production server
2. Update `.env` with production values
3. Start Celery as a service:

```bash
# Create systemd service file: /etc/systemd/system/celery.service
[Unit]
Description=Celery Service
After=network.target

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/var/www/getravio/backend
Environment="PATH=/var/www/getravio/backend/venv/bin"
ExecStart=/var/www/getravio/backend/venv/bin/celery -A getravio worker --loglevel=info --detach

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable celery
sudo systemctl start celery
```

### Option 2: Separate Worker Server (Scalable)

1. **Web Server**: Run Django only
2. **Worker Server**: Run Celery workers
3. **Shared**: Redis (or use Redis Cloud)
4. **Shared**: Database (PostgreSQL)
5. **Shared**: S3 storage

Benefits:
- Scale workers independently
- Isolate compute-heavy tasks
- Better resource utilization

### Option 3: Docker (Recommended)

See `docker-compose.yml` for full setup

## Next Steps

1. **Test with real images** via frontend
2. **Monitor first 100 generations** for quality
3. **Adjust prompts** in `ml_service.py` if needed
4. **Set billing alerts** in Replicate dashboard
5. **Document any issues** for further optimization

## Support & Resources

- **Replicate Docs**: https://replicate.com/docs
- **Celery Docs**: https://docs.celeryq.dev/
- **SDXL Model**: https://replicate.com/stability-ai/sdxl
- **Project Issues**: See `TROUBLESHOOTING.md`

## Prompt Customization

To adjust enhancement levels, edit `backend/api/ml_service.py`:

```python
scenario_config = {
    "projection-level-1": {
        "description": "your custom description",
        "strength": 0.35,  # 0.0-1.0 (higher = more change)
    },
    # Add more scenarios...
}
```

**Strength Guidelines**:
- `0.2-0.4`: Very subtle changes
- `0.4-0.6`: Moderate changes
- `0.6-0.8`: Strong changes
- `0.8-1.0`: Maximum changes (may lose identity)

## Migration to Self-Hosted (Future)

When you're ready for self-hosted GPU:

1. Set up GPU server (RTX 4090 or cloud GPU)
2. Install SDXL + ControlNet locally
3. Replace `ImageGenerationService` implementation
4. Keep same API interface (no frontend changes)
5. Enjoy faster inference and lower cost at scale

See `MODEL_IMPLEMENTATION_PLAN.md` for details.

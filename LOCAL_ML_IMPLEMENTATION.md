# Local ML Implementation - Self-Hosted SDXL Guide

Complete guide for running AI image generation locally using SDXL + ControlNet on your own GPU.

## Overview

This implementation runs **Stable Diffusion XL (SDXL) + ControlNet** directly on your server/workstation GPU, eliminating external API costs and providing full control over the ML pipeline.

### Architecture

```
User Upload → Django API → Celery Queue → Local GPU Worker
                                              ↓
                                    SDXL + ControlNet Pipeline
                                    (Running on your GPU)
                                              ↓
                                  Generate Rear + Side Views
                                              ↓
                                        Save to S3 → Display
```

## Hardware Requirements

### Minimum (Not Recommended)
- **GPU**: NVIDIA RTX 3060 (12GB VRAM)
- **RAM**: 16GB
- **Storage**: 50GB free (for models)
- **Inference Time**: 2-3 minutes per image pair

### Recommended
- **GPU**: NVIDIA RTX 4080/4090 (16-24GB VRAM)
- **RAM**: 32GB
- **Storage**: 100GB SSD
- **Inference Time**: 30-60 seconds per image pair

### Optimal
- **GPU**: NVIDIA A6000/A100 (48GB VRAM)
- **RAM**: 64GB
- **Storage**: 200GB NVMe SSD
- **Inference Time**: 20-40 seconds per image pair

### Cloud GPU Options
If you don't have local GPU:
- **RunPod**: $0.50-1.00/hour (RTX 4090, A6000)
- **Lambda Labs**: $0.60-1.10/hour
- **AWS EC2 G5**: $1.01-5.67/hour
- **GCP**: $0.94-2.48/hour

## Software Requirements

### Operating System
- **Linux**: Ubuntu 20.04+ (Recommended)
- **Windows**: Windows 10/11 with WSL2 or native
- **macOS**: Not recommended (limited CUDA support)

### CUDA
- **CUDA 11.8** or **CUDA 12.1** (12.1 recommended)
- Download: https://developer.nvidia.com/cuda-downloads
- Verify: `nvcc --version`

### Python
- **Python 3.10** or **3.11**
- NOT Python 3.12 (PyTorch compatibility issues)

## Installation

### Step 1: Install System Dependencies (10 minutes)

#### Ubuntu/Linux
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install build tools
sudo apt install -y build-essential python3-dev python3-pip git

# Install CUDA (if not already installed)
# Follow: https://developer.nvidia.com/cuda-downloads

# Verify CUDA
nvidia-smi
nvcc --version
```

#### Windows
```bash
# Install Visual Studio Build Tools
# Download: https://visualstudio.microsoft.com/downloads/
# Select "Desktop development with C++"

# Install CUDA
# Download: https://developer.nvidia.com/cuda-downloads

# Verify
nvidia-smi
nvcc --version
```

### Step 2: Install PyTorch with CUDA (5 minutes)

**IMPORTANT**: Install PyTorch BEFORE other packages

#### For CUDA 12.1 (Recommended)
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

#### For CUDA 11.8
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

#### Verify Installation
```bash
python -c "import torch; print(f'PyTorch: {torch.__version__}'); print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'CUDA Version: {torch.version.cuda}')"
```

Expected output:
```
PyTorch: 2.1.0+cu121
CUDA Available: True
CUDA Version: 12.1
```

### Step 3: Install ML Dependencies (5 minutes)

```bash
cd backend
pip install -r requirements_ml.txt
```

This installs:
- `diffusers` - SDXL pipeline
- `transformers` - Model utilities
- `accelerate` - GPU optimization
- `controlnet-aux` - Pose detection
- `opencv-python`, `mediapipe` - Image preprocessing

### Step 4: Download Models (30-60 minutes first time)

Models total ~13GB and will be downloaded automatically on first use.

```bash
cd backend
python download_models.py
```

This will:
1. Check GPU availability
2. Download SDXL Base (6.9GB)
3. Download ControlNet OpenPose (2.5GB)
4. Download VAE (335MB)
5. Download OpenPose Processor (200MB)

Models are cached in `~/.cache/huggingface` (Linux/Mac) or `%USERPROFILE%\.cache\huggingface` (Windows).

**First download is slow** (30-60 min). Subsequent runs use cached models.

### Step 5: Test Setup (10 minutes)

```bash
cd backend
python test_local_ml.py
```

This comprehensive test suite will:
- ✓ Check GPU and CUDA
- ✓ Load models
- ✓ Test pose extraction
- ✓ Run sample generation
- ✓ Measure inference time

Expected output:
```
======================================================================
 LOCAL ML SERVICE TEST SUITE
======================================================================
...
✓ ALL TESTS PASSED!
```

### Step 6: Configure Django (2 minutes)

Update `backend/.env`:

```bash
# Celery (use Redis)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Optional: Set model cache directory
# HUGGINGFACE_CACHE_DIR=/path/to/cache
```

### Step 7: Start Services

#### Terminal 1: Redis
```bash
redis-server
```

#### Terminal 2: Celery Worker
```bash
cd backend
celery -A getravio worker --loglevel=info --pool=solo
```

You should see:
```
[tasks]
  . api.local_tasks.process_image_generation_local
  . api.local_tasks.warm_up_model
  . api.local_tasks.unload_model

[INFO] Loading SDXL pipeline... (first worker start)
[INFO] ✓ SDXL pipeline loaded successfully!
[INFO] celery@hostname ready.
```

**Note**: First Celery start loads models into memory (2-5 minutes)

#### Terminal 3: Django
```bash
cd backend
python manage.py runserver
```

#### Terminal 4: Frontend (Optional)
```bash
cd frontend
npm run dev
```

### Step 8: Test End-to-End (5 minutes)

1. Open frontend: http://localhost:5173
2. Upload a test image
3. Submit generation request
4. Monitor Celery terminal for progress:
   ```
   [Task abc-123] Starting LOCAL generation for job 5
   [Task abc-123] Image loaded: (1024, 1024)
   [Task abc-123] GPU Memory before: 2.34GB / 3.50GB
   [Task abc-123] Generating rear and side views locally...
   [Task abc-123] ✓ Generation complete
   [Task abc-123] ✓ Job 5 completed successfully
   ```
5. View results in frontend (30-60 seconds typical)

## Performance Optimization

### 1. Reduce Inference Steps

Edit `backend/api/local_ml_service.py`:
```python
def generate_image(..., num_inference_steps=25):  # Down from 30
```

Trade-off: Slightly lower quality for 15-20% faster

### 2. Enable xformers

For 20-30% speedup:
```bash
pip install xformers==0.0.23
```

Requires CUDA 11.8+ and compatible GPU

### 3. Use FP16 (Already Enabled)

Pipeline uses `torch.float16` for 2x speed and 50% less VRAM

### 4. Batch Processing

Process multiple jobs together in Celery (advanced):
```python
# In local_tasks.py
@shared_task
def batch_process_jobs(job_ids):
    # Generate multiple images in one forward pass
    pass
```

### 5. Model Quantization

Use int8 quantization for 2x less VRAM (experimental):
```bash
pip install bitsandbytes
```

## Memory Management

### GPU Memory Usage

Typical VRAM usage:
- **Model Loading**: 6-8GB
- **During Inference**: 10-12GB peak
- **Idle**: 6-8GB (model cached)

### Monitor Memory

In Python/Django shell:
```python
from api.local_ml_service import LocalImageGenerationService
service = LocalImageGenerationService()
print(service.get_memory_usage())
```

In Celery:
```python
from api.local_tasks import get_gpu_status
result = get_gpu_status.delay()
print(result.get())
```

### Free Memory

If running low on VRAM:
```python
from api.local_tasks import unload_model
unload_model.delay()
```

Or restart Celery worker.

## Cost Comparison

### Local vs Replicate API

| Scenario | Local (RTX 4090) | Replicate API |
|----------|------------------|---------------|
| Hardware | $1,600 one-time | $0 |
| Per image pair | $0 | $0.02 |
| 100 images/month | $0 | $2 |
| 1,000 images/month | $0 | $20 |
| 10,000 images/month | $0 | $200 |
| Electricity (monthly) | ~$50 | $0 |

**Break-even**: ~8,000 images (4 months at 2,000/month)

### Local vs Cloud GPU

| Scenario | Local (RTX 4090) | RunPod (RTX 4090) |
|----------|------------------|-------------------|
| Hardware | $1,600 one-time | $0 |
| Per hour | $0 | $0.69 |
| 24/7 operation | $0 | $496/month |
| 8 hours/day | $0 | $165/month |
| Inference only (30s/job) | $0 | $0.006/job |

**Recommendation**:
- **< 100 jobs/month**: Use Replicate API
- **100-2,000 jobs/month**: Use cloud GPU (pay-as-you-go)
- **> 2,000 jobs/month**: Buy local GPU

## Troubleshooting

### Issue: CUDA Out of Memory

**Symptoms**:
```
RuntimeError: CUDA out of memory. Tried to allocate X GB
```

**Solutions**:
1. Close other GPU applications
2. Reduce inference steps (30 → 20)
3. Restart Celery worker to clear cache
4. Upgrade GPU (need 12GB+ VRAM)

### Issue: Slow Generation (>5 minutes)

**Causes**:
- CPU mode (no CUDA)
- Low-end GPU
- Not using FP16

**Check**:
```python
import torch
print(torch.cuda.is_available())  # Should be True
print(torch.version.cuda)  # Should match your CUDA version
```

**Fix**:
- Install CUDA-enabled PyTorch
- Use FP16 (already default)
- Enable xformers

### Issue: Model Download Fails

**Symptoms**:
```
HTTPError: 403 Forbidden
```

**Solutions**:
1. Check internet connection
2. Use HuggingFace token (for gated models):
   ```bash
   huggingface-cli login
   ```
3. Download manually:
   ```bash
   python download_models.py --cache-dir /path/to/cache
   ```

### Issue: Import Errors

**Symptoms**:
```
ModuleNotFoundError: No module named 'diffusers'
```

**Solutions**:
```bash
pip install -r requirements_ml.txt
```

Ensure you installed PyTorch FIRST, then other packages.

### Issue: Poor Quality Results

**Causes**:
- Too few inference steps
- Wrong prompts
- Low strength value

**Adjust** in `local_ml_service.py`:
- Increase steps: 30 → 40
- Adjust strength: 0.5 → 0.6
- Refine prompts in `build_prompt()`

## Production Deployment

### Systemd Service (Linux)

Create `/etc/systemd/system/celery-ml.service`:
```ini
[Unit]
Description=Celery ML Worker
After=network.target redis.service

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/var/www/getravio/backend
Environment="PATH=/var/www/getravio/venv/bin"
Environment="CUDA_VISIBLE_DEVICES=0"
ExecStart=/var/www/getravio/venv/bin/celery -A getravio worker \
  --loglevel=info \
  --logfile=/var/log/celery/worker.log \
  --pidfile=/var/run/celery/worker.pid \
  --detach

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable celery-ml
sudo systemctl start celery-ml
sudo systemctl status celery-ml
```

### Docker Deployment

See `docker-compose.yml` for NVIDIA Docker setup.

### Multiple GPUs

To use multiple GPUs:
```bash
# Start multiple workers, one per GPU
CUDA_VISIBLE_DEVICES=0 celery -A getravio worker -n worker1@%h &
CUDA_VISIBLE_DEVICES=1 celery -A getravio worker -n worker2@%h &
```

### Load Balancing

Celery automatically distributes tasks across workers.

For more control, use queues:
```python
# High priority queue (fast GPU)
process_image_generation_local.apply_async(
    args=[job.id],
    queue='high_priority'
)
```

## Monitoring

### Celery Dashboard

Install Flower:
```bash
pip install flower
celery -A getravio flower
```

Open http://localhost:5555

### GPU Monitoring

```bash
# Real-time monitoring
watch -n 1 nvidia-smi

# Log to file
nvidia-smi dmon -s pucvmet -o DT > gpu_log.txt
```

### Django Admin

Add GPU status view:
```python
# In admin.py
from api.local_tasks import get_gpu_status

def gpu_status_view(request):
    status = get_gpu_status.delay().get(timeout=5)
    return JsonResponse(status)
```

## Maintenance

### Update Models

```bash
# Clear cache
rm -rf ~/.cache/huggingface

# Re-download
python download_models.py
```

### Restart Worker

```bash
# Kill existing
pkill -f "celery worker"

# Start new
celery -A getravio worker --loglevel=info --pool=solo
```

### Clean Logs

```bash
# Celery logs
rm /var/log/celery/*.log

# Django logs
python manage.py flush_logs
```

## Next Steps

1. **Fine-tune prompts** in `local_ml_service.py`
2. **Optimize inference** (steps, strength)
3. **Monitor GPU usage** and adjust workers
4. **Set up monitoring** (Flower, Prometheus)
5. **Regular backups** of generated images

## Support & Resources

- **SDXL Paper**: https://arxiv.org/abs/2307.01952
- **Diffusers Docs**: https://huggingface.co/docs/diffusers
- **ControlNet**: https://github.com/lllyasviel/ControlNet
- **PyTorch**: https://pytorch.org/docs/

## Comparison: Local vs API

| Feature | Local | Replicate API |
|---------|-------|---------------|
| **Setup Time** | 2-4 hours | 30 minutes |
| **Upfront Cost** | $1,600+ | $0 |
| **Per-Image Cost** | $0 | $0.02 |
| **Latency** | 30-60s | 15-30s |
| **Customization** | Full | Limited |
| **Privacy** | 100% | API-dependent |
| **Maintenance** | You | Provider |
| **Scalability** | Hardware limit | Unlimited |
| **Best For** | High volume, Privacy | Low volume, Testing |

Choose local if:
- **Volume**: >2,000 images/month
- **Privacy**: Sensitive data
- **Customization**: Need custom models
- **Long-term**: 2+ year project

Choose API if:
- **Quick start**: Need to launch fast
- **Low volume**: <500 images/month
- **Testing**: MVP/prototype phase
- **No GPU**: Don't have hardware

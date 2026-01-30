"""
Script to download all required models for local inference
Run this once before starting the Celery worker
"""
import os
import sys
import argparse
from pathlib import Path

def check_dependencies():
    """Check if required packages are installed"""
    print("=" * 70)
    print("CHECKING DEPENDENCIES")
    print("=" * 70)

    missing = []
    packages_to_check = [
        ('torch', 'PyTorch'),
        ('diffusers', 'Diffusers'),
        ('transformers', 'Transformers'),
        ('controlnet_aux', 'ControlNet Aux'),
        ('PIL', 'Pillow'),
    ]

    for package, name in packages_to_check:
        try:
            __import__(package)
            print(f"✓ {name:25s} installed")
        except ImportError:
            print(f"✗ {name:25s} MISSING")
            missing.append(name)

    if missing:
        print(f"\n❌ Missing packages: {', '.join(missing)}")
        print("\nInstall with:")
        print("  pip install -r requirements_ml.txt")
        return False

    print("\n✓ All dependencies installed")
    return True


def check_gpu():
    """Check GPU availability"""
    print("\n" + "=" * 70)
    print("CHECKING GPU")
    print("=" * 70)

    try:
        import torch

        if torch.cuda.is_available():
            print(f"✓ CUDA Available: Yes")
            print(f"✓ CUDA Version: {torch.version.cuda}")
            print(f"✓ GPU Count: {torch.cuda.device_count()}")

            for i in range(torch.cuda.device_count()):
                props = torch.cuda.get_device_properties(i)
                vram_gb = props.total_memory / (1024**3)
                print(f"\n  GPU {i}: {props.name}")
                print(f"    VRAM: {vram_gb:.1f} GB")
                print(f"    Compute Capability: {props.major}.{props.minor}")

                if vram_gb < 12:
                    print(f"    ⚠️  WARNING: Low VRAM. Recommended: 12GB+ for SDXL")
                    print(f"    Generation may fail or be very slow")
                else:
                    print(f"    ✓ Sufficient VRAM for SDXL")

            return True
        else:
            print("❌ CUDA NOT Available")
            print("\nGPU with 12GB+ VRAM is required for local inference.")
            print("\nOptions:")
            print("  1. Install CUDA-compatible PyTorch:")
            print("     pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121")
            print("  2. Use cloud GPU (AWS, GCP, RunPod)")
            print("  3. Use Replicate API instead (no GPU needed)")
            return False

    except Exception as e:
        print(f"❌ Error checking GPU: {e}")
        return False


def download_models(cache_dir=None):
    """Download all required models"""
    print("\n" + "=" * 70)
    print("DOWNLOADING MODELS")
    print("=" * 70)

    if cache_dir is None:
        cache_dir = os.path.expanduser("~/.cache/huggingface")

    print(f"\nCache directory: {cache_dir}")
    print("\nThis will download approximately 13GB of models:")
    print("  • SDXL Base (6.9GB)")
    print("  • ControlNet OpenPose SDXL (2.5GB)")
    print("  • VAE (335MB)")
    print("  • OpenPose Processor (200MB)")
    print("\nFirst download may take 30-60 minutes depending on your connection.")
    print()

    try:
        from diffusers import (
            StableDiffusionXLControlNetImg2ImgPipeline,
            ControlNetModel,
            AutoencoderKL
        )
        from controlnet_aux import OpenposeDetector
        import torch

        # Determine device
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32

        # Download ControlNet
        print("[1/4] Downloading ControlNet OpenPose for SDXL...")
        controlnet = ControlNetModel.from_pretrained(
            "thibaud/controlnet-openpose-sdxl-1.0",
            torch_dtype=dtype,
            cache_dir=cache_dir,
        )
        print("      ✓ ControlNet downloaded")

        # Download VAE
        print("\n[2/4] Downloading VAE...")
        vae = AutoencoderKL.from_pretrained(
            "madebyollin/sdxl-vae-fp16-fix",
            torch_dtype=dtype,
            cache_dir=cache_dir,
        )
        print("      ✓ VAE downloaded")

        # Download SDXL Base
        print("\n[3/4] Downloading SDXL Base (this is the largest, ~7GB)...")
        pipeline = StableDiffusionXLControlNetImg2ImgPipeline.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            controlnet=controlnet,
            vae=vae,
            torch_dtype=dtype,
            cache_dir=cache_dir,
        )
        print("      ✓ SDXL Base downloaded")

        # Download OpenPose processor
        print("\n[4/4] Downloading OpenPose processor...")
        pose_processor = OpenposeDetector.from_pretrained('lllyasviel/ControlNet')
        print("      ✓ OpenPose processor downloaded")

        print("\n" + "=" * 70)
        print("✓ ALL MODELS DOWNLOADED SUCCESSFULLY!")
        print("=" * 70)

        # Get total cache size
        try:
            cache_path = Path(cache_dir)
            total_size = sum(f.stat().st_size for f in cache_path.rglob('*') if f.is_file())
            total_size_gb = total_size / (1024**3)
            print(f"\nTotal cache size: {total_size_gb:.2f} GB")
        except:
            pass

        return True

    except Exception as e:
        print(f"\n❌ Download failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_generation():
    """Test generation with a simple example"""
    print("\n" + "=" * 70)
    print("TESTING GENERATION")
    print("=" * 70)

    try:
        from api.local_ml_service import LocalImageGenerationService
        from PIL import Image
        import numpy as np

        print("\nInitializing service...")
        service = LocalImageGenerationService()

        print("Loading pipeline (first run takes 2-5 minutes)...")
        service._load_pipeline()

        print("✓ Pipeline loaded!")

        # Create a simple test image
        print("\nGenerating test image...")
        test_image = Image.new('RGB', (512, 512), color='white')

        result = service.generate_image(
            image=test_image,
            region="gluteal",
            scenario="projection-level-2",
            view="rear",
            num_inference_steps=10,  # Quick test
        )

        print("✓ Generation successful!")
        print(f"  Result size: {result.size}")

        # Save test output
        output_path = "test_generation_output.jpg"
        result.save(output_path)
        print(f"  Saved to: {output_path}")

        # Show memory usage
        memory = service.get_memory_usage()
        if memory:
            print(f"\nGPU Memory Usage:")
            print(f"  Allocated: {memory['allocated_gb']:.2f} GB")
            print(f"  Reserved: {memory['reserved_gb']:.2f} GB")

        return True

    except Exception as e:
        print(f"\n❌ Generation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description='Download models for local inference')
    parser.add_argument('--cache-dir', type=str, default=None,
                       help='Cache directory for models (default: ~/.cache/huggingface)')
    parser.add_argument('--skip-test', action='store_true',
                       help='Skip generation test')
    parser.add_argument('--test-only', action='store_true',
                       help='Only run generation test (skip download)')

    args = parser.parse_args()

    print("\n" + "=" * 70)
    print(" LOCAL ML MODEL SETUP")
    print("=" * 70)

    # Check dependencies
    if not check_dependencies():
        print("\n❌ Please install missing dependencies first")
        sys.exit(1)

    # Check GPU
    if not check_gpu():
        print("\n❌ GPU required for local inference")
        sys.exit(1)

    if args.test_only:
        # Only run test
        if test_generation():
            print("\n✓ Test passed!")
        else:
            print("\n❌ Test failed")
            sys.exit(1)
    else:
        # Download models
        if not download_models(args.cache_dir):
            print("\n❌ Model download failed")
            sys.exit(1)

        # Test generation unless skipped
        if not args.skip_test:
            print("\n" + "=" * 70)
            response = input("\nRun generation test? (y/n): ").strip().lower()
            if response == 'y':
                if test_generation():
                    print("\n" + "=" * 70)
                    print("✓ ALL TESTS PASSED!")
                    print("=" * 70)
                else:
                    print("\n❌ Generation test failed")
                    sys.exit(1)

    print("\n" + "=" * 70)
    print("NEXT STEPS")
    print("=" * 70)
    print("\n1. Update views.py to use local_tasks.process_image_generation_local")
    print("2. Start Celery worker: celery -A getravio worker --loglevel=info")
    print("3. Start Django: python manage.py runserver")
    print("4. Upload image via frontend")
    print("\nModels are cached in:", args.cache_dir or "~/.cache/huggingface")
    print("=" * 70)


if __name__ == "__main__":
    # Add Django to path if running from backend directory
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    main()

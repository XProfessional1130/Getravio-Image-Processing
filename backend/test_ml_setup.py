"""
Quick test script to verify ML setup and GPU availability
Run this before implementing full pipeline
"""

import sys

def check_dependencies():
    """Check if all required packages are installed"""
    print("=" * 60)
    print("CHECKING DEPENDENCIES")
    print("=" * 60)

    required_packages = [
        ('torch', 'PyTorch'),
        ('diffusers', 'Diffusers'),
        ('transformers', 'Transformers'),
        ('PIL', 'Pillow'),
        ('cv2', 'OpenCV'),
        ('numpy', 'NumPy'),
    ]

    missing = []
    for package, name in required_packages:
        try:
            __import__(package)
            print(f"✓ {name:20s} - Installed")
        except ImportError:
            print(f"✗ {name:20s} - MISSING")
            missing.append(name)

    if missing:
        print(f"\n❌ Missing packages: {', '.join(missing)}")
        print("\nInstall with: pip install -r requirements_ml.txt")
        return False
    else:
        print("\n✓ All dependencies installed!")
        return True


def check_gpu():
    """Check GPU availability and specs"""
    print("\n" + "=" * 60)
    print("CHECKING GPU")
    print("=" * 60)

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

                if vram_gb < 10:
                    print(f"    ⚠️  WARNING: Low VRAM. Recommended: 12GB+")
                elif vram_gb >= 12:
                    print(f"    ✓ Sufficient VRAM for SDXL")

            return True
        else:
            print("❌ CUDA NOT Available")
            print("\nGPU is required for model inference.")
            print("\nOptions:")
            print("  1. Install CUDA-compatible PyTorch")
            print("  2. Use cloud GPU (RunPod, Lambda Labs)")
            print("  3. Use API service (Replicate, Stability AI)")
            return False

    except Exception as e:
        print(f"❌ Error checking GPU: {e}")
        return False


def test_simple_generation():
    """Test basic diffusion pipeline"""
    print("\n" + "=" * 60)
    print("TESTING BASIC GENERATION (This will download ~13GB)")
    print("=" * 60)

    try:
        import torch
        from diffusers import DiffusionPipeline
        from PIL import Image
        import time

        print("\n📥 Loading model (first run will download ~13GB)...")
        print("This may take 10-30 minutes depending on your connection...")

        # Use small model for testing
        model_id = "stabilityai/sdxl-turbo"  # Faster SDXL variant for testing

        pipe = DiffusionPipeline.from_pretrained(
            model_id,
            torch_dtype=torch.float16,
            variant="fp16",
        )
        pipe.to("cuda")

        print("✓ Model loaded!")

        # Test generation
        print("\n🎨 Generating test image...")
        start = time.time()

        result = pipe(
            prompt="professional medical photography, anatomically accurate human body, neutral pose",
            num_inference_steps=4,  # Turbo model only needs 4 steps
            guidance_scale=0.0,  # Turbo doesn't use guidance
        ).images[0]

        elapsed = time.time() - start

        # Save result
        output_path = "test_output.jpg"
        result.save(output_path)

        print(f"✓ Generation successful!")
        print(f"  Time: {elapsed:.1f} seconds")
        print(f"  Saved to: {output_path}")
        print(f"  Size: {result.size}")

        return True

    except Exception as e:
        print(f"❌ Generation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all checks"""
    print("\n" + "=" * 60)
    print("ML SETUP VERIFICATION")
    print("=" * 60)

    deps_ok = check_dependencies()
    if not deps_ok:
        sys.exit(1)

    gpu_ok = check_gpu()
    if not gpu_ok:
        print("\n⚠️  No GPU detected. Cannot proceed with ML setup.")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("READY FOR ML IMPLEMENTATION!")
    print("=" * 60)

    # Ask if user wants to test generation
    print("\nWould you like to test basic image generation?")
    print("This will:")
    print("  • Download SDXL-Turbo model (~7GB)")
    print("  • Generate a test image")
    print("  • Verify your GPU works with diffusers")
    print()

    response = input("Run generation test? (y/n): ").strip().lower()
    if response == 'y':
        test_simple_generation()
    else:
        print("\nSkipping generation test.")
        print("Run this script again with 'y' when ready to test.")

    print("\n" + "=" * 60)
    print("NEXT STEPS")
    print("=" * 60)
    print("1. Review MODEL_IMPLEMENTATION_PLAN.md")
    print("2. Choose deployment option (self-hosted/cloud/API)")
    print("3. Implement ml_pipeline.py with GlutealEnhancementPipeline")
    print("4. Integrate with Django via Celery tasks")
    print("=" * 60)


if __name__ == "__main__":
    main()

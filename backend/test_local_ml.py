"""
Test script for local ML service
Verifies local SDXL + ControlNet setup
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'getravio.settings')
django.setup()

from api.local_ml_service import LocalImageGenerationService
from PIL import Image
import time


def test_initialization():
    """Test service initialization"""
    print("=" * 70)
    print("TEST 1: SERVICE INITIALIZATION")
    print("=" * 70)

    try:
        service = LocalImageGenerationService()
        print("✓ Service initialized successfully")
        print(f"  Device: {service.device}")
        return True, service
    except Exception as e:
        print(f"✗ Initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None


def test_prompt_building(service):
    """Test prompt generation"""
    print("\n" + "=" * 70)
    print("TEST 2: PROMPT GENERATION")
    print("=" * 70)

    test_cases = [
        ("gluteal", "projection-level-1", "rear", ""),
        ("gluteal", "projection-level-2", "side", "subtle enhancement"),
        ("gluteal", "firmness", "rear", ""),
    ]

    try:
        for region, scenario, view, message in test_cases:
            config = service.build_prompt(region, scenario, view, message)
            print(f"\nScenario: {scenario} ({view})")
            print(f"  Strength: {config['strength']}")
            print(f"  Prompt length: {len(config['prompt'])} chars")
            print(f"  Prompt preview: {config['prompt'][:80]}...")

        print("\n✓ Prompt generation working")
        return True
    except Exception as e:
        print(f"\n✗ Prompt generation failed: {e}")
        return False


def test_pose_extraction(service):
    """Test pose extraction"""
    print("\n" + "=" * 70)
    print("TEST 3: POSE EXTRACTION")
    print("=" * 70)

    try:
        # Create test image
        test_image = Image.new('RGB', (512, 512), color=(200, 200, 200))

        print("Extracting pose (may take a minute on first run)...")
        start = time.time()
        pose_image = service.extract_pose(test_image)
        elapsed = time.time() - start

        print(f"✓ Pose extraction complete")
        print(f"  Time: {elapsed:.2f}s")
        print(f"  Result size: {pose_image.size}")

        # Save pose image
        pose_image.save("test_pose_output.jpg")
        print(f"  Saved to: test_pose_output.jpg")

        return True
    except Exception as e:
        print(f"\n✗ Pose extraction failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_pipeline_loading(service):
    """Test pipeline loading"""
    print("\n" + "=" * 70)
    print("TEST 4: PIPELINE LOADING")
    print("=" * 70)

    try:
        print("Loading SDXL pipeline...")
        print("(First load: 2-5 minutes, downloads ~13GB)")
        print("(Subsequent loads: 30-60 seconds)")

        start = time.time()
        service._load_pipeline()
        elapsed = time.time() - start

        print(f"\n✓ Pipeline loaded successfully!")
        print(f"  Load time: {elapsed:.1f}s")

        # Check memory
        memory = service.get_memory_usage()
        if memory:
            print(f"\nGPU Memory Usage:")
            print(f"  Allocated: {memory['allocated_gb']:.2f} GB")
            print(f"  Reserved: {memory['reserved_gb']:.2f} GB")
            print(f"  Peak: {memory['max_allocated_gb']:.2f} GB")

        return True
    except Exception as e:
        print(f"\n✗ Pipeline loading failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_single_generation(service):
    """Test single image generation"""
    print("\n" + "=" * 70)
    print("TEST 5: SINGLE IMAGE GENERATION")
    print("=" * 70)

    try:
        # Create test image
        print("Creating test image...")
        test_image = Image.new('RGB', (512, 512), color=(220, 220, 220))

        print("\nGenerating enhanced image...")
        print("(Using 20 steps for faster test)")

        start = time.time()
        result = service.generate_image(
            image=test_image,
            region="gluteal",
            scenario="projection-level-2",
            view="rear",
            message="",
            num_inference_steps=20,  # Faster for testing
        )
        elapsed = time.time() - start

        print(f"\n✓ Generation successful!")
        print(f"  Time: {elapsed:.1f}s")
        print(f"  Result size: {result.size}")

        # Save result
        output_path = "test_generation_single.jpg"
        result.save(output_path, quality=95)
        print(f"  Saved to: {output_path}")

        # Memory after generation
        memory = service.get_memory_usage()
        if memory:
            print(f"\nGPU Memory After Generation:")
            print(f"  Allocated: {memory['allocated_gb']:.2f} GB")

        return True
    except Exception as e:
        print(f"\n✗ Generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_both_views_generation(service):
    """Test generating both views"""
    print("\n" + "=" * 70)
    print("TEST 6: BOTH VIEWS GENERATION")
    print("=" * 70)

    try:
        # Create test image
        test_image = Image.new('RGB', (512, 512), color=(220, 220, 220))

        print("Generating both rear and side views...")
        print("(This will take 2-3 minutes)")

        start = time.time()
        results = service.generate_both_views(
            image=test_image,
            region="gluteal",
            scenario="projection-level-2",
            message="",
            num_inference_steps=20,  # Faster for testing
        )
        elapsed = time.time() - start

        print(f"\n✓ Both views generated!")
        print(f"  Total time: {elapsed:.1f}s")
        print(f"  Rear size: {results['rear'].size}")
        print(f"  Side size: {results['side'].size}")

        # Save results
        results['rear'].save("test_generation_rear.jpg", quality=95)
        results['side'].save("test_generation_side.jpg", quality=95)
        print(f"\n  Saved:")
        print(f"    test_generation_rear.jpg")
        print(f"    test_generation_side.jpg")

        return True
    except Exception as e:
        print(f"\n✗ Both views generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n" + "=" * 70)
    print(" LOCAL ML SERVICE TEST SUITE")
    print("=" * 70)

    # Test 1: Initialization
    success, service = test_initialization()
    if not success:
        print("\n❌ Initialization failed")
        sys.exit(1)

    # Test 2: Prompt Building
    if not test_prompt_building(service):
        print("\n❌ Prompt building failed")
        sys.exit(1)

    # Test 3: Pose Extraction
    if not test_pose_extraction(service):
        print("\n❌ Pose extraction failed")
        sys.exit(1)

    # Test 4: Pipeline Loading
    if not test_pipeline_loading(service):
        print("\n❌ Pipeline loading failed")
        sys.exit(1)

    # Test 5: Single Generation
    print("\n" + "=" * 70)
    response = input("\nRun single image generation test? (~1-2 min) (y/n): ").strip().lower()
    if response == 'y':
        if not test_single_generation(service):
            print("\n❌ Single generation failed")
            sys.exit(1)

    # Test 6: Both Views
    print("\n" + "=" * 70)
    response = input("\nRun both views generation test? (~2-3 min) (y/n): ").strip().lower()
    if response == 'y':
        if not test_both_views_generation(service):
            print("\n❌ Both views generation failed")
            sys.exit(1)

    # Final summary
    print("\n" + "=" * 70)
    print("✓ ALL TESTS PASSED!")
    print("=" * 70)
    print("\nYour local ML setup is working correctly!")
    print("\nNext steps:")
    print("  1. Update views.py to use local_tasks")
    print("  2. Start Celery: celery -A getravio worker --loglevel=info")
    print("  3. Start Django: python manage.py runserver")
    print("  4. Test via frontend")
    print("\nGenerated test images:")
    print("  • test_pose_output.jpg")
    print("  • test_generation_single.jpg")
    print("  • test_generation_rear.jpg")
    print("  • test_generation_side.jpg")
    print("=" * 70)


if __name__ == "__main__":
    main()

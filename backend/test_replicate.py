"""
Test script for Replicate API integration
Run this to verify your setup before deploying
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'getravio.settings')
django.setup()

from api.ml_service import ImageGenerationService
from django.conf import settings


def test_environment():
    """Test if environment variables are configured"""
    print("=" * 70)
    print("TESTING ENVIRONMENT CONFIGURATION")
    print("=" * 70)

    issues = []

    # Check REPLICATE_API_TOKEN
    token = getattr(settings, 'REPLICATE_API_TOKEN', None)
    if token and len(token) > 0:
        print(f"✓ REPLICATE_API_TOKEN configured: {token[:8]}...")
    else:
        print("✗ REPLICATE_API_TOKEN not configured")
        issues.append("REPLICATE_API_TOKEN")

    # Check Celery settings
    broker_url = getattr(settings, 'CELERY_BROKER_URL', None)
    if broker_url:
        print(f"✓ CELERY_BROKER_URL configured: {broker_url}")
    else:
        print("✗ CELERY_BROKER_URL not configured")
        issues.append("CELERY_BROKER_URL")

    # Check S3 settings
    use_s3 = getattr(settings, 'USE_S3', False)
    if use_s3:
        bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
        print(f"✓ AWS S3 enabled: bucket={bucket}")
    else:
        print("⚠ AWS S3 not enabled (using local storage)")

    print()

    if issues:
        print("❌ Missing configuration:")
        for issue in issues:
            print(f"   - {issue}")
        print("\nUpdate your .env file with the missing values")
        print("See .env.example for reference")
        return False
    else:
        print("✓ All environment variables configured!")
        return True


def test_connection():
    """Test Replicate API connection"""
    print("\n" + "=" * 70)
    print("TESTING REPLICATE API CONNECTION")
    print("=" * 70)

    try:
        service = ImageGenerationService()
        print("✓ ImageGenerationService initialized successfully")

        if service.test_connection():
            print("✓ Replicate API connection successful")
            return True
        else:
            print("✗ Replicate API connection failed")
            return False

    except ValueError as e:
        print(f"✗ Configuration error: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_prompt_building():
    """Test prompt building for different scenarios"""
    print("\n" + "=" * 70)
    print("TESTING PROMPT GENERATION")
    print("=" * 70)

    try:
        service = ImageGenerationService()

        test_scenarios = [
            ("gluteal", "projection-level-1", "rear", ""),
            ("gluteal", "projection-level-2", "side", ""),
            ("gluteal", "firmness", "rear", "subtle enhancement"),
        ]

        for region, scenario, view, message in test_scenarios:
            prompt_config = service.build_prompt(region, scenario, view, message)

            print(f"\nScenario: {scenario} ({view} view)")
            print(f"  Strength: {prompt_config['strength']}")
            print(f"  Prompt: {prompt_config['prompt'][:100]}...")
            print(f"  Negative: {prompt_config['negative_prompt'][:100]}...")

        print("\n✓ Prompt generation working correctly")
        return True

    except Exception as e:
        print(f"✗ Prompt generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_generation_sample():
    """Test actual image generation (costs ~$0.02)"""
    print("\n" + "=" * 70)
    print("TESTING IMAGE GENERATION (COSTS ~$0.02)")
    print("=" * 70)

    # Use a publicly accessible test image
    test_image_url = "https://replicate.delivery/pbxt/JvGmGfLg4BytwlFb4K3VGK5EHFmGCGPAqIQF0CXZJlDOlGmRA/out-0.png"

    print(f"\nUsing test image: {test_image_url[:60]}...")
    print("This will take 15-30 seconds and cost approximately $0.02")

    try:
        service = ImageGenerationService()

        print("\n[1/2] Generating rear view...")
        rear_url = service.generate_image(
            image_url=test_image_url,
            region="gluteal",
            scenario="projection-level-2",
            view="rear",
            message="",
        )
        print(f"✓ Rear view generated successfully")
        print(f"    URL: {rear_url}")

        print("\n[2/2] Generating side view...")
        side_url = service.generate_image(
            image_url=test_image_url,
            region="gluteal",
            scenario="projection-level-2",
            view="side",
            message="",
        )
        print(f"✓ Side view generated successfully")
        print(f"    URL: {side_url}")

        print("\n" + "=" * 70)
        print("✓ GENERATION TEST SUCCESSFUL!")
        print("=" * 70)
        print("\nGenerated Images:")
        print(f"  Rear: {rear_url}")
        print(f"  Side: {side_url}")
        print("\nOpen these URLs in your browser to view the results.")

        return True

    except Exception as e:
        print(f"\n✗ Generation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_both_views():
    """Test generating both views at once"""
    print("\n" + "=" * 70)
    print("TESTING BOTH VIEWS GENERATION (COSTS ~$0.04)")
    print("=" * 70)

    test_image_url = "https://replicate.delivery/pbxt/JvGmGfLg4BytwlFb4K3VGK5EHFmGCGPAqIQF0CXZJlDOlGmRA/out-0.png"

    print(f"\nUsing test image: {test_image_url[:60]}...")
    print("This will take 30-60 seconds and cost approximately $0.04")

    try:
        service = ImageGenerationService()

        print("\nGenerating both rear and side views...")
        results = service.generate_both_views(
            image_url=test_image_url,
            region="gluteal",
            scenario="projection-level-2",
            message="",
        )

        print("\n✓ Both views generated successfully!")
        print(f"  Rear: {results['rear']}")
        print(f"  Side: {results['side']}")

        return True

    except Exception as e:
        print(f"\n✗ Both views generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print(" REPLICATE API INTEGRATION TEST SUITE")
    print("=" * 70)

    # Test 1: Environment
    if not test_environment():
        print("\n❌ Environment test failed. Fix configuration and try again.")
        sys.exit(1)

    # Test 2: Connection
    if not test_connection():
        print("\n❌ Connection test failed. Check your API token.")
        sys.exit(1)

    # Test 3: Prompt Building
    if not test_prompt_building():
        print("\n❌ Prompt building test failed.")
        sys.exit(1)

    # Test 4: Ask about generation test
    print("\n" + "=" * 70)
    print("OPTIONAL: IMAGE GENERATION TEST")
    print("=" * 70)
    print("\nWould you like to test actual image generation?")
    print("This will:")
    print("  • Cost approximately $0.04 (two images)")
    print("  • Take 30-60 seconds")
    print("  • Verify end-to-end functionality")
    print()

    response = input("Run generation test? (y/n): ").strip().lower()

    if response == 'y':
        if test_both_views():
            print("\n" + "=" * 70)
            print("✓ ALL TESTS PASSED!")
            print("=" * 70)
            print("\nYour Replicate API integration is working correctly!")
            print("\nNext steps:")
            print("  1. Start Celery worker: celery -A getravio worker --loglevel=info")
            print("  2. Start Django server: python manage.py runserver")
            print("  3. Upload an image via the frontend")
            print("  4. Monitor Celery logs for processing")
            print("  5. Check Replicate dashboard: https://replicate.com/account")
        else:
            print("\n❌ Generation test failed")
            sys.exit(1)
    else:
        print("\nSkipping generation test.")
        print("\n" + "=" * 70)
        print("✓ BASIC TESTS PASSED!")
        print("=" * 70)
        print("\nYour configuration looks good!")
        print("Run this script again with 'y' to test generation.")

    print("\n" + "=" * 70)


if __name__ == "__main__":
    main()

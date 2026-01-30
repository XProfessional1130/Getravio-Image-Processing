"""
Quick script to check GPU availability and compatibility
"""
import sys
import subprocess

def check_nvidia_driver():
    """Check if NVIDIA driver is installed"""
    print("=" * 70)
    print("CHECKING NVIDIA DRIVER")
    print("=" * 70)

    try:
        result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ NVIDIA Driver installed\n")
            print(result.stdout)
            return True
        else:
            print("✗ NVIDIA Driver not found or not working")
            return False
    except FileNotFoundError:
        print("✗ nvidia-smi command not found")
        print("\nThis means either:")
        print("  1. No NVIDIA GPU installed")
        print("  2. NVIDIA drivers not installed")
        print("  3. Drivers not in system PATH")
        return False

def check_pytorch_cuda():
    """Check if PyTorch can see CUDA"""
    print("\n" + "=" * 70)
    print("CHECKING PYTORCH CUDA SUPPORT")
    print("=" * 70)

    try:
        import torch
        print(f"✓ PyTorch installed: {torch.__version__}")

        if torch.cuda.is_available():
            print(f"✓ CUDA available: Yes")
            print(f"✓ CUDA version: {torch.version.cuda}")
            print(f"✓ GPU count: {torch.cuda.device_count()}")

            for i in range(torch.cuda.device_count()):
                props = torch.cuda.get_device_properties(i)
                vram_gb = props.total_memory / (1024**3)
                print(f"\n  GPU {i}: {props.name}")
                print(f"    VRAM: {vram_gb:.1f} GB")
                print(f"    Compute: {props.major}.{props.minor}")

                if vram_gb < 12:
                    print(f"    ⚠️  Low VRAM (need 12GB+ for SDXL)")
                else:
                    print(f"    ✓ Sufficient VRAM")
            return True
        else:
            print("✗ CUDA not available in PyTorch")
            print(f"\nPyTorch version: {torch.__version__}")
            print("This version may not have CUDA support")
            return False

    except ImportError:
        print("✗ PyTorch not installed")
        return False

def get_recommendations():
    """Provide installation recommendations"""
    print("\n" + "=" * 70)
    print("RECOMMENDATIONS")
    print("=" * 70)

    has_driver = check_nvidia_driver()
    has_cuda_pytorch = check_pytorch_cuda()

    print("\n" + "=" * 70)
    print("NEXT STEPS")
    print("=" * 70)

    if not has_driver:
        print("\n1. Check if you have an NVIDIA GPU:")
        print("   - Open Device Manager (devmgmt.msc)")
        print("   - Look under 'Display adapters'")
        print("   - Should see 'NVIDIA' in the name")
        print("\n2. If you have NVIDIA GPU, install drivers:")
        print("   - Download from: https://www.nvidia.com/Download/index.aspx")
        print("   - Or use GeForce Experience")
        print("\n3. If no NVIDIA GPU:")
        print("   - Use Replicate API (no GPU needed)")
        print("   - Checkout branch: model-replicate-api")

    elif not has_cuda_pytorch:
        print("\n1. Install PyTorch with CUDA support:")
        print("\n   For CUDA 12.1 (Recommended):")
        print("   pip uninstall torch torchvision -y")
        print("   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121")
        print("\n   For CUDA 11.8:")
        print("   pip uninstall torch torchvision -y")
        print("   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118")
        print("\n2. Verify installation:")
        print("   python check_gpu.py")

    else:
        print("\n✓ GPU setup looks good!")
        print("\nReady to proceed:")
        print("1. Install ML dependencies: pip install -r requirements_ml.txt")
        print("2. Download models: python download_models.py")
        print("3. Run tests: python test_local_ml.py")

if __name__ == "__main__":
    get_recommendations()

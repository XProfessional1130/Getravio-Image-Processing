"""
ML service using Diffusers library for gluteal enhancement simulation
Supports two models:
- Development: stable-diffusion-1-5 (lighter, faster, CPU-friendly)
- Production: stabilityai/stable-diffusion-xl-base-1.0 (higher quality, GPU required)
"""
import torch
from PIL import Image
import numpy as np
import logging
from pathlib import Path
import os
import json

logger = logging.getLogger(__name__)

# Model selection via environment variable
ML_MODEL = os.getenv('ML_MODEL', 'sdxl')  # 'sd21' for dev, 'sdxl' for prod

# Load prompts from JSON file
PROMPTS_FILE = Path(__file__).parent / 'prompts.json'


def load_prompts():
    """Load prompts configuration from JSON file"""
    try:
        with open(PROMPTS_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load prompts.json: {e}")
        # Return minimal defaults
        return {
            "dev": {"prompt_template": "photo, realistic", "negative_prompt": "bad", "inference_steps": 15},
            "prod": {"prompt_template": "photo, realistic", "negative_prompt": "bad", "inference_steps": 30},
            "scenarios": {},
            "views": {"rear": "back", "side": "side"},
            "default_strength": 0.50
        }


PROMPTS = load_prompts()


class ImageGenerationService:
    """
    Image generation service with model selection
    - sd21: Stable Diffusion 2.1 (development, ~5GB VRAM or CPU)
    - sdxl: SDXL + ControlNet (production, requires 12GB+ VRAM)
    """

    def __init__(self, device="cuda", model_cache_dir=None):
        """
        Initialize the ML pipeline

        Args:
            device: Device to run on ("cuda" or "cpu")
            model_cache_dir: Directory to cache models (default: ~/.cache/huggingface)
        """
        self.device = device
        self.model_cache_dir = model_cache_dir or os.path.expanduser("~/.cache/huggingface")
        self.model_type = ML_MODEL

        # Check if CUDA is available
        if device == "cuda" and not torch.cuda.is_available():
            logger.warning("CUDA not available, falling back to CPU")
            self.device = "cpu"

        # For SD 2.1 on CPU, it's more feasible
        if self.model_type == 'sd21' and self.device == "cpu":
            logger.info("Using SD 2.1 on CPU (development mode)")

        self.pipe = None
        self.pose_processor = None

        logger.info(f"ImageGenerationService initialized (model={self.model_type}, device={self.device})")

    def _load_pipeline_sd21(self):
        """Load Stable Diffusion 1.5 pipeline (development/lighter)"""
        from diffusers import StableDiffusionImg2ImgPipeline

        logger.info("Loading Stable Diffusion 1.5 pipeline...")

        dtype = torch.float16 if self.device == "cuda" else torch.float32

        # Using SD 1.5 as it's openly available without gating
        self.pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            torch_dtype=dtype,
            cache_dir=self.model_cache_dir,
            safety_checker=None,
            requires_safety_checker=False,
        )

        self.pipe = self.pipe.to(self.device)

        # Memory optimizations
        if self.device == "cuda":
            self.pipe.enable_attention_slicing()
            try:
                self.pipe.enable_xformers_memory_efficient_attention()
                logger.info("✓ xformers enabled")
            except Exception:
                logger.info("xformers not available")
        else:
            # CPU optimizations
            self.pipe.enable_attention_slicing(1)

        logger.info("✓ SD 1.5 pipeline loaded successfully!")

    def _load_pipeline_sdxl(self):
        """Load SDXL pipeline with ControlNet (production)"""
        from diffusers import (
            StableDiffusionXLControlNetImg2ImgPipeline,
            ControlNetModel,
            AutoencoderKL
        )

        logger.info("Loading SDXL pipeline... (this may take 2-5 minutes on first run)")

        try:
            dtype = torch.float16 if self.device == "cuda" else torch.float32

            # Load ControlNet for pose preservation
            logger.info("Loading ControlNet model...")
            controlnet = ControlNetModel.from_pretrained(
                "thibaud/controlnet-openpose-sdxl-1.0",
                torch_dtype=dtype,
                cache_dir=self.model_cache_dir,
            )

            # Load VAE for better image quality
            logger.info("Loading VAE...")
            vae = AutoencoderKL.from_pretrained(
                "madebyollin/sdxl-vae-fp16-fix",
                torch_dtype=dtype,
                cache_dir=self.model_cache_dir,
            )

            # Load main SDXL pipeline
            logger.info("Loading SDXL base model...")
            self.pipe = StableDiffusionXLControlNetImg2ImgPipeline.from_pretrained(
                "stabilityai/stable-diffusion-xl-base-1.0",
                controlnet=controlnet,
                vae=vae,
                torch_dtype=dtype,
                cache_dir=self.model_cache_dir,
            )

            # Move to device
            self.pipe = self.pipe.to(self.device)

            # Enable memory optimizations
            if self.device == "cuda":
                logger.info("Enabling GPU memory optimizations...")
                self.pipe.enable_model_cpu_offload()
                self.pipe.enable_vae_tiling()

                try:
                    self.pipe.enable_xformers_memory_efficient_attention()
                    logger.info("✓ xformers enabled for faster inference")
                except Exception:
                    logger.info("xformers not available, using default attention")

            logger.info("✓ SDXL pipeline loaded successfully!")

        except Exception as e:
            logger.error(f"Failed to load SDXL pipeline: {e}", exc_info=True)
            raise RuntimeError(f"Could not load SDXL pipeline: {e}")

    def _load_pipeline(self):
        """Lazy load the appropriate pipeline based on model type"""
        if self.pipe is not None:
            return

        if self.model_type == 'sd21':
            self._load_pipeline_sd21()
        else:
            self._load_pipeline_sdxl()

    def _load_pose_processor(self):
        """Load OpenPose processor for ControlNet (SDXL only)"""
        if self.model_type == 'sd21':
            # SD 2.1 doesn't use ControlNet
            self.pose_processor = False
            return

        if self.pose_processor is not None:
            return

        try:
            from controlnet_aux import OpenposeDetector
            self.pose_processor = OpenposeDetector.from_pretrained('lllyasviel/ControlNet')
            logger.info("✓ Pose processor loaded")
        except Exception as e:
            logger.warning(f"Failed to load pose processor: {e}")
            self.pose_processor = False

    def build_prompt(self, region: str, scenario: str, view: str, message: str = "") -> dict:
        """Build prompt configuration from prompts.json"""
        # Get scenario config
        scenario_config = PROMPTS.get("scenarios", {}).get(scenario, {})
        strength = scenario_config.get("strength", PROMPTS.get("default_strength", 0.50))
        scenario_desc = scenario_config.get("description", "enhancement")

        # Get view description
        view_desc = PROMPTS.get("views", {}).get(view, view)

        # Select dev or prod prompts
        mode = "dev" if self.model_type == 'sd21' else "prod"
        mode_config = PROMPTS.get(mode, {})

        # Build prompt from template
        prompt_template = mode_config.get("prompt_template", "photo, realistic")
        prompt = prompt_template.format(
            view=view_desc,
            scenario_desc=scenario_desc,
            region=region
        )

        negative_prompt = mode_config.get("negative_prompt", "bad quality")

        return {
            "prompt": " ".join(prompt.split()),
            "negative_prompt": " ".join(negative_prompt.split()),
            "strength": strength,
        }

    def extract_pose(self, image: Image.Image) -> Image.Image:
        """Extract pose from image for ControlNet conditioning (SDXL only)"""
        self._load_pose_processor()

        if self.pose_processor is False:
            return Image.new('RGB', image.size, color='white')

        try:
            pose_image = self.pose_processor(
                image,
                hand_and_face=False,
                include_body=True,
                include_hand=False,
                include_face=False,
            )
            return pose_image
        except Exception as e:
            logger.error(f"Pose extraction failed: {e}")
            return Image.new('RGB', image.size, color='white')

    def generate_image(
        self,
        image: Image.Image,
        region: str,
        scenario: str,
        view: str,
        message: str = "",
        num_inference_steps: int = 30,
        guidance_scale: float = 7.5,
        progress_callback=None,
    ) -> Image.Image:
        """Generate enhanced image using the configured pipeline"""
        self._load_pipeline()

        logger.info(f"Generating {view} view for {scenario} using {self.model_type}")

        try:
            original_size = image.size

            # Resize based on model
            if self.model_type == 'sdxl':
                target_size = (1024, 1024)
            else:
                target_size = (512, 512)  # SD 1.5 native resolution

            image = image.resize(target_size, Image.LANCZOS)

            # Build prompts
            prompt_config = self.build_prompt(region, scenario, view, message)

            logger.info(f"Running inference (steps={num_inference_steps})...")

            # Create diffusers callback wrapper
            def diffusers_callback(pipe, step, timestep, callback_kwargs):
                if progress_callback:
                    progress_callback(step + 1, num_inference_steps)
                return callback_kwargs

            if self.model_type == 'sdxl':
                # SDXL with ControlNet
                pose_image = self.extract_pose(image)

                output = self.pipe(
                    prompt=prompt_config["prompt"],
                    negative_prompt=prompt_config["negative_prompt"],
                    image=image,
                    control_image=pose_image,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    strength=prompt_config["strength"],
                    controlnet_conditioning_scale=0.8,
                    callback_on_step_end=diffusers_callback,
                )
            else:
                # SD 1.5 (simpler img2img)
                output = self.pipe(
                    prompt=prompt_config["prompt"],
                    negative_prompt=prompt_config["negative_prompt"],
                    image=image,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    strength=prompt_config["strength"],
                    callback_on_step_end=diffusers_callback,
                )

            result_image = output.images[0]

            # Resize back to original size
            if result_image.size != original_size:
                result_image = result_image.resize(original_size, Image.LANCZOS)

            logger.info("✓ Generation complete")
            return result_image

        except Exception as e:
            logger.error(f"Generation failed: {e}", exc_info=True)
            raise

    def generate_both_views(
        self,
        image: Image.Image,
        region: str,
        scenario: str,
        message: str = "",
        num_inference_steps: int = 30,
        guidance_scale: float = 7.5,
    ) -> dict:
        """Generate both rear and side views"""
        logger.info(f"Generating both views for {scenario} using {self.model_type}")

        rear_image = self.generate_image(
            image=image,
            region=region,
            scenario=scenario,
            view="rear",
            message=message,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
        )

        side_image = self.generate_image(
            image=image,
            region=region,
            scenario=scenario,
            view="side",
            message=message,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
        )

        logger.info("✓ Both views generated")

        return {
            "rear": rear_image,
            "side": side_image,
        }

    def unload_model(self):
        """Unload model from memory to free GPU VRAM"""
        if self.pipe is not None:
            del self.pipe
            self.pipe = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            logger.info("Model unloaded from memory")

    def get_memory_usage(self) -> dict:
        """Get current GPU memory usage"""
        if torch.cuda.is_available():
            return {
                "allocated_gb": torch.cuda.memory_allocated() / 1024**3,
                "reserved_gb": torch.cuda.memory_reserved() / 1024**3,
                "max_allocated_gb": torch.cuda.max_memory_allocated() / 1024**3,
            }
        return {}

"""
Local ML service using Diffusers library for gluteal enhancement simulation
Runs SDXL + ControlNet locally on GPU
"""
import torch
from diffusers import (
    StableDiffusionXLControlNetImg2ImgPipeline,
    ControlNetModel,
    AutoencoderKL
)
from PIL import Image
import numpy as np
import logging
from pathlib import Path
import os

logger = logging.getLogger(__name__)


class LocalImageGenerationService:
    """
    Local image generation service using SDXL + ControlNet
    Requires GPU with 12GB+ VRAM
    """

    def __init__(self, device="cuda", model_cache_dir=None):
        """
        Initialize the local ML pipeline

        Args:
            device: Device to run on ("cuda" or "cpu")
            model_cache_dir: Directory to cache models (default: ~/.cache/huggingface)
        """
        self.device = device
        self.model_cache_dir = model_cache_dir or os.path.expanduser("~/.cache/huggingface")

        # Check if CUDA is available
        if device == "cuda" and not torch.cuda.is_available():
            logger.warning("CUDA not available, falling back to CPU (will be very slow)")
            self.device = "cpu"

        self.pipe = None
        self.pose_processor = None

        logger.info(f"LocalImageGenerationService initialized (device={self.device})")

    def _load_pipeline(self):
        """
        Lazy load the SDXL pipeline with ControlNet
        Only loads when first needed to save memory
        """
        if self.pipe is not None:
            return

        logger.info("Loading SDXL pipeline... (this may take 2-5 minutes on first run)")

        try:
            # Load ControlNet for pose preservation
            logger.info("Loading ControlNet model...")
            controlnet = ControlNetModel.from_pretrained(
                "thibaud/controlnet-openpose-sdxl-1.0",
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                cache_dir=self.model_cache_dir,
            )

            # Load VAE for better image quality
            logger.info("Loading VAE...")
            vae = AutoencoderKL.from_pretrained(
                "madebyollin/sdxl-vae-fp16-fix",
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                cache_dir=self.model_cache_dir,
            )

            # Load main SDXL pipeline
            logger.info("Loading SDXL base model...")
            self.pipe = StableDiffusionXLControlNetImg2ImgPipeline.from_pretrained(
                "stabilityai/stable-diffusion-xl-base-1.0",
                controlnet=controlnet,
                vae=vae,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                cache_dir=self.model_cache_dir,
            )

            # Move to device
            self.pipe = self.pipe.to(self.device)

            # Enable memory optimizations
            if self.device == "cuda":
                logger.info("Enabling GPU memory optimizations...")
                self.pipe.enable_model_cpu_offload()
                self.pipe.enable_vae_tiling()

                # Try to enable xformers if available
                try:
                    self.pipe.enable_xformers_memory_efficient_attention()
                    logger.info("✓ xformers enabled for faster inference")
                except Exception as e:
                    logger.info("xformers not available, using default attention")

            logger.info("✓ SDXL pipeline loaded successfully!")

        except Exception as e:
            logger.error(f"Failed to load pipeline: {e}", exc_info=True)
            raise RuntimeError(f"Could not load SDXL pipeline: {e}")

    def _load_pose_processor(self):
        """Load OpenPose processor for ControlNet"""
        if self.pose_processor is not None:
            return

        try:
            from controlnet_aux import OpenposeDetector
            self.pose_processor = OpenposeDetector.from_pretrained('lllyasviel/ControlNet')
            logger.info("✓ Pose processor loaded")
        except Exception as e:
            logger.warning(f"Failed to load pose processor: {e}")
            logger.warning("Pose extraction will be skipped (model will work without ControlNet)")
            # Set to False to indicate it failed
            self.pose_processor = False

    def build_prompt(self, region: str, scenario: str, view: str, message: str = "") -> dict:
        """
        Build comprehensive prompt configuration for generation
        Same as Replicate version for consistency
        """
        # Scenario-based enhancement descriptions
        scenario_config = {
            "projection-level-1": {
                "description": "very subtle gluteal projection enhancement, minimal volume increase, natural and conservative aesthetic result",
                "strength": 0.35,
            },
            "projection-level-2": {
                "description": "moderate glute and hip projection, balanced enhancement, realistic and proportional result",
                "strength": 0.50,
            },
            "projection-level-3": {
                "description": "stronger glute projection while maintaining anatomical realism, smooth contours, natural appearance",
                "strength": 0.65,
            },
            "curvature": {
                "description": "add gentle curvature to the gluteal region, create smooth and natural roundness, preserve body silhouette",
                "strength": 0.50,
            },
            "hip-enhancement": {
                "description": "enhance glute and hip projection subtly, create harmonious waist-to-hip transition, maintain realistic anatomy",
                "strength": 0.50,
            },
            "firmness": {
                "description": "improve glute firmness and contour, reduce sagging appearance, maintain realistic skin texture",
                "strength": 0.55,
            },
            "lift": {
                "description": "lift gluteal contour slightly, improve lower glute definition, maintain natural anatomy",
                "strength": 0.50,
            },
            "symmetry": {
                "description": "correct mild gluteal asymmetry subtly, balance left and right sides while preserving original anatomy",
                "strength": 0.45,
            },
            "cellulite": {
                "description": "enhance gluteal projection while preserving realistic skin texture, maintain visible cellulite characteristics",
                "strength": 0.50,
            },
            "contour-smoothing": {
                "description": "improve glute shape and projection while maintaining natural fat distribution",
                "strength": 0.50,
            },
        }

        view_descriptions = {
            "rear": "posterior view, back angle, full body rear view, emphasize gluteal region",
            "side": "lateral profile view, side angle, emphasize posterior projection visible from side profile",
        }

        config = scenario_config.get(scenario, scenario_config["projection-level-2"])
        view_desc = view_descriptions.get(view, view_descriptions["rear"])

        prompt = f"""
        high quality medical photography, anatomically accurate human body,
        natural lighting, realistic skin texture and detail,
        {config["description"]},
        {view_desc},
        professional medical documentation style,
        preserve body identity strictly, maintain exact silhouette and pose,
        photorealistic result, natural appearance
        """

        if message and message.strip():
            prompt += f", {message.strip()}"

        negative_prompt = """
        deformed body, distorted proportions, unrealistic anatomy, artificial appearance,
        cartoon, anime style, oversaturated colors, low quality, blurry, grainy,
        multiple people, extra limbs, cropped body parts, incomplete body,
        inappropriate content, nudity, overprocessed, fake looking, plastic appearance,
        bad anatomy, poorly drawn, awkward pose, wrong proportions,
        text, watermark, signature
        """

        return {
            "prompt": " ".join(prompt.split()),
            "negative_prompt": " ".join(negative_prompt.split()),
            "strength": config["strength"],
        }

    def extract_pose(self, image: Image.Image) -> Image.Image:
        """
        Extract pose from image for ControlNet conditioning

        Args:
            image: Input PIL Image

        Returns:
            Pose image for ControlNet (or blank if processor unavailable)
        """
        self._load_pose_processor()

        # Check if pose processor failed to load
        if self.pose_processor is False:
            logger.debug("Pose processor not available, returning blank image")
            return Image.new('RGB', image.size, color='white')

        try:
            # Extract pose without hands and face for body focus
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
            # Return blank image as fallback (no pose conditioning)
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
    ) -> Image.Image:
        """
        Generate enhanced image using local SDXL pipeline

        Args:
            image: Input PIL Image
            region: Body region (e.g., "gluteal")
            scenario: Enhancement scenario
            view: Camera angle ("rear" or "side")
            message: Optional user message
            num_inference_steps: Quality (default 30)
            guidance_scale: Prompt adherence (default 7.5)

        Returns:
            Enhanced PIL Image
        """
        # Load pipeline if not already loaded
        self._load_pipeline()

        logger.info(f"Generating {view} view for {scenario}")

        try:
            # Resize image to SDXL native resolution
            original_size = image.size
            image = image.resize((1024, 1024), Image.LANCZOS)

            # Extract pose for ControlNet
            logger.info("Extracting pose...")
            pose_image = self.extract_pose(image)

            # Build prompts
            prompt_config = self.build_prompt(region, scenario, view, message)

            logger.info(f"Running inference (steps={num_inference_steps})...")

            # Generate
            output = self.pipe(
                prompt=prompt_config["prompt"],
                negative_prompt=prompt_config["negative_prompt"],
                image=image,
                control_image=pose_image,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                strength=prompt_config["strength"],
                controlnet_conditioning_scale=0.8,  # How much to follow pose
            )

            result_image = output.images[0]

            # Resize back to original size if needed
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
        """
        Generate both rear and side views

        Args:
            image: Input PIL Image
            region: Body region
            scenario: Enhancement scenario
            message: Optional user message
            num_inference_steps: Quality (default 30)
            guidance_scale: Prompt adherence (default 7.5)

        Returns:
            Dict with 'rear' and 'side' PIL Images
        """
        logger.info(f"Generating both views for {scenario}")

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

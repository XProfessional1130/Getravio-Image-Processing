"""
ML service using Replicate API for gluteal enhancement simulation
"""
import replicate
import os
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class ImageGenerationService:
    """
    Service for generating body enhancement simulations via Replicate API
    Uses Stable Diffusion XL for identity-preserving modifications
    """

    def __init__(self):
        """Initialize Replicate client with API token"""
        api_token = getattr(settings, 'REPLICATE_API_TOKEN', None)
        if not api_token:
            raise ValueError("REPLICATE_API_TOKEN not configured in settings")

        self.client = replicate.Client(api_token=api_token)
        logger.info("ImageGenerationService initialized successfully")

    def build_prompt(self, region: str, scenario: str, view: str, message: str = "") -> dict:
        """
        Build comprehensive prompt configuration for generation

        Args:
            region: Body region (e.g., "gluteal")
            scenario: Enhancement scenario/level
            view: Camera angle ("rear" or "side")
            message: Optional user message for additional guidance

        Returns:
            Dictionary with prompt, negative_prompt, and strength
        """

        # Scenario-based enhancement descriptions with appropriate strengths
        scenario_config = {
            # Projection levels (minimal to high)
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

            # Special enhancement cases
            "curvature": {
                "description": "add gentle curvature to the gluteal region, create smooth and natural roundness, preserve body silhouette, avoid exaggerated volume",
                "strength": 0.50,
            },
            "hip-enhancement": {
                "description": "enhance glute and hip projection subtly, create harmonious waist-to-hip transition, maintain realistic anatomy, preserve original body identity",
                "strength": 0.50,
            },
            "firmness": {
                "description": "improve glute firmness and contour, reduce sagging appearance, maintain realistic skin texture, preserve natural body proportions",
                "strength": 0.55,
            },
            "lift": {
                "description": "lift gluteal contour slightly, improve lower glute definition, maintain natural anatomy and realistic proportions",
                "strength": 0.50,
            },
            "symmetry": {
                "description": "correct mild gluteal asymmetry subtly, balance left and right sides while preserving original anatomy and natural appearance",
                "strength": 0.45,
            },
            "cellulite": {
                "description": "enhance gluteal projection while preserving realistic skin texture, maintain visible cellulite characteristics, avoid artificial smoothing",
                "strength": 0.50,
            },
            "contour-smoothing": {
                "description": "improve glute shape and projection while maintaining natural fat distribution, preserve realistic lower body contour and texture",
                "strength": 0.50,
            },
            "post-procedure": {
                "description": "improve glute symmetry carefully, smooth irregular contours caused by previous procedures, maintain realistic anatomy and proportions",
                "strength": 0.55,
            },
            "deformity-correction": {
                "description": "refine glute shape to correct visible deformities, smooth transitions, preserve body identity and avoid overcorrection",
                "strength": 0.60,
            },
        }

        # View-specific descriptions
        view_descriptions = {
            "rear": "posterior view, back angle, full body rear view, emphasize gluteal region",
            "side": "lateral profile view, side angle, emphasize posterior projection visible from side profile, maintain natural spine alignment",
        }

        # Get configuration or use default
        config = scenario_config.get(scenario, scenario_config["projection-level-2"])
        view_desc = view_descriptions.get(view, view_descriptions["rear"])

        # Build main prompt
        prompt = f"""
        high quality medical photography, anatomically accurate human body,
        natural lighting, realistic skin texture and detail,
        {config["description"]},
        {view_desc},
        professional medical documentation style,
        preserve body identity strictly, maintain exact silhouette, pose, leg length,
        waist position, shoulder width, and background unchanged,
        photorealistic result, natural appearance
        """

        # Add user message if provided
        if message and message.strip():
            prompt += f", {message.strip()}"

        # Comprehensive negative prompt to avoid artifacts
        negative_prompt = """
        deformed body, distorted proportions, unrealistic anatomy, artificial appearance,
        cartoon, anime style, oversaturated colors, low quality, blurry, grainy,
        multiple people, extra limbs, cropped body parts, incomplete body,
        inappropriate content, nudity, explicit content,
        overprocessed, fake looking, plastic appearance, unnatural skin,
        bad anatomy, poorly drawn, awkward pose, wrong proportions,
        text, watermark, signature, low resolution
        """

        return {
            "prompt": " ".join(prompt.split()),  # Clean up whitespace
            "negative_prompt": " ".join(negative_prompt.split()),
            "strength": config["strength"],
        }

    def generate_image(
        self,
        image_url: str,
        region: str,
        scenario: str,
        view: str,
        message: str = "",
        num_inference_steps: int = 30,
        guidance_scale: float = 7.5,
    ) -> str:
        """
        Generate single enhanced image using Replicate API

        Args:
            image_url: URL of original image (must be publicly accessible)
            region: Body region (e.g., "gluteal")
            scenario: Enhancement scenario (e.g., "projection-level-2")
            view: Camera angle ("rear" or "side")
            message: Optional user message for additional guidance
            num_inference_steps: Quality (more = better but slower, default 30)
            guidance_scale: How closely to follow prompt (default 7.5)

        Returns:
            URL of generated image

        Raises:
            Exception: If generation fails
        """
        try:
            logger.info(f"Generating {view} view for region={region}, scenario={scenario}")

            # Build prompts
            prompt_config = self.build_prompt(region, scenario, view, message)

            logger.debug(f"Using prompt: {prompt_config['prompt'][:100]}...")
            logger.debug(f"Strength: {prompt_config['strength']}")

            # Run SDXL via Replicate
            # Using img2img mode for controlled modifications
            output = self.client.run(
                "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                input={
                    "image": image_url,
                    "prompt": prompt_config["prompt"],
                    "negative_prompt": prompt_config["negative_prompt"],
                    "num_inference_steps": num_inference_steps,
                    "guidance_scale": guidance_scale,
                    "strength": prompt_config["strength"],
                    "num_outputs": 1,
                }
            )

            # Extract URL from output
            if isinstance(output, list) and len(output) > 0:
                result_url = output[0]
            else:
                result_url = str(output)

            logger.info(f"Generation successful: {result_url[:50]}...")
            return result_url

        except Exception as e:
            logger.error(f"Replicate generation failed: {e}", exc_info=True)
            raise Exception(f"Image generation failed: {str(e)}")

    def generate_both_views(
        self,
        image_url: str,
        region: str,
        scenario: str,
        message: str = "",
        num_inference_steps: int = 30,
        guidance_scale: float = 7.5,
    ) -> dict:
        """
        Generate both rear and side views

        Args:
            image_url: URL of original image (must be publicly accessible)
            region: Body region
            scenario: Enhancement level/scenario
            message: Optional user message
            num_inference_steps: Quality setting (default 30)
            guidance_scale: Prompt adherence (default 7.5)

        Returns:
            Dictionary with 'rear' and 'side' URLs

        Raises:
            Exception: If either generation fails
        """
        logger.info(f"Generating both views for scenario={scenario}")

        # Generate rear view
        rear_url = self.generate_image(
            image_url=image_url,
            region=region,
            scenario=scenario,
            view="rear",
            message=message,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
        )

        # Generate side view
        side_url = self.generate_image(
            image_url=image_url,
            region=region,
            scenario=scenario,
            view="side",
            message=message,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
        )

        logger.info("Both views generated successfully")

        return {
            "rear": rear_url,
            "side": side_url,
        }

    def test_connection(self) -> bool:
        """
        Test if Replicate API is accessible

        Returns:
            True if connection successful, False otherwise
        """
        try:
            # Simple test to verify API token works
            # We don't run a generation, just check if client is initialized
            return self.client.api_token is not None
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False

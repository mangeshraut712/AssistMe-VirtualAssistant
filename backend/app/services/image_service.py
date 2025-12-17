"""Image generation service using OpenAI DALL-E API."""

from typing import Optional
import logging
import os
import httpx
import re
import random
from urllib.parse import quote

logger = logging.getLogger(__name__)


class ImageService:
    """Service for generating images using AI models."""

    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.use_dalle = bool(self.openai_api_key)
        self.use_openrouter = bool(self.openrouter_api_key)

    async def generate_image(
        self,
        prompt: str,
        model: str = "flux",
        size: str = "1024x1024",
        quality: str = "standard",
        style: Optional[str] = None
    ) -> str:
        """
        Generate an image based on the prompt.

        Args:
            prompt: Text description of the image
            model: Model to use ("flux", "dall-e-3", etc.)
            size: Image size ("1024x1024", "1024x1792", etc.)
            quality: Image quality for DALL-E
            style: Optional artistic style

        Returns:
            URL of the generated image
        """
        # Enhance prompt using Gemini if possible
        enhanced_prompt = await self._enhance_prompt(prompt)
        logger.info(f"Generating image with {model}. Original: '{prompt}' -> Enhanced: '{enhanced_prompt[:50]}...'")

        # Pollinations (Free Models)
        if model in ["flux", "flux-realism", "flux-anime", "flux-3d", "turbo"]:
            return await self._generate_pollinations(enhanced_prompt, model, size, style)

        # DALL-E
        if model.startswith("dall-e") and self.use_dalle:
            try:
                return await self._generate_dalle(enhanced_prompt, model, size, quality)
            except Exception as e:
                logger.error(f"DALL-E generation failed: {e}")
                return self._placeholder_image(prompt)

        # OpenRouter
        elif self.use_openrouter:
            try:
                return await self._generate_openrouter(enhanced_prompt, model, size)
            except Exception as e:
                logger.error(f"OpenRouter generation failed with {model}: {e}")
                return self._placeholder_image(prompt)
        else:
            logger.warning("No API key configured, using placeholder")
            return self._placeholder_image(prompt)

    async def _enhance_prompt(self, prompt: str) -> str:
        """Enhance prompt using Gemini 2.0 Flash via OpenRouter."""
        if not self.use_openrouter:
            return prompt

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openrouter_api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://assistme.app"
                    },
                    json={
                        "model": "google/gemini-2.0-flash-exp:free",
                        "messages": [{
                            "role": "user",
                            "content": f"Refine this image prompt to be more descriptive and artistic for an AI image generator. concise, high quality. Prompt: '{prompt}'. Output ONLY the improved prompt text."
                        }]
                    }
                )
                if response.status_code == 200:
                    content = response.json()["choices"][0]["message"]["content"]
                    return content.strip('" ')
        except Exception as e:
            logger.warning(f"Prompt enhancement failed: {e}")

        return prompt

    async def _generate_pollinations(self, prompt: str, model: str, size: str, style: Optional[str]) -> str:
        """Generate image using Pollinations.ai (Free)."""
        # Parse size
        width, height = 1024, 1024
        try:
            w, h = size.split('x')
            width, height = int(w), int(h)
        except Exception:
            pass

        # Apply style
        final_prompt = prompt
        if style and style != 'none':
            style_map = {
                'photorealistic': 'photorealistic, highly detailed, 8k',
                'digital-art': 'digital art, vibrant colors, detailed',
                'anime': 'anime style, japanese animation, colorful',
                'oil-painting': 'oil painting, classical art, brushstrokes',
                '3d-render': '3D render, octane render, volumetric lighting',
                'watercolor': 'watercolor painting, soft colors, artistic',
                'minimalist': 'minimalist, clean, simple, modern design'
            }
            if style in style_map:
                final_prompt = f"{prompt}, {style_map[style]}"

        # Model specific params
        url_suffix = ""
        if model == "flux-realism":
            url_suffix = "&model=flux-realism"
        elif model == "flux-anime":
            url_suffix = "&model=flux-anime"
            final_prompt += ", anime style"
        elif model == "flux-3d":
            url_suffix = "&model=flux-3d"
            final_prompt += ", 3D render"
        elif model == "turbo":
            url_suffix = "&model=turbo"

        encoded = quote(final_prompt)
        seed = random.randint(0, 1000000)

        image_url = f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&seed={seed}&nologo=true{url_suffix}"

        logger.info(f"Generated Pollinations URL: {image_url}")
        return image_url

    async def _generate_dalle(
        self,
        prompt: str,
        model: str,
        size: str,
        quality: str
    ) -> str:
        """Generate image using OpenAI DALL-E API."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "prompt": prompt,
                    "n": 1,
                    "size": size,
                    "quality": quality if model == "dall-e-3" else "standard",
                    "response_format": "url"
                }
            )

            if response.status_code != 200:
                error_data = response.json()
                raise Exception(f"DALL-E API error: {error_data}")

            data = response.json()
            image_url = data["data"][0]["url"]
            logger.info(f"Image generated successfully: {image_url}")
            return image_url

    async def _generate_openrouter(
        self,
        prompt: str,
        model: str,
        size: str
    ) -> str:
        """Generate image using OpenRouter API via chat/completions."""
        logger.info(f"Attempting OpenRouter image generation with model: {model}")
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    # Using block content keeps compatibility with Gemini image models
                    "content": [
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
        }

        # Map common sizes to aspect ratios for Gemini image models
        aspect_ratio = self._aspect_ratio_from_size(size)
        if aspect_ratio:
            payload["image_config"] = {"aspect_ratio": aspect_ratio}

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openrouter_api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://assistme.app",
                        "X-Title": "AssistMe Virtual Assistant"
                    },
                    json=payload
                )

                logger.info(f"OpenRouter response status: {response.status_code}")

                if response.status_code != 200:
                    error_text = response.text
                    logger.error(f"OpenRouter API error ({response.status_code}): {error_text}")
                    raise Exception(f"OpenRouter returned {response.status_code}: {error_text}")

                data = response.json()
                image_url = self._extract_image_from_openrouter(data)
                if image_url:
                    logger.info("Image URL extracted from OpenRouter response")
                    return image_url

                logger.error(f"No image data found in OpenRouter response: {data}")
                raise Exception("No image data found in response")

            except httpx.HTTPError as e:
                logger.error(f"HTTP error during OpenRouter request: {e}")
                raise Exception(f"Network error: {str(e)}")

    def _aspect_ratio_from_size(self, size: str) -> Optional[str]:
        """Translate size strings to OpenRouter image_config aspect ratios."""
        size_map = {
            "1024x1024": "1:1",
            "1024x1792": "9:16",
            "1792x1024": "16:9"
        }
        if size in size_map:
            return size_map[size]
        try:
            w, h = size.lower().split("x")
            w, h = int(w), int(h)
            if h == 0:
                return None
            # Reduce ratio to simplest form
            from math import gcd
            g = gcd(w, h)
            return f"{w // g}:{h // g}"
        except Exception:
            return None

    def _extract_image_from_openrouter(self, data: dict) -> Optional[str]:
        """Handle the various image response shapes from OpenRouter (Gemini/SD/Flux)."""
        choices = data.get("choices", [])
        if not choices:
            return None

        message = choices[0].get("message", {})

        # Legacy Gemini shape: message.images[0].image_url.url
        images = message.get("images") or []
        if images:
            image_info = images[0]
            url = image_info.get("image_url", {}).get("url")
            if url:
                return url

        content = message.get("content")

        # Modern shape: content is a list of blocks
        if isinstance(content, list):
            for block in content:
                if not isinstance(block, dict):
                    continue
                block_type = block.get("type", "")

                # Direct image URL block
                if block_type in {"image_url", "output_image", "image", "generated_image"}:
                    url = block.get("image_url", {}).get("url") or block.get("url")
                    if url:
                        return url
                    if "b64_json" in block:
                        return f"data:image/png;base64,{block['b64_json']}"

                # Sometimes image_url is nested even if type isn't set
                if "image_url" in block and isinstance(block["image_url"], dict):
                    url = block["image_url"].get("url")
                    if url:
                        return url

                # Text block might contain a URL
                if block_type == "text" and isinstance(block.get("text"), str):
                    url = self._extract_url_from_text(block["text"])
                    if url:
                        return url

        # Content as a plain string
        if isinstance(content, str):
            url = self._extract_url_from_text(content)
            if url:
                return url

        return None

    def _extract_url_from_text(self, text: str) -> Optional[str]:
        """Find the first plausible image URL in freeform text."""
        matches = re.findall(r'(https?://[^\s)]+)', text or "")
        for url in matches:
            if any(url.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp"]):
                return url
        return matches[0] if matches else None

    def _placeholder_image(self, prompt: str) -> str:
        """Return a placeholder image URL."""
        # Use a better placeholder service
        safe_prompt = prompt[:50].replace(" ", "+")
        return f"https://placehold.co/1024x1024/4A90E2/FFF?text={safe_prompt}"


# Global instance
image_service = ImageService()

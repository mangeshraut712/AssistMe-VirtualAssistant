"""Image generation service using OpenAI DALL-E API."""

from typing import Optional
import logging
import os
import httpx

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
        model: str = "dall-e-3", 
        size: str = "1024x1024",
        quality: str = "standard"
    ) -> str:
        """
        Generate an image based on the prompt.
        
        Args:
            prompt: Text description of the image
            model: Model to use ("dall-e-3", "google/gemini-2.0-flash-001", etc.)
            size: Image size ("1024x1024", "1024x1792", or "1792x1024")
            quality: Image quality ("standard" or "hd")
            
        Returns:
            URL of the generated image
        """
        logger.info(f"Generating image with {model} for prompt: {prompt}")
        
        if model.startswith("dall-e") and self.use_dalle:
            try:
                return await self._generate_dalle(prompt, model, size, quality)
            except Exception as e:
                logger.error(f"DALL-E generation failed: {e}")
                return self._placeholder_image(prompt)
        elif self.use_openrouter:
            try:
                return await self._generate_openrouter(prompt, model, size)
            except Exception as e:
                logger.error(f"OpenRouter generation failed with {model}: {e}")
                # Fallback to a reliable model if the specific model fails
                if model != "stabilityai/stable-diffusion-xl":
                    logger.info("Retrying with stabilityai/stable-diffusion-xl...")
                    try:
                        return await self._generate_openrouter(prompt, "stabilityai/stable-diffusion-xl", size)
                    except Exception as retry_e:
                        logger.error(f"Fallback generation failed: {retry_e}")
                
                return self._placeholder_image(prompt)
        else:
            logger.warning("No API key configured, using placeholder")
            return self._placeholder_image(prompt)
    
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
        
        # OpenRouter uses chat/completions for multimodal generation
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
                    json={
                        "model": model,
                        "messages": [
                            {"role": "user", "content": f"Generate an image of: {prompt}"}
                        ]
                    }
                )
                
                logger.info(f"OpenRouter response status: {response.status_code}")
                
                if response.status_code != 200:
                    error_text = response.text
                    logger.error(f"OpenRouter API error ({response.status_code}): {error_text}")
                    raise Exception(f"OpenRouter returned {response.status_code}: {error_text}")
                
                data = response.json()
                
                # Parse OpenRouter multimodal response
                if "choices" in data and len(data["choices"]) > 0:
                    message = data["choices"][0].get("message", {})
                    
                    # Check for images in the message (Gemini style on OpenRouter)
                    if "images" in message and len(message["images"]) > 0:
                        image_info = message["images"][0]
                        if "image_url" in image_info and "url" in image_info["image_url"]:
                            image_url = image_info["image_url"]["url"]
                            logger.info("Image URL received from OpenRouter message")
                            return image_url
                            
                    # Fallback: Check content for markdown image or url (some models might do this)
                    content = message.get("content", "")
                    if "http" in content and (".png" in content or ".jpg" in content or ".webp" in content):
                        # Simple extraction attempt (could be improved)
                        import re
                        urls = re.findall(r'(https?://[^\s)]+)', content)
                        if urls:
                            return urls[0]
                
                logger.error(f"No image data found in OpenRouter response: {data}")
                raise Exception("No image data found in response")
            
            except httpx.HTTPError as e:
                logger.error(f"HTTP error during OpenRouter request: {e}")
                raise Exception(f"Network error: {str(e)}")

    def _placeholder_image(self, prompt: str) -> str:
        """Return a placeholder image URL."""
        # Use a better placeholder service
        safe_prompt = prompt[:50].replace(" ", "+")
        return f"https://placehold.co/1024x1024/4A90E2/FFF?text={safe_prompt}"


# Global instance
image_service = ImageService()

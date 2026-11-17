import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.image_service import image_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/images", tags=["images"])


class ImageGenRequest(BaseModel):
    prompt: str
    model: Optional[str] = "flux"
    size: Optional[str] = "1024x1024"
    quality: Optional[str] = "standard"
    style: Optional[str] = None


@router.post("/generate")
async def generate_image(request: ImageGenRequest):
    """Generate an image from a text prompt."""
    cleaned_prompt = (request.prompt or "").strip()
    if not cleaned_prompt:
        raise HTTPException(status_code=400, detail="Prompt must not be empty")

    cleaned_model = (request.model.strip().lower() if request.model and request.model.strip() else "flux")
    cleaned_size = (request.size.strip().lower() if request.size and request.size.strip() else "1024x1024")
    cleaned_quality = (request.quality.strip().lower() if request.quality and request.quality.strip() else "standard")
    cleaned_style = (request.style.strip() if request.style and request.style.strip() else None)

    try:
        image_url = await image_service.generate_image(
            prompt=cleaned_prompt,
            model=cleaned_model,
            size=cleaned_size,
            quality=cleaned_quality,
            style=cleaned_style,
        )
        return {
            "success": True,
            "data": [{"url": image_url}],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise HTTPException(status_code=500, detail="Image generation failed")

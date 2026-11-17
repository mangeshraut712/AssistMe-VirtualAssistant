from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..services.image_service import image_service

router = APIRouter(prefix="/api/images", tags=["images"])


class ImageGenRequest(BaseModel):
    prompt: str
    model: Optional[str] = "flux"
    size: Optional[str] = "1024x1024"
    style: Optional[str] = None


@router.post("/generate")
async def generate_image(request: ImageGenRequest):
    """Generate an image from a text prompt."""
    cleaned_prompt = (request.prompt or "").strip()
    if not cleaned_prompt:
        raise HTTPException(status_code=400, detail="Prompt must not be empty")

    try:
        image_url = await image_service.generate_image(
            prompt=cleaned_prompt,
            model=request.model or "flux",
            size=request.size or "1024x1024",
            style=request.style
        )
        return {
            "success": True,
            "data": [{"url": image_url}]
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Image generation failed")

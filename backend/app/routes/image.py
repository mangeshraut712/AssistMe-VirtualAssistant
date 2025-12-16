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
    try:
        image_url = await image_service.generate_image(
            prompt=request.prompt,
            model=request.model,
            size=request.size,
            style=request.style
        )
        return {
            "success": True, 
            "data": [{ "url": image_url }]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

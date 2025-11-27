from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional, List
import base64
import logging
from ..providers import get_provider
from ..services.file_service import file_service

router = APIRouter(tags=["multimodal"])
logger = logging.getLogger(__name__)

# Default model for multimodal tasks
MULTIMODAL_MODEL = "google/gemini-2.0-flash-001:free"

@router.post("/api/vision/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    prompt: Optional[str] = Form("Describe this image in detail.")
):
    """Analyze an uploaded image using Gemini 2.0 Flash."""
    try:
        # Read and encode image
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode("utf-8")
        mime_type = file.content_type or "image/jpeg"
        
        # Construct message for OpenRouter/Gemini
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    }
                ]
            }
        ]
        
        provider = get_provider()
        response = await provider.chat_completion(
            messages=messages,
            model=MULTIMODAL_MODEL,
            max_tokens=1024
        )
        
        return {
            "description": response["response"],
            "model": response.get("model", MULTIMODAL_MODEL)
        }
        
    except Exception as e:
        logger.error(f"Vision analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/video/analyze")
async def analyze_video(
    file: UploadFile = File(...),
    prompt: Optional[str] = Form("Describe what is happening in this video.")
):
    """Analyze an uploaded video using Gemini 2.0 Flash."""
    try:
        # Note: Sending video as base64 has size limits. 
        # For larger videos, we would need to upload to a storage service first.
        # Gemini 2.0 Flash supports video input.
        
        contents = await file.read()
        base64_video = base64.b64encode(contents).decode("utf-8")
        mime_type = file.content_type or "video/mp4"
        
        # Construct message
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url", # OpenRouter/Gemini often use image_url for video frames or base64 data
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_video}"
                        }
                    }
                ]
            }
        ]
        
        provider = get_provider()
        response = await provider.chat_completion(
            messages=messages,
            model=MULTIMODAL_MODEL,
            max_tokens=1024
        )
        
        return {
            "description": response["response"],
            "model": response.get("model", MULTIMODAL_MODEL)
        }
        
    except Exception as e:
        logger.error(f"Video analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/documents/extract")
async def extract_document(
    file: UploadFile = File(...),
    prompt: Optional[str] = Form("Summarize this document.")
):
    """Extract text from document and analyze with Gemini 2.0 Flash."""
    try:
        # Save file temporarily to extract text
        saved_file = await file_service.save_file(file)
        
        # Extract text
        text_content = await file_service.extract_text(saved_file["path"], saved_file["content_type"])
        
        if not text_content:
            return {"text": "Could not extract text from this document.", "description": "No text found."}
            
        # Analyze text with Gemini
        messages = [
            {
                "role": "system",
                "content": "You are a helpful assistant that analyzes documents."
            },
            {
                "role": "user",
                "content": f"{prompt}\n\nDocument Content:\n{text_content[:30000]}" # Truncate if too large
            }
        ]
        
        provider = get_provider()
        response = await provider.chat_completion(
            messages=messages,
            model=MULTIMODAL_MODEL,
            max_tokens=1024
        )
        
        return {
            "text": text_content,
            "description": response["response"],
            "model": response.get("model", MULTIMODAL_MODEL)
        }
        
    except Exception as e:
        logger.error(f"Document analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

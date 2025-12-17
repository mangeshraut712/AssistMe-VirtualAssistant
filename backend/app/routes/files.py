from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List

from ..services.file_service import file_service

router = APIRouter(prefix="/api/files", tags=["files"])


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file and get its ID and extracted text."""
    try:
        result = await file_service.save_file(file)

        # Extract text if possible
        text_content = await file_service.extract_text(result["path"], result["content_type"])
        result["extracted_text"] = text_content

        return {"success": True, "file": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-multiple")
async def upload_multiple_files(files: List[UploadFile] = File(...)):
    """Upload multiple files."""
    results = []
    for file in files:
        try:
            res = await file_service.save_file(file)
            text = await file_service.extract_text(res["path"], res["content_type"])
            res["extracted_text"] = text
            results.append(res)
        except Exception as e:
            results.append({"filename": file.filename, "error": str(e)})

    return {"success": True, "files": results}

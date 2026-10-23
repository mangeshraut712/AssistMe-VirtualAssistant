from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List

from ..services.file_service import (
    UploadRejected,
    file_service,
    public_file_record,
    safe_upload_name,
    upload_client_detail,
)

router = APIRouter(prefix="/api/files", tags=["files"])


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file and get its ID and extracted text."""
    try:
        result = await file_service.save_file(file)

        # Extract text if possible
        text_content = await file_service.extract_text(result["path"], result["content_type"])
        public = public_file_record(result)
        public["extracted_text"] = text_content

        return {"success": True, "file": public}
    except UploadRejected as exc:
        raise HTTPException(status_code=400, detail=upload_client_detail(exc.code)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Request failed") from exc


@router.post("/upload-multiple")
async def upload_multiple_files(files: List[UploadFile] = File(...)):
    """Upload multiple files."""
    results = []
    for file in files:
        try:
            res = await file_service.save_file(file)
            text = await file_service.extract_text(res["path"], res["content_type"])
            public = public_file_record(res)
            public["extracted_text"] = text
            results.append(public)
        except UploadRejected as exc:
            results.append({
                "filename": safe_upload_name(file.filename),
                "error": upload_client_detail(exc.code),
            })
        except Exception:
            results.append({"filename": safe_upload_name(file.filename), "error": "Request failed"})

    return {"success": True, "files": results}

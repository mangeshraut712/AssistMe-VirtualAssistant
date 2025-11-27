import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional

import aiofiles
from fastapi import UploadFile

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class FileService:
    async def save_file(self, file: UploadFile) -> dict:
        """Save an uploaded file and return its metadata."""
        file_ext = Path(file.filename).suffix
        file_id = str(uuid.uuid4())
        filename = f"{file_id}{file_ext}"
        file_path = UPLOAD_DIR / filename

        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        return {
            "id": file_id,
            "filename": file.filename,
            "path": str(file_path),
            "content_type": file.content_type,
            "size": len(content)
        }

    async def extract_text(self, file_path: str, content_type: str) -> str:
        """Extract text from a file based on its type."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if content_type == "application/pdf":
            return self._extract_pdf(path)
        elif content_type.startswith("text/"):
            return await self._read_text(path)
        else:
            return "Text extraction not supported for this file type."

    def _extract_pdf(self, path: Path) -> str:
        try:
            import pypdf
            reader = pypdf.PdfReader(path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except ImportError:
            return "pypdf not installed. Cannot extract PDF text."
        except Exception as e:
            return f"Error extracting PDF: {str(e)}"

    async def _read_text(self, path: Path) -> str:
        async with aiofiles.open(path, 'r', encoding='utf-8', errors='ignore') as f:
            return await f.read()

file_service = FileService()

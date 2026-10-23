import re
import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_AUDIO_BYTES = 25 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".txt",
    ".md",
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".doc",
    ".docx",
    ".wav",
    ".mp3",
    ".m4a",
    ".webm",
    ".mp4",
    ".mov",
}

_MIME_PATTERN = re.compile(r"^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$")


class UploadRejected(ValueError):
    """The upload failed a safety check and should be a 400 response."""


def safe_upload_name(filename: str | None) -> str:
    """Drop directory components so a client filename cannot leave the upload dir."""
    raw = (filename or "upload").replace("\\", "/").split("/")[-1]
    raw = raw.replace("\x00", "").strip()
    if raw in {"", ".", ".."}:
        return "upload"
    return raw[:255]


def safe_mime(content_type: str | None, fallback: str) -> str:
    """Keep only a single type/subtype so a content type cannot break a data URL."""
    raw = (content_type or fallback).split(";")[0].strip().lower()
    if _MIME_PATTERN.fullmatch(raw):
        return raw
    return fallback


async def read_limited(file: UploadFile, limit: int = MAX_UPLOAD_BYTES) -> bytes:
    """Read an upload, refusing empty files and files over the byte limit."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > limit:
            raise UploadRejected(f"File exceeds the {limit // (1024 * 1024)} MB limit")
        chunks.append(chunk)
    if total == 0:
        raise UploadRejected("Empty file")
    return b"".join(chunks)


def public_file_record(record: dict) -> dict:
    """Remove the server path before a file record is returned to a client."""
    return {key: value for key, value in record.items() if key != "path"}


class FileService:
    async def save_file(self, file: UploadFile) -> dict:
        """Save an uploaded file and return its metadata."""
        original_name = safe_upload_name(file.filename)
        file_ext = Path(original_name).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise UploadRejected("Unsupported file type")

        content = await read_limited(file, MAX_UPLOAD_BYTES)
        file_id = str(uuid.uuid4())
        filename = f"{file_id}{file_ext}"
        file_path = UPLOAD_DIR / filename

        async with aiofiles.open(file_path, "wb") as out_file:
            await out_file.write(content)

        return {
            "id": file_id,
            "filename": original_name,
            "path": str(file_path),
            "content_type": safe_mime(file.content_type, "application/octet-stream"),
            "size": len(content),
        }

    async def extract_text(self, file_path: str, content_type: str) -> str:
        """Extract text from a file based on its type."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        media_type = safe_mime(content_type, "")
        if media_type == "application/pdf":
            return self._extract_pdf(path)
        elif media_type.startswith("text/") or media_type in {"application/json", "application/xml"}:
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
        except Exception:
            return "Error extracting PDF."

    async def _read_text(self, path: Path) -> str:
        async with aiofiles.open(path, 'r', encoding='utf-8', errors='ignore') as f:
            return await f.read()


file_service = FileService()

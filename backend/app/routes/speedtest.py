from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
import os
import time
import logging

router = APIRouter(prefix="/api/speedtest", tags=["Speedtest"])
logger = logging.getLogger(__name__)

MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024
MIN_DOWNLOAD_BYTES = 1024
MAX_UPLOAD_BYTES = 25 * 1024 * 1024

_CHUNK_SIZE = 256 * 1024
_STATIC_PROBE_CHUNK = os.urandom(_CHUNK_SIZE)


def clamp_download_size(size: int) -> int:
    """Keep a download probe inside a fixed window."""
    try:
        size = int(size)
    except (TypeError, ValueError):
        return MIN_DOWNLOAD_BYTES
    if size < MIN_DOWNLOAD_BYTES:
        return MIN_DOWNLOAD_BYTES
    if size > MAX_DOWNLOAD_BYTES:
        return MAX_DOWNLOAD_BYTES
    return size


@router.get("/download")
async def download(size: int = MAX_DOWNLOAD_BYTES):
    """
    Real download test endpoint.
    Returns a stream of random bytes of the specified size.
    Default size is 25MB for accurate high-speed testing.
    """
    payload_size = clamp_download_size(size)

    def generate_random_bytes():
        bytes_sent = 0
        while bytes_sent < payload_size:
            take = min(_CHUNK_SIZE, payload_size - bytes_sent)
            yield _STATIC_PROBE_CHUNK[:take]
            bytes_sent += take

    return StreamingResponse(
        generate_random_bytes(),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": "attachment; filename=speedtest.bin",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Content-Length": str(payload_size),
            "X-Content-Length": str(payload_size),
        }
    )


@router.post("/upload")
async def upload(request: Request):
    """
    Real upload test endpoint.
    Consumes the request body and returns the size received.
    """
    size = 0
    start_time = time.time()
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail="Upload exceeds the 25 MB limit",
            )

    duration = max(time.time() - start_time, 0.0001)
    logger.info("Speedtest Upload: %s bytes in %.2fs", size, duration)
    speed_mbps = round((size * 8) / (duration * 1_000_000), 2)

    return {
        "size_received": size,
        "duration": duration,
        "speed_mbps": speed_mbps,
        "status": "ok"
    }


@router.get("/ping")
async def ping():
    """Simple ping for latency measurement."""
    return JSONResponse(
        content={"status": "pong", "timestamp": time.time()},
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    )

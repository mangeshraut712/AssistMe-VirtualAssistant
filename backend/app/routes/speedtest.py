from fastapi import APIRouter, Response, Request
from fastapi.responses import StreamingResponse
import os
import time
import logging

router = APIRouter(prefix="/api/speedtest", tags=["Speedtest"])
logger = logging.getLogger(__name__)

@router.get("/download")
async def download(size: int = 25 * 1024 * 1024):
    """
    Real download test endpoint.
    Returns a stream of random bytes of the specified size.
    Default size is 25MB for accurate high-speed testing.
    """
    def generate_random_bytes():
        # Using a pre-generated chunk for performance (don't want CPU to bottleneck the network)
        chunk_size = 512 * 1024  # 512KB chunks
        chunk = os.urandom(chunk_size)
        bytes_sent = 0
        while bytes_sent < size:
            take = min(chunk_size, size - bytes_sent)
            if take == chunk_size:
                yield chunk
            else:
                yield chunk[:take]
            bytes_sent += take
            
    return StreamingResponse(
        generate_random_bytes(),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": "attachment; filename=speedtest.bin",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "X-Content-Length": str(size)
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
    
    duration = time.time() - start_time
    logger.info(f"Speedtest Upload: {size} bytes in {duration:.2f}s")
    
    return {
        "size_received": size,
        "duration": duration,
        "status": "ok"
    }

@router.get("/ping")
async def ping():
    """Simple ping for latency measurement."""
    return {"status": "pong", "timestamp": time.time()}

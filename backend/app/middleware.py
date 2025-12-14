"""
FastAPI Middleware for AssistMe (2025 Best Practice)

Features:
- Request timing and logging
- Request ID propagation
- Error handling
- Security headers
- Rate limiting context
"""

from __future__ import annotations

import time
from typing import Callable
from uuid import uuid4

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from .logging_config import (
    logger,
    log_request,
    set_request_context,
    get_request_id,
)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Middleware to add request context (ID, timing) to all requests."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid4())[:8]
        set_request_context(request_id=request_id)

        # Store in request state for access in route handlers
        request.state.request_id = request_id
        request.state.start_time = time.perf_counter()

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.perf_counter() - request.state.start_time) * 1000

        # Add headers to response
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

        # Log request (skip health checks to reduce noise)
        if request.url.path not in ["/health", "/api/health", "/"]:
            log_request(
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration_ms=duration_ms,
                user_agent=request.headers.get("User-Agent", "")[:100],
            )

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to all responses."""

    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(self), camera=()",
        "Cache-Control": "no-store, no-cache, must-revalidate",
    }

    CSP_POLICY = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://openrouter.ai https://*.openrouter.ai;"
    )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Add security headers
        for header, value in self.SECURITY_HEADERS.items():
            if header not in response.headers:
                response.headers[header] = value

        # Add CSP for HTML responses
        content_type = response.headers.get("Content-Type", "")
        if "text/html" in content_type:
            response.headers["Content-Security-Policy"] = self.CSP_POLICY

        return response


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware for graceful error handling."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except Exception as e:
            # Log the error
            logger.error(
                "Unhandled exception",
                error_type=type(e).__name__,
                error_message=str(e),
                path=request.url.path,
                method=request.method,
            )

            # Return JSON error response
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal server error",
                    "request_id": getattr(request.state, "request_id", None),
                },
            )


class RateLimitContextMiddleware(BaseHTTPMiddleware):
    """Middleware to prepare rate limiting context."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract client identifier for rate limiting
        # Priority: Auth token > API key > IP address
        client_id = None

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            # Hash the token for privacy
            import hashlib
            token = auth_header[7:]
            client_id = f"user:{hashlib.sha256(token.encode()).hexdigest()[:16]}"

        if not client_id:
            api_key = request.headers.get("X-API-Key")
            if api_key:
                import hashlib
                client_id = f"key:{hashlib.sha256(api_key.encode()).hexdigest()[:16]}"

        if not client_id:
            # Fall back to IP
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                client_id = f"ip:{forwarded.split(',')[0].strip()}"
            else:
                client_id = f"ip:{request.client.host if request.client else 'unknown'}"

        request.state.client_id = client_id

        return await call_next(request)


def setup_middleware(app: FastAPI) -> None:
    """Configure all middleware for the application.

    Order matters! Middleware is executed in LIFO order.
    Last added = first executed on request, last on response.
    """
    # Error handling should be outermost (first to catch)
    app.add_middleware(ErrorHandlingMiddleware)

    # Security headers
    app.add_middleware(SecurityHeadersMiddleware)

    # Rate limiting context
    app.add_middleware(RateLimitContextMiddleware)

    # Request context (timing, request ID) - should be innermost
    app.add_middleware(RequestContextMiddleware)

    logger.info("Middleware configured", middleware_count=4)

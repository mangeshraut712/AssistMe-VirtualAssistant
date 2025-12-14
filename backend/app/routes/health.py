"""
Health Check Routes (2025 Best Practice)

Provides comprehensive health checks for:
- Application status
- Database connectivity
- AI provider availability
- Cache status
- Detailed diagnostics
"""

from __future__ import annotations

import time
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Request, Response

from ..config import get_settings
from ..logging_config import logger
from ..schemas import HealthStatus, APIStatus

router = APIRouter(prefix="/health", tags=["Health"])

# Track application start time
_start_time = time.time()


def _check_database() -> tuple[bool, str | None]:
    """Check database connectivity."""
    settings = get_settings()
    if not settings.database.url:
        return True, "Not configured (stateless mode)"

    try:
        from ..database import SessionLocal
        from sqlalchemy import text

        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            return True, None
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        return False, str(e)


def _check_redis() -> tuple[bool, str | None]:
    """Check Redis connectivity."""
    try:
        import redis
        from ..config import get_settings

        settings = get_settings()
        r = redis.from_url(settings.redis.redis_url, socket_timeout=2)
        r.ping()
        return True, None
    except Exception as e:
        return False, str(e)


def _check_ai_provider() -> tuple[bool, str | None]:
    """Check AI provider configuration."""
    settings = get_settings()
    if settings.ai.is_configured:
        return True, None
    return False, "API key not configured"


@router.get(
    "",
    response_model=HealthStatus,
    summary="Health Check",
    description="Comprehensive health check with component status",
)
async def health_check() -> HealthStatus:
    """Perform health check on all components."""
    checks: dict[str, bool] = {}

    # Check database
    db_ok, db_error = _check_database()
    checks["database"] = db_ok

    # Check Redis (optional)
    redis_ok, redis_error = _check_redis()
    checks["redis"] = redis_ok

    # Check AI provider
    ai_ok, ai_error = _check_ai_provider()
    checks["ai_provider"] = ai_ok

    # Determine overall status
    critical_checks = ["database"]  # Only database is critical
    all_critical_ok = all(checks.get(c, True) for c in critical_checks)

    if all_critical_ok and all(checks.values()):
        status = "healthy"
    elif all_critical_ok:
        status = "degraded"
    else:
        status = "unhealthy"

    settings = get_settings()

    return HealthStatus(
        status=status,
        version=settings.app_version,
        timestamp=datetime.utcnow(),
        checks=checks,
    )


@router.get(
    "/live",
    summary="Liveness Probe",
    description="Simple liveness check (for Kubernetes)",
)
async def liveness() -> dict[str, str]:
    """Simple liveness check - confirms the app is running."""
    return {"status": "alive"}


@router.get(
    "/ready",
    summary="Readiness Probe",
    description="Readiness check (for Kubernetes)",
)
async def readiness() -> dict[str, Any]:
    """Readiness check - confirms the app can serve traffic."""
    db_ok, _ = _check_database()

    if not db_ok:
        # Return unhealthy but don't fail (database is optional)
        return {"status": "ready", "database": "unavailable"}

    return {"status": "ready", "database": "connected"}


@router.get(
    "/status",
    response_model=APIStatus,
    summary="API Status",
    description="Detailed API status and configuration",
)
async def api_status(request: Request) -> APIStatus:
    """Get detailed API status."""
    settings = get_settings()
    db_ok, _ = _check_database()
    uptime = time.time() - _start_time

    return APIStatus(
        name=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        ai_configured=settings.ai.is_configured,
        database_connected=db_ok,
        uptime_seconds=round(uptime, 2),
    )


@router.get(
    "/metrics",
    summary="Basic Metrics",
    description="Basic application metrics",
)
async def metrics() -> dict[str, Any]:
    """Get basic application metrics."""
    import sys
    import os

    uptime = time.time() - _start_time
    settings = get_settings()

    return {
        "uptime_seconds": round(uptime, 2),
        "python_version": sys.version.split()[0],
        "environment": settings.environment,
        "memory_mb": round(
            __import__("resource").getrusage(
                __import__("resource").RUSAGE_SELF
            ).ru_maxrss / 1024,
            2
        ) if os.name != "nt" else None,
    }


# Simple root health for load balancers
@router.get("/ping", include_in_schema=False)
async def ping() -> Response:
    """Ultra-simple health check for load balancers."""
    return Response(content="pong", media_type="text/plain")

"""
Structured Logging for AssistMe (2025 Best Practice)

Features:
- Structured JSON logging for production
- Console logging for development
- Request ID tracking
- Performance timing
- Context propagation
"""

from __future__ import annotations

import logging
import sys
import time
from contextvars import ContextVar
from functools import wraps
from typing import Any, Callable
from uuid import uuid4

try:
    import structlog
    STRUCTLOG_AVAILABLE = True
except ImportError:
    STRUCTLOG_AVAILABLE = False

try:
    import orjson

    def orjson_dumps(v: Any, *, default: Any) -> str:
        return orjson.dumps(v, default=default).decode()

    JSON_SERIALIZER = orjson_dumps
except ImportError:
    import json
    JSON_SERIALIZER = lambda v, **kw: json.dumps(v, default=str)


# Context variables for request tracking
request_id_var: ContextVar[str] = ContextVar("request_id", default="")
user_id_var: ContextVar[str | None] = ContextVar("user_id", default=None)


def get_request_id() -> str:
    """Get current request ID or generate one."""
    rid = request_id_var.get()
    if not rid:
        rid = str(uuid4())[:8]
        request_id_var.set(rid)
    return rid


def set_request_context(request_id: str | None = None, user_id: str | None = None) -> None:
    """Set request context for logging."""
    if request_id:
        request_id_var.set(request_id)
    if user_id:
        user_id_var.set(user_id)


def add_request_context(
    logger: logging.Logger,
    method_name: str,
    event_dict: dict[str, Any],
) -> dict[str, Any]:
    """Add request context to log entries."""
    request_id = request_id_var.get()
    user_id = user_id_var.get()

    if request_id:
        event_dict["request_id"] = request_id
    if user_id:
        event_dict["user_id"] = user_id

    return event_dict


def setup_logging(
    level: str = "INFO",
    format_type: str = "console",
    service_name: str = "assistme-backend",
) -> logging.Logger:
    """Configure structured logging.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_type: 'json' for production, 'console' for development
        service_name: Service identifier for logs

    Returns:
        Configured logger instance
    """
    log_level = getattr(logging, level.upper(), logging.INFO)

    if STRUCTLOG_AVAILABLE:
        # Structlog configuration (preferred)
        processors = [
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            add_request_context,
        ]

        if format_type == "json":
            processors.extend([
                structlog.processors.format_exc_info,
                structlog.processors.JSONRenderer(serializer=JSON_SERIALIZER),
            ])
        else:
            processors.extend([
                structlog.dev.ConsoleRenderer(colors=True),
            ])

        structlog.configure(
            processors=processors,
            wrapper_class=structlog.make_filtering_bound_logger(log_level),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )

        return structlog.get_logger(service_name)
    else:
        # Fallback to standard logging
        logger = logging.getLogger(service_name)
        logger.setLevel(log_level)

        # Remove existing handlers
        logger.handlers.clear()

        # Create handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(log_level)

        if format_type == "json":
            formatter = logging.Formatter(
                '{"timestamp": "%(asctime)s", "level": "%(levelname)s", '
                '"logger": "%(name)s", "message": "%(message)s"}'
            )
        else:
            formatter = logging.Formatter(
                "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )

        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger


# Default logger instance
logger = setup_logging()


class LogContext:
    """Context manager for scoped logging context."""

    def __init__(self, **kwargs: Any):
        self.context = kwargs
        self._tokens: list = []

    def __enter__(self) -> "LogContext":
        if STRUCTLOG_AVAILABLE:
            import structlog
            structlog.contextvars.bind_contextvars(**self.context)
        return self

    def __exit__(self, *args: Any) -> None:
        if STRUCTLOG_AVAILABLE:
            import structlog
            structlog.contextvars.unbind_contextvars(*self.context.keys())


def log_execution_time(
    operation: str | None = None,
    log_args: bool = False,
) -> Callable:
    """Decorator to log function execution time.

    Args:
        operation: Custom operation name (defaults to function name)
        log_args: Whether to log function arguments
    """
    def decorator(func: Callable) -> Callable:
        op_name = operation or func.__name__

        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            start = time.perf_counter()
            extra = {}
            if log_args:
                extra["args"] = str(args)[:100]
                extra["kwargs"] = str(kwargs)[:100]

            try:
                result = await func(*args, **kwargs)
                duration = (time.perf_counter() - start) * 1000  # ms
                logger.info(
                    f"{op_name} completed",
                    operation=op_name,
                    duration_ms=round(duration, 2),
                    status="success",
                    **extra,
                )
                return result
            except Exception as e:
                duration = (time.perf_counter() - start) * 1000
                logger.error(
                    f"{op_name} failed",
                    operation=op_name,
                    duration_ms=round(duration, 2),
                    status="error",
                    error=str(e),
                    **extra,
                )
                raise

        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            start = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                duration = (time.perf_counter() - start) * 1000
                logger.info(
                    f"{op_name} completed",
                    operation=op_name,
                    duration_ms=round(duration, 2),
                    status="success",
                )
                return result
            except Exception as e:
                duration = (time.perf_counter() - start) * 1000
                logger.error(
                    f"{op_name} failed",
                    operation=op_name,
                    duration_ms=round(duration, 2),
                    status="error",
                    error=str(e),
                )
                raise

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


# Convenience log functions
def log_request(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    **extra: Any,
) -> None:
    """Log HTTP request."""
    logger.info(
        "HTTP request",
        method=method,
        path=path,
        status_code=status_code,
        duration_ms=round(duration_ms, 2),
        **extra,
    )


def log_ai_request(
    model: str,
    tokens: int,
    duration_ms: float,
    stream: bool = False,
    **extra: Any,
) -> None:
    """Log AI API request."""
    logger.info(
        "AI request",
        model=model,
        tokens=tokens,
        duration_ms=round(duration_ms, 2),
        stream=stream,
        **extra,
    )


def log_error(
    error: Exception,
    context: str | None = None,
    **extra: Any,
) -> None:
    """Log error with context."""
    logger.error(
        context or "Error occurred",
        error_type=type(error).__name__,
        error_message=str(error),
        **extra,
    )

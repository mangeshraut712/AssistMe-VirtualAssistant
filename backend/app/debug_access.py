"""Whether development-only HTTP diagnostics may be served."""

import os


def debug_endpoints_allowed(environment: str | None = None) -> bool:
    """Debug routes stay off in production, including when DEBUG is set."""
    env = os.getenv("ENVIRONMENT", "development") if environment is None else environment
    return str(env).strip().lower() != "production"

"""Helpers for model sampling parameters."""

from __future__ import annotations

from typing import Optional


def resolve_temperature(value: Optional[float], fallback: float = 0.7) -> float:
    """Keep a valid 0 temperature; only missing/non-numeric values use the default."""
    try:
        n = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return fallback
    if n != n:  # NaN
        return fallback
    return min(2.0, max(0.0, n))

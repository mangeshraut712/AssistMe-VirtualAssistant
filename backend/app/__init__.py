"""API package initializer to support module imports."""

# Import compatibility shims before the rest of the package modules are loaded.
from . import compat  # noqa: F401

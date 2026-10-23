"""Keep pytest from creating a SQLite file in the repository."""

import os
import sys
import types
from pathlib import Path

import app

_data_dir = Path("/tmp/assistme-pytest-data")
_data_dir.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("DATA_DIR", str(_data_dir))
os.environ.setdefault("RAILWAY_PROJECT_ID", "pytest")

# Auth tests import the route modules directly. Stub the routes package so
# importing them does not execute app/routes/__init__.py, which pulls in the
# embedding stack (faiss, sentence-transformers) that CI does not install.
if "app.routes" not in sys.modules:
    routes = types.ModuleType("app.routes")
    routes.__path__ = [str(Path(app.__file__).resolve().parent / "routes")]
    routes.__package__ = "app.routes"
    sys.modules["app.routes"] = routes

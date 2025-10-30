import os
import sys

# Ensure backend/app is importable as the `app` package when running tests
CURRENT_DIR = os.path.dirname(__file__)
APP_PATH = os.path.join(CURRENT_DIR, "app")
if APP_PATH not in sys.path:
    sys.path.insert(0, APP_PATH)

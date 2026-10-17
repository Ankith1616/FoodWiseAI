"""
Root proxy entrypoint for Uvicorn.
Allows `uvicorn app.main:app` to resolve cleanly when executed from the repository root.
"""
import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
for p in [backend_dir, root_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.main import app

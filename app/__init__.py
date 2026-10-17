import os
import sys

# Extend package search path to include backend/app
backend_app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "app"))
if os.path.isdir(backend_app_dir) and backend_app_dir not in __path__:
    __path__.insert(0, backend_app_dir)

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
for p in [backend_dir, root_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

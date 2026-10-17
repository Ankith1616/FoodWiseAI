"""
FoodWiseAI — FastAPI Application Entry Point

Creates the FastAPI app instance, registers middleware and routes.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Ensure both 'backend' (containing 'app') and root (containing 'ai') are in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
root_dir = os.path.abspath(os.path.join(backend_dir, ".."))
for p in [backend_dir, root_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.api.v1.router import router as v1_router
from app.core.config import settings
from fastapi.staticfiles import StaticFiles


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # ── Startup ──────────────────────────────────────────
    print(f"[*] {settings.APP_NAME} starting up...")
    yield
    # ── Shutdown ─────────────────────────────────────────
    print(f"[*] {settings.APP_NAME} shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered food tracking and nutrition analysis API",
    version="0.1.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# ── CORS Middleware ──────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────
app.include_router(v1_router, prefix=settings.API_V1_PREFIX)

# Serve static assets (like dish images and dataset)
from pathlib import Path
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

from fastapi.responses import FileResponse, Response, RedirectResponse

@app.get("/", include_in_schema=False)
async def root():
    """Redirect root path directly to interactive API documentation."""
    return RedirectResponse(url="/docs")

@app.get("/dataset/{file_path:path}")
async def get_dataset_file(file_path: str):
    base_dir = Path(__file__).resolve().parent.parent.parent / "ai" / "data"
    for folder in ["train", "test", "val"]:
        candidate = base_dir / folder / file_path
        if candidate.exists() and candidate.is_file():
            return FileResponse(str(candidate))
    return Response(status_code=404)



@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "0.1.0",
    }

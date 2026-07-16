"""
FoodWiseAI — FastAPI Application Entry Point

Creates the FastAPI app instance, registers middleware and routes.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.core.config import settings


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


@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "0.1.0",
    }

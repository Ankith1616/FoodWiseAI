"""
FoodWiseAI — API v1 Router

Aggregates all v1 endpoint routers.
"""

from fastapi import APIRouter
from app.api.v1.recommendations import router as recommendations_router

router = APIRouter()

# ── Mount domain routers here ────────────────────────────
router.include_router(recommendations_router, prefix="/recommendations", tags=["recommendations"])


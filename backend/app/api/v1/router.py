"""
FoodWiseAI — API v1 Router

Aggregates all v1 endpoint routers.
"""

from fastapi import APIRouter
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.dataset import router as dataset_router
from app.api.v1.dataset_management import router as dataset_mgmt_router
from app.api.v1.auth import router as auth_router

router = APIRouter()

# ── Mount domain routers ────────────────────────────
router.include_router(auth_router)
router.include_router(recommendations_router, prefix="/recommendations", tags=["recommendations"])
router.include_router(dataset_router, prefix="/dataset", tags=["dataset"])
router.include_router(dataset_mgmt_router, tags=["dataset_management"])


@router.get("/health", tags=["health"])
async def health_check():
    """V1 API health check endpoint."""
    return {"status": "healthy"}

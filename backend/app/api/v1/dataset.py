"""
FoodWiseAI — Dataset Images API Endpoint

Exposes metadata for all images in the root Dataset directory.
"""

from pathlib import Path
from fastapi import APIRouter
from app.models.dishes import SEED_DISHES

router = APIRouter()

DATASET_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "Dataset"


@router.get("/images", tags=["dataset"])
async def get_dataset_images():
    """
    Returns metadata for all image files present in the Dataset directory.
    """
    items = []
    if DATASET_DIR.exists():
        for file in sorted(DATASET_DIR.iterdir()):
            if file.is_file() and file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp", ".avif"]:
                file_size = round(file.stat().st_size / 1024, 1)  # in KB
                ext = file.suffix.lstrip(".").upper()

                # Find associated dish from SEED_DISHES if available
                matched_dish = next(
                    (d for d in SEED_DISHES if d.get("dataset_file") == file.name or file.name in d.get("image_url", "")),
                    None
                )

                items.append({
                    "filename": file.name,
                    "url": f"/dataset/{file.name}",
                    "static_url": f"/static/dataset/{file.name}",
                    "size_kb": file_size,
                    "format": ext,
                    "associated_dish": matched_dish["name"] if matched_dish else "Unassigned Dish",
                    "category": matched_dish["category"] if matched_dish else "General Food",
                    "price": matched_dish.get("price") if matched_dish else 250.0,
                    "rating": matched_dish.get("rating") if matched_dish else 4.5,
                })

    return {
        "total": len(items),
        "dataset_path": str(DATASET_DIR),
        "images": items
    }

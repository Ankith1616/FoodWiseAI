"""
FoodWiseAI — Dataset Images API Endpoint

Exposes metadata for all images in the root Dataset directory.
"""

from pathlib import Path
from fastapi import APIRouter
from app.models.dishes import SEED_DISHES

router = APIRouter()

DATASET_DIR = Path(__file__).resolve().parents[4] / "ai" / "data" / "train"


@router.get("/images", tags=["dataset"])
async def get_dataset_images():
    """
    Returns metadata for image files present in the dataset directory.
    """
    items = []
    if DATASET_DIR.exists():
        for cat_dir in sorted(DATASET_DIR.iterdir()):
            if cat_dir.is_dir():
                cat_name = cat_dir.name
                count = 0
                for file in sorted(cat_dir.iterdir()):
                    if file.is_file() and file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp", ".avif"]:
                        file_size = round(file.stat().st_size / 1024, 1)
                        ext = file.suffix.lstrip(".").upper()
                        rel_path = f"{cat_name}/{file.name}"

                        matched_dish = next(
                            (d for d in SEED_DISHES if d.get("dataset_file") == rel_path or rel_path in d.get("image_url", "")),
                            None
                        )
                        if not matched_dish:
                            matched_dish = next(
                                (d for d in SEED_DISHES if d.get("category") == cat_name),
                                None
                            )

                        items.append({
                            "filename": rel_path,
                            "url": f"/dataset/{rel_path}",
                            "static_url": f"/dataset/{rel_path}",
                            "size_kb": file_size,
                            "format": ext,
                            "associated_dish": matched_dish["name"] if matched_dish else f"{cat_name} Dish",
                            "category": cat_name,
                            "price": matched_dish.get("price") if matched_dish else 200.0,
                            "rating": matched_dish.get("rating") if matched_dish else 4.5,
                        })
                        count += 1
                        if count >= 10:  # 10 representative images per category
                            break

    return {
        "total": len(items),
        "dataset_path": str(DATASET_DIR),
        "images": items
    }

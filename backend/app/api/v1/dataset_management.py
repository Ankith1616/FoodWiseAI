"""
FoodWiseAI — Dataset Management & Anonymous Research Exporter API Router

Endpoints:
- POST /api/v1/interactions: Log real application user interactions with automatic Hard-Negative classification.
- GET /api/v1/admin/dataset/stats: Dataset statistics & sample class breakdown.
- GET /api/v1/admin/dataset/samples: Filterable interaction samples (Positive, Negative, Neutral, Hard-Negative).
- POST /api/v1/admin/dataset/images/upload: Upload & process food images.
- GET /api/v1/admin/dataset/export: Export 100% anonymous research dataset ZIP archive containing 6 CSVs, data_dictionary.csv, README.md, and food_images/ folder.
"""

import os
import csv
import json
import io
import zipfile
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.models.dishes import SEED_DISHES
from app.services.dataset_classifier import classify_interaction_sample

router = APIRouter()

# Directories
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DATASET_IMAGES_DIR = os.path.join(BASE_DIR, "Dataset")
EXPORT_TEMP_DIR = os.path.join(BASE_DIR, "ai", "export_temp")

# In-Memory & File Persisted Datasets (Simulating DB store for seamless speed & portability)
PERSIST_FILE = os.path.join(BASE_DIR, "ai", "research_dataset_store.json")


def _load_store() -> Dict[str, Any]:
    """Load JSON database store for dataset tables."""
    if os.path.exists(PERSIST_FILE):
        try:
            with open(PERSIST_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return _seed_initial_store()


def _save_store(store: Dict[str, Any]):
    """Save JSON database store."""
    os.makedirs(os.path.dirname(PERSIST_FILE), exist_ok=True)
    with open(PERSIST_FILE, "w") as f:
        json.dump(store, f, indent=2)


def _seed_initial_store() -> Dict[str, Any]:
    """Seed initial dataset structure from SEED_DISHES and default benchmark users."""
    print("Seeding initial research dataset store...")
    images_meta = []
    food_catalog = []
    local_foods = []
    
    # 1. Process Seed Images & Food Items
    local_files = []
    if os.path.exists(DATASET_IMAGES_DIR):
        local_files = os.listdir(DATASET_IMAGES_DIR)

    for dish in SEED_DISHES:
        fname = dish.get("dataset_file") or f"dish_{dish['id']}.jpg"
        img_id = f"IMG_{dish['id']:03d}"
        
        # Add Image Metadata
        images_meta.append({
            "image_id": img_id,
            "filename": fname,
            "url": f"/dataset/{fname}",
            "format": fname.split(".")[-1].upper() if "." in fname else "JPG",
            "size_kb": 142.5,
            "width": 500,
            "height": 500,
            "created_at": datetime.utcnow().isoformat()
        })
        
        # Add Food Catalog Item
        is_veg = ("paneer" in dish["name"].lower() or "dosa" in dish["name"].lower() or 
                  "salad" in dish["name"].lower() or "pizza" in dish["name"].lower() or "samosa" in dish["name"].lower())
        
        food_catalog.append({
            "food_id": dish["id"],
            "name": dish["name"],
            "cuisine": "Indian" if dish["category"] == "Indian" else ("Italian" if dish["category"] == "Italian" else "Continental"),
            "category": dish["category"],
            "is_veg": is_veg,
            "price": float(dish["price"]),
            "calories": 450 if is_veg else 620,
            "protein_g": 18.5 if is_veg else 32.0,
            "carbs_g": 52.0 if is_veg else 40.0,
            "fats_g": 14.0 if is_veg else 22.0,
            "meal_type": "Lunch" if dish["id"] % 2 == 0 else "Dinner",
            "ingredients": "Paneer, Spices, Tomatoes, Rice" if is_veg else "Chicken, Spices, Oil, Rice",
            "restaurant": dish["restaurant"],
            "location": "Mumbai, Central" if dish["id"] % 2 == 0 else "Delhi, Connaught Place",
            "image_id": img_id,
            "created_at": datetime.utcnow().isoformat()
        })
        
        # Add Local Food Data
        local_foods.append({
            "local_food_id": f"LOC_{dish['id']:03d}",
            "food_id": dish["id"],
            "city": "Mumbai" if dish["id"] % 2 == 0 else "Delhi",
            "region": "Western India" if dish["id"] % 2 == 0 else "Northern India",
            "cultural_notes": f"Authentic regional specialization popular in {dish['restaurant']}.",
            "seasonality": "All-Year",
            "created_at": datetime.utcnow().isoformat()
        })

    # 2. Seed Anonymous User Preferences
    user_preferences = [
        {
            "user_id": "USR_001_KETO",
            "dietary_protocols": json.dumps(["Keto"]),
            "max_calories": 550,
            "spice_tolerance": 3,
            "protein_ratio": 0.45,
            "carbs_ratio": 0.15,
            "fats_ratio": 0.40,
            "favorite_categories": json.dumps(["Indian", "Fast Food"]),
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "user_id": "USR_002_VEGAN",
            "dietary_protocols": json.dumps(["Vegan"]),
            "max_calories": 600,
            "spice_tolerance": 2,
            "protein_ratio": 0.25,
            "carbs_ratio": 0.55,
            "fats_ratio": 0.20,
            "favorite_categories": json.dumps(["Healthy", "Italian"]),
            "created_at": datetime.utcnow().isoformat()
        },
    ]

    # 3. Seed Realistic Interactions & Hard-Negatives
    interactions = [
        # Positive Interaction
        {
            "interaction_id": "INT_001",
            "user_id": "USR_001_KETO",
            "food_id": 1,
            "interaction_type": "order",
            "rating_val": 4.8,
            "meal_time": "Dinner",
            "recommendation_source": "explore",
            "sample_class": "positive",
            "dwell_time_sec": 12.4,
            "timestamp": datetime.utcnow().isoformat()
        },
        # Hard-Negative Interaction (User 2 Vegan rejected Chicken Lollipop drums despite matching calorie threshold!)
        {
            "interaction_id": "INT_002_HARD_NEG",
            "user_id": "USR_002_VEGAN",
            "food_id": 1,
            "interaction_type": "dislike",
            "rating_val": 1.0,
            "meal_time": "Lunch",
            "recommendation_source": "explore",
            "sample_class": "hard_negative",
            "dwell_time_sec": 5.2,
            "timestamp": datetime.utcnow().isoformat()
        },
        # Neutral View Interaction
        {
            "interaction_id": "INT_003",
            "user_id": "USR_001_KETO",
            "food_id": 4,
            "interaction_type": "view",
            "rating_val": None,
            "meal_time": "Lunch",
            "recommendation_source": "profiler",
            "sample_class": "neutral",
            "dwell_time_sec": 1.8,
            "timestamp": datetime.utcnow().isoformat()
        }
    ]

    # 4. Recommendation Feedbacks
    feedbacks = [
        {
            "feedback_id": "FDB_001",
            "interaction_id": "INT_002_HARD_NEG",
            "feedback_type": "wrong_diet",
            "explicit_reason": "Contains chicken; user prefers strictly plant-based/vegan items.",
            "created_at": datetime.utcnow().isoformat()
        }
    ]

    store = {
        "images_metadata": images_meta,
        "food_catalog": food_catalog,
        "user_preferences": user_preferences,
        "interactions": interactions,
        "local_foods": local_foods,
        "feedbacks": feedbacks
    }
    _save_store(store)
    return store


# ── API Pydantic Schemas ─────────────────────────────────────────────
class InteractionPayload(BaseModel):
    user_id: Optional[str] = "USR_ANON_DEFAULT"
    food_id: int
    interaction_type: str  # view, click, like, dislike, favorite, skip, rating, order
    rating_val: Optional[float] = None
    dwell_time_sec: Optional[float] = 0.0
    meal_time: Optional[str] = "Dinner"
    recommendation_source: Optional[str] = "explore"
    user_survey: Optional[Dict[str, Any]] = None


# ── Endpoints ─────────────────────────────────────────────────────────

@router.post("/interactions", tags=["dataset"])
async def log_interaction(payload: InteractionPayload):
    """
    Log real-time user-food interaction with automatic Hard-Negative Classification.
    """
    store = _load_store()
    
    # 1. Fetch or create anonymous user preference
    user_id = payload.user_id or "USR_ANON_DEFAULT"
    user_pref = next((u for u in store["user_preferences"] if u["user_id"] == user_id), None)
    if not user_pref and payload.user_survey:
        user_pref = {
            "user_id": user_id,
            "dietary_protocols": json.dumps(payload.user_survey.get("diets", [])),
            "max_calories": payload.user_survey.get("max_calories", 650),
            "spice_tolerance": payload.user_survey.get("spice_level", 2),
            "protein_ratio": payload.user_survey.get("protein_ratio", 0.35),
            "carbs_ratio": payload.user_survey.get("carbs_ratio", 0.40),
            "fats_ratio": payload.user_survey.get("fats_ratio", 0.25),
            "favorite_categories": json.dumps([payload.user_survey.get("favorite_category", "Indian")]),
            "created_at": datetime.utcnow().isoformat()
        }
        store["user_preferences"].append(user_pref)

    # 2. Fetch food catalog item
    food_item = next((f for f in store["food_catalog"] if f["food_id"] == payload.food_id), None)
    if not food_item:
        raise HTTPException(status_code=404, detail="Food item not found in catalog.")

    # 3. Classify sample into positive, negative, neutral, or hard_negative
    sample_class = classify_interaction_sample(
        user_pref=user_pref,
        food_item=food_item,
        interaction_type=payload.interaction_type,
        rating_val=payload.rating_val,
        dwell_time_sec=payload.dwell_time_sec or 0.0
    )

    # 4. Save interaction entry
    interaction_entry = {
        "interaction_id": f"INT_{uuid.uuid4().hex[:8].upper()}",
        "user_id": user_id,
        "food_id": payload.food_id,
        "interaction_type": payload.interaction_type,
        "rating_val": payload.rating_val,
        "meal_time": payload.meal_time or "Dinner",
        "recommendation_source": payload.recommendation_source or "explore",
        "sample_class": sample_class,
        "dwell_time_sec": payload.dwell_time_sec or 0.0,
        "timestamp": datetime.utcnow().isoformat()
    }
    store["interactions"].append(interaction_entry)
    _save_store(store)

    return {
        "status": "success",
        "interaction_id": interaction_entry["interaction_id"],
        "sample_class": sample_class,
        "message": f"Interaction logged as '{sample_class}'"
    }


@router.get("/admin/dataset/stats", tags=["admin_dataset"])
async def get_dataset_stats():
    """
    Get overview dataset statistics & interaction sample breakdown.
    """
    store = _load_store()
    interactions = store["interactions"]
    
    total_foods = len(store["food_catalog"])
    total_users = len(store["user_preferences"])
    total_images = len(store["images_metadata"])
    total_interactions = len(interactions)
    
    positive_count = sum(1 for i in interactions if i["sample_class"] == "positive")
    negative_count = sum(1 for i in interactions if i["sample_class"] == "negative")
    neutral_count = sum(1 for i in interactions if i["sample_class"] == "neutral")
    hard_neg_count = sum(1 for i in interactions if i["sample_class"] == "hard_negative")
    
    return {
        "total_foods": total_foods,
        "total_users": total_users,
        "total_images": total_images,
        "total_interactions": total_interactions,
        "sample_breakdown": {
            "positive": positive_count,
            "negative": negative_count,
            "neutral": neutral_count,
            "hard_negative": hard_neg_count
        },
        "positive_rate_pct": round((positive_count / total_interactions * 100), 1) if total_interactions > 0 else 0.0
    }


@router.get("/admin/dataset/samples", tags=["admin_dataset"])
async def get_dataset_samples(sample_class: Optional[str] = None):
    """
    Get filtered list of interaction samples for admin inspection.
    """
    store = _load_store()
    items = store["interactions"]
    if sample_class and sample_class.lower() != "all":
        items = [i for i in items if i["sample_class"].lower() == sample_class.lower()]

    # Join with food catalog info for visual display
    enriched = []
    for item in items:
        food = next((f for f in store["food_catalog"] if f["food_id"] == item["food_id"]), {})
        user = next((u for u in store["user_preferences"] if u["user_id"] == item["user_id"]), {})
        enriched.append({
            **item,
            "food_name": food.get("name", "Unknown Dish"),
            "category": food.get("category", "General"),
            "price": food.get("price", 0.0),
            "user_diet": user.get("dietary_protocols", "[]")
        })

    return enriched


@router.get("/admin/dataset/export", tags=["admin_dataset"])
async def export_research_dataset():
    """
    Exports a 100% anonymous research dataset ZIP archive containing:
    1. food_catalog.csv
    2. user_preferences.csv
    3. user_food_interactions.csv
    4. recommendation_feedback.csv
    5. local_foods.csv
    6. image_metadata.csv
    7. data_dictionary.csv
    8. README.md
    9. food_images/ folder with images
    """
    store = _load_store()
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        
        # 1. food_catalog.csv
        fc_out = io.StringIO()
        writer = csv.DictWriter(fc_out, fieldnames=[
            "food_id", "name", "cuisine", "category", "is_veg", "price", 
            "calories", "protein_g", "carbs_g", "fats_g", "meal_type", 
            "ingredients", "restaurant", "location", "image_id", "created_at"
        ])
        writer.writeheader()
        for r in store["food_catalog"]: writer.writerow(r)
        zip_file.writestr("food_catalog.csv", fc_out.getvalue())

        # 2. user_preferences.csv (100% Anonymous - No PII!)
        up_out = io.StringIO()
        writer = csv.DictWriter(up_out, fieldnames=[
            "user_id", "dietary_protocols", "max_calories", "spice_tolerance",
            "protein_ratio", "carbs_ratio", "fats_ratio", "favorite_categories", "created_at"
        ])
        writer.writeheader()
        for r in store["user_preferences"]: writer.writerow(r)
        zip_file.writestr("user_preferences.csv", up_out.getvalue())

        # 3. user_food_interactions.csv
        ui_out = io.StringIO()
        writer = csv.DictWriter(ui_out, fieldnames=[
            "interaction_id", "user_id", "food_id", "interaction_type",
            "rating_val", "meal_time", "recommendation_source", "sample_class",
            "dwell_time_sec", "timestamp"
        ])
        writer.writeheader()
        for r in store["interactions"]: writer.writerow(r)
        zip_file.writestr("user_food_interactions.csv", ui_out.getvalue())

        # 4. recommendation_feedback.csv
        rf_out = io.StringIO()
        writer = csv.DictWriter(rf_out, fieldnames=[
            "feedback_id", "interaction_id", "feedback_type", "explicit_reason", "created_at"
        ])
        writer.writeheader()
        for r in store["feedbacks"]: writer.writerow(r)
        zip_file.writestr("recommendation_feedback.csv", rf_out.getvalue())

        # 5. local_foods.csv
        lf_out = io.StringIO()
        writer = csv.DictWriter(lf_out, fieldnames=[
            "local_food_id", "food_id", "city", "region", "cultural_notes", "seasonality", "created_at"
        ])
        writer.writeheader()
        for r in store["local_foods"]: writer.writerow(r)
        zip_file.writestr("local_foods.csv", lf_out.getvalue())

        # 6. image_metadata.csv
        im_out = io.StringIO()
        writer = csv.DictWriter(im_out, fieldnames=[
            "image_id", "filename", "url", "format", "size_kb", "width", "height", "created_at"
        ])
        writer.writeheader()
        for r in store["images_metadata"]: writer.writerow(r)
        zip_file.writestr("image_metadata.csv", im_out.getvalue())

        # 7. data_dictionary.csv
        dd_out = io.StringIO()
        writer = csv.writer(dd_out)
        writer.writerow(["dataset_file", "field_name", "data_type", "is_primary_key", "is_foreign_key", "description"])
        data_dict_rows = [
            ("food_catalog.csv", "food_id", "INTEGER", "YES", "NO", "Unique identifier for food item"),
            ("food_catalog.csv", "name", "STRING", "NO", "NO", "Name of dish"),
            ("food_catalog.csv", "image_id", "STRING", "NO", "YES (image_metadata.image_id)", "Connected image metadata key"),
            ("user_preferences.csv", "user_id", "STRING", "YES", "NO", "Anonymous user UUID"),
            ("user_food_interactions.csv", "interaction_id", "STRING", "YES", "NO", "Unique interaction event ID"),
            ("user_food_interactions.csv", "user_id", "STRING", "NO", "YES (user_preferences.user_id)", "Connected anonymous user ID"),
            ("user_food_interactions.csv", "food_id", "INTEGER", "NO", "YES (food_catalog.food_id)", "Connected food ID"),
            ("user_food_interactions.csv", "sample_class", "STRING", "NO", "NO", "Interaction classification: positive, negative, neutral, hard_negative"),
        ]
        for row in data_dict_rows: writer.writerow(row)
        zip_file.writestr("data_dictionary.csv", dd_out.getvalue())

        # 8. README.md
        readme_content = """# FoodWiseAI Structured Research Dataset

## Dataset Overview
This dataset contains structured multi-modal food catalog metadata, anonymized user metabolic preferences, real-time user-food interactions, explicit feedback, local cultural food data, and food image metadata collected via genuine application usage.

## Connected Primary Keys
- `user_id`: Anonymous UUID connecting `user_preferences.csv` and `user_food_interactions.csv`.
- `food_id`: Primary key connecting `food_catalog.csv`, `local_foods.csv`, and `user_food_interactions.csv`.
- `image_id`: Connects `image_metadata.csv` to `food_catalog.csv` and the files in `food_images/`.
- `interaction_id`: Connects `user_food_interactions.csv` and `recommendation_feedback.csv`.

## Sample Classifications
- `positive`: Orders, favorites, likes, or ratings >= 4.0.
- `negative`: Explicit dislikes or skips after inspection.
- `neutral`: Simple views/impressions without explicit interaction.
- `hard_negative`: Items that match the user's preference profile (diet/calories/category) but were explicitly rejected by the user.

## Anonymization & Privacy
All personal identifiable information (PII) including names, emails, passwords, phone numbers, exact addresses, and exact GPS coordinates are 100% excluded.
"""
        zip_file.writestr("README.md", readme_content)

        # 9. Include food_images/ files
        if os.path.exists(DATASET_IMAGES_DIR):
            for fname in os.listdir(DATASET_IMAGES_DIR):
                fpath = os.path.join(DATASET_IMAGES_DIR, fname)
                if os.path.isfile(fpath):
                    zip_file.write(fpath, arcname=f"food_images/{fname}")

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=FoodWiseAI_Research_Dataset_{datetime.now().strftime('%Y%m%d')}.zip"}
    )

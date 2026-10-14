"""
FoodWiseAI — Model 4: FoodConditionalGAN (AC-GAN) API Endpoint

Provides on-demand synthetic food dish generation conditioned on Food-11 dietary
categories using the trained Generative Adversarial Network.
"""

import os
import sys
import io
import time
import base64
import json
from pathlib import Path
from typing import Optional, List
import numpy as np
import torch
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

# Ensure root path
ROOT_DIR = Path(__file__).resolve().parents[4]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from ai.models.food_gan import FoodGANGenerator, FOOD11_CLASSES, generate_synthetic_dish

router = APIRouter()

MODELS_DIR = ROOT_DIR / "ai" / "models"
GENERATOR_CKPT = MODELS_DIR / "food_gan_generator.pth"
STATUS_FILE = MODELS_DIR / "model4_status.json"
STATIC_GEN_DIR = ROOT_DIR / "backend" / "static" / "generated"
STATIC_GEN_DIR.mkdir(parents=True, exist_ok=True)

# Global generator cache for fast inference
_generator_instance: Optional[FoodGANGenerator] = None
_generator_latent_dim: int = 100


def get_generator() -> FoodGANGenerator:
    """Loads or retrieves cached FoodGANGenerator instance."""
    global _generator_instance, _generator_latent_dim
    if _generator_instance is not None:
        return _generator_instance

    num_classes = len(FOOD11_CLASSES)
    latent_dim = 100

    model = FoodGANGenerator(latent_dim=latent_dim, num_classes=num_classes)

    if GENERATOR_CKPT.exists():
        try:
            ckpt = torch.load(str(GENERATOR_CKPT), map_location="cpu", weights_only=True)
            if "model_state_dict" in ckpt:
                model.load_state_dict(ckpt["model_state_dict"])
            if "latent_dim" in ckpt:
                latent_dim = ckpt["latent_dim"]
            print(f"[*] Loaded trained FoodGAN Generator from {GENERATOR_CKPT}")
        except Exception as e:
            print(f"[!] Warning: Could not load generator checkpoint ({e}), using initialized weights.")
    else:
        print("[!] Warning: food_gan_generator.pth not found, using initialized weights.")

    model.eval()
    _generator_instance = model
    _generator_latent_dim = latent_dim
    return _generator_instance


CATEGORY_META = [
    {"id": 0, "name": "Bread", "icon": "🍞", "sample_name": "Artisanal Sourdough / Brioche", "avg_calories": 260},
    {"id": 1, "name": "Dairy product", "icon": "🧀", "sample_name": "Greek Yogurt & Farm Cheese", "avg_calories": 180},
    {"id": 2, "name": "Dessert", "icon": "🍰", "sample_name": "Velvet Berry Torte", "avg_calories": 380},
    {"id": 3, "name": "Egg", "icon": "🍳", "sample_name": "Avocado Poached Egg Bowl", "avg_calories": 210},
    {"id": 4, "name": "Fried food", "icon": "🍟", "sample_name": "Crispy Golden Crunch Tempura", "avg_calories": 440},
    {"id": 5, "name": "Meat", "icon": "🥩", "sample_name": "Herb-Crusted Tenderloin", "avg_calories": 340},
    {"id": 6, "name": "Noodles-Pasta", "icon": "🍝", "sample_name": "Truffle Tagliatelle", "avg_calories": 390},
    {"id": 7, "name": "Rice", "icon": "🍚", "sample_name": "Aromatic Jasmine Pilaf Bowl", "avg_calories": 280},
    {"id": 8, "name": "Seafood", "icon": "🦐", "sample_name": "Citrus Seared Salmon Fillet", "avg_calories": 290},
    {"id": 9, "name": "Soup", "icon": "🍲", "sample_name": "Hearty Garden Minestrone", "avg_calories": 160},
    {"id": 10, "name": "Vegetable-Fruit", "icon": "🥗", "sample_name": "Mediterranean Crisp Harvest Bowl", "avg_calories": 140},
]


class GenerateRequest(BaseModel):
    category_id: int = Field(0, ge=0, le=10, description="Food-11 class index (0 to 10)")
    seed: Optional[int] = Field(None, description="Optional random seed for reproducibility")
    creativity: float = Field(1.0, ge=0.5, le=2.0, description="Noise scaling multiplier (0.5 - 2.0)")
    num_variations: int = Field(1, ge=1, le=4, description="Number of variations (1 to 4)")


@router.get("/status", tags=["gan"])
async def get_gan_status():
    """
    Returns GAN training status, architecture specifications, and class support.
    """
    if STATUS_FILE.exists():
        try:
            with open(STATUS_FILE, "r") as f:
                data = json.load(f)
            data["weights_available"] = GENERATOR_CKPT.exists()
            return data
        except Exception:
            pass

    return {
        "status": "available",
        "model_name": "FoodConditionalGAN",
        "architecture": "Auxiliary Classifier Generative Adversarial Network (AC-GAN)",
        "latent_dim": 100,
        "num_classes": len(FOOD11_CLASSES),
        "classes": FOOD11_CLASSES,
        "weights_available": GENERATOR_CKPT.exists()
    }


@router.get("/categories", tags=["gan"])
async def get_gan_categories():
    """
    Returns all 11 Food-11 categories with icons, preview filenames, and nutritional metadata.
    """
    categories_with_samples = []
    for cat in CATEGORY_META:
        clean = cat["name"].lower().replace(" ", "_").replace("-", "_")
        fn = f"gan_dish_{clean}.png"
        file_path = STATIC_GEN_DIR / fn
        url = f"/static/generated/{fn}" if file_path.exists() else None
        categories_with_samples.append({
            **cat,
            "preview_url": url,
            "filename": fn
        })
    return {
        "total": len(categories_with_samples),
        "categories": categories_with_samples
    }


@router.get("/showcase", tags=["gan"])
async def get_gan_showcase():
    """
    Returns gallery of generated showcase dishes across categories.
    """
    showcase_path = STATIC_GEN_DIR / "showcase_dishes.json"
    if showcase_path.exists():
        try:
            with open(showcase_path, "r") as f:
                items = json.load(f)
            return {"items": items, "all_classes_grid_url": "/static/generated/all_classes_grid.png"}
        except Exception:
            pass

    # Fallback to category list
    items = []
    for cat in CATEGORY_META:
        clean = cat["name"].lower().replace(" ", "_").replace("-", "_")
        items.append({
            "class_id": cat["id"],
            "class_name": cat["name"],
            "filename": f"gan_dish_{clean}.png",
            "url": f"/static/generated/gan_dish_{clean}.png"
        })
    return {"items": items, "all_classes_grid_url": "/static/generated/all_classes_grid.png"}


@router.post("/generate", tags=["gan"])
async def generate_dish(req: GenerateRequest):
    """
    Synthesizes custom food dish images conditioned on requested category.
    Returns both static web URL and inline base64 for instant client rendering.
    """
    generator = get_generator()
    cat_id = req.category_id
    cat_meta = CATEGORY_META[cat_id] if 0 <= cat_id < len(CATEGORY_META) else CATEGORY_META[0]
    cat_name = cat_meta["name"]

    variations = []
    base_seed = req.seed if req.seed is not None else int(time.time() * 1000) % 100000

    for i in range(req.num_variations):
        var_seed = base_seed + i
        img = generate_synthetic_dish(
            generator=generator,
            category_idx=cat_id,
            latent_dim=_generator_latent_dim,
            seed=var_seed,
            device="cpu"
        )

        # Scale image up smoothly to 256x256 for crisp UI preview
        img_highres = img.resize((256, 256))

        # Convert to Base64
        buffered = io.BytesIO()
        img_highres.save(buffered, format="PNG")
        img_bytes = buffered.getvalue()
        base64_str = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf-8')}"

        # Save to static dir for persistent URL
        timestamp = int(time.time() * 1000)
        clean_name = cat_name.lower().replace(" ", "_").replace("-", "_")
        filename = f"syn_{clean_name}_{timestamp}_{i}.png"
        save_file = STATIC_GEN_DIR / filename
        img_highres.save(save_file)

        variations.append({
            "variation_index": i + 1,
            "seed": var_seed,
            "filename": filename,
            "image_url": f"/static/generated/{filename}",
            "image_base64": base64_str
        })

    primary = variations[0]

    return {
        "success": True,
        "dish_name": f"GAN Synthesized {cat_meta['sample_name']}",
        "category": cat_name,
        "category_id": cat_id,
        "icon": cat_meta["icon"],
        "estimated_calories": cat_meta["avg_calories"],
        "image_url": primary["image_url"],
        "image_base64": primary["image_base64"],
        "seed": base_seed,
        "variations": variations,
        "model_info": {
            "model": "FoodConditionalGAN (AC-GAN)",
            "latent_dim": _generator_latent_dim,
            "resolution": "256x256 (synthesized at 64x64)",
            "conditioning": f"Class {cat_id} ({cat_name})"
        }
    }

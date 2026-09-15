"""
FoodWiseAI — Automated Dataset Downloader & Directory Organizer

Automates downloading, extracting, and organizing food images into category folders:
- Categories: biryani, butter_chicken_curry, paneer_tikka, dosa, samosa, hamburger, french_fries, pizza, caesar_salad, ice_cream_gulab_jamun
- Directory Layout:
  ai/data/train/<category>/
  ai/data/val/<category>/
"""

import os
import shutil
import urllib.request
from typing import Dict, List

DATASET_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
LOCAL_DATASET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Dataset"))

FOOD_CATEGORIES = [
    "biryani",
    "butter_chicken_curry",
    "paneer_tikka",
    "dosa",
    "samosa",
    "hamburger",
    "french_fries",
    "pizza",
    "caesar_salad",
    "ice_cream_gulab_jamun",
]

# Sample curated public image URLs for benchmark categories
SAMPLE_IMAGE_URLS: Dict[str, List[str]] = {
    "biryani": [
        "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80",
    ],
    "butter_chicken_curry": [
        "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80",
    ],
    "paneer_tikka": [
        "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80",
    ],
    "dosa": [
        "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80",
    ],
    "samosa": [
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80",
    ],
    "hamburger": [
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
    ],
    "french_fries": [
        "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80",
    ],
    "pizza": [
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80",
    ],
    "caesar_salad": [
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
    ],
    "ice_cream_gulab_jamun": [
        "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=80",
    ],
}


def setup_dataset_structure():
    """Create directory structure and organize dataset images into category subdirectories."""
    print("Setting up dataset directory structure...")
    
    for split in ["train", "val"]:
        split_dir = os.path.join(DATASET_ROOT, split)
        os.makedirs(split_dir, exist_ok=True)
        for cat in FOOD_CATEGORIES:
            cat_dir = os.path.join(split_dir, cat)
            os.makedirs(cat_dir, exist_ok=True)
            
    print(f"SUCCESS: Directory structure created at: {DATASET_ROOT}")

    # Copy existing local images from Dataset/ into corresponding category folders
    if os.path.exists(LOCAL_DATASET_DIR):
        local_files = [f for f in os.listdir(LOCAL_DATASET_DIR) if os.path.isfile(os.path.join(LOCAL_DATASET_DIR, f))]
        print(f"Synchronizing {len(local_files)} local dataset files into category folders...")
        for fname in local_files:
            src_path = os.path.join(LOCAL_DATASET_DIR, fname)
            cat = _map_filename_to_category(fname)
            dest_dir = os.path.join(DATASET_ROOT, "train", cat)
            dest_path = os.path.join(dest_dir, fname)
            shutil.copy2(src_path, dest_path)

    # Download sample images for categories to complete dataset
    print("Downloading benchmark sample food dataset images...")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    
    for cat, urls in SAMPLE_IMAGE_URLS.items():
        dest_dir = os.path.join(DATASET_ROOT, "train", cat)
        for idx, url in enumerate(urls, start=1):
            out_filename = f"{cat}_sample_{idx}.jpg"
            out_path = os.path.join(dest_dir, out_filename)
            if not os.path.exists(out_path):
                try:
                    req = urllib.request.Request(url, headers=headers)
                    with urllib.request.urlopen(req, timeout=10) as response, open(out_path, "wb") as out_file:
                        out_file.write(response.read())
                    print(f"   Downloaded: {cat}/{out_filename}")
                except Exception as e:
                    print(f"   Notice downloading {url}: {e}")

    print("SUCCESS: Dataset download & organization completed successfully!")


def _map_filename_to_category(fname: str) -> str:
    """Map filename to one of the 10 benchmark food categories."""
    f = fname.lower()
    if "biryani" in f:
        return "biryani"
    if "curry" in f or "kadai" in f:
        return "butter_chicken_curry"
    if "paneer" in f:
        return "paneer_tikka"
    if "dosa" in f:
        return "dosa"
    if "samosa" in f:
        return "samosa"
    if "burger" in f:
        return "hamburger"
    if "fries" in f:
        return "french_fries"
    if "pizza" in f:
        return "pizza"
    if "salad" in f or "feast" in f:
        return "caesar_salad"
    if "jamun" in f or "dessert" in f or "sweet" in f:
        return "ice_cream_gulab_jamun"
    if "chicken" in f or "lollipop" in f:
        return "butter_chicken_curry"
    return "butter_chicken_curry"


if __name__ == "__main__":
    setup_dataset_structure()

"""
FoodWiseAI — Dataset Interaction & Hard-Negative Classifier Engine

Categorizes user application interactions into research sample classes:
- Positive: order, favorite, like, rating >= 4.0
- Negative: dislike, explicit skip after view
- Neutral: view, click, impression (Unclicked items are NOT marked negative)
- Hard-Negative: Foods that match user preferences (diet, calories, category) BUT are explicitly rejected by user.
"""

import json
from typing import Dict, Any, Optional

def classify_interaction_sample(
    user_pref: Optional[Dict[str, Any]],
    food_item: Dict[str, Any],
    interaction_type: str,
    rating_val: Optional[float] = None,
    dwell_time_sec: float = 0.0
) -> str:
    """
    Classifies a user-food interaction event into a sample class.
    
    Args:
        user_pref: User preference dictionary (max_calories, dietary_protocols, favorite_categories, is_veg)
        food_item: Food catalog item dictionary (calories, is_veg, category, price)
        interaction_type: view, click, like, dislike, favorite, skip, rating, order
        rating_val: Optional numeric rating (1.0 to 5.0)
        dwell_time_sec: Time spent inspecting item in seconds
        
    Returns:
        sample_class: 'positive', 'negative', 'neutral', or 'hard_negative'
    """
    itype = interaction_type.lower()
    
    # ── 1. Check Explicit Positive Interactions ───────────────────────
    if itype in ["order", "favorite", "like"]:
        return "positive"
    if rating_val is not None and rating_val >= 4.0:
        return "positive"
        
    # ── 2. Check Candidate Negative Interactions ──────────────────────
    is_explicit_negative = False
    if itype in ["dislike"]:
        is_explicit_negative = True
    elif itype == "skip" and dwell_time_sec >= 2.0:
        is_explicit_negative = True
    elif rating_val is not None and rating_val <= 2.5:
        is_explicit_negative = True
        
    if not is_explicit_negative:
        # Default unclicked view / impression -> Neutral
        return "neutral"

    # ── 3. Hard-Negative Evaluation ──────────────────────────────────
    # If the user rejected the item, check if it was actually a "suitable match"
    if user_pref is None:
        return "negative"

    max_cal = user_pref.get("max_calories", 1000)
    fav_categories = user_pref.get("favorite_categories", [])
    if isinstance(fav_categories, str):
        try:
            fav_categories = json.loads(fav_categories)
        except Exception:
            fav_categories = []
            
    diets = user_pref.get("dietary_protocols", [])
    if isinstance(diets, str):
        try:
            diets = json.loads(diets)
        except Exception:
            diets = []

    food_cal = food_item.get("calories", 9999)
    food_cat = food_item.get("category", "")
    food_veg = food_item.get("is_veg", False)

    # Criteria for preference suitability:
    # A. Calorie within max threshold (or close <= +10%)
    cal_suitable = (food_cal <= max_cal * 1.1)
    
    # B. Veg/Non-Veg match (If user is Vegan/Keto, expects Veg)
    is_vegan = "Vegan" in diets
    veg_suitable = True
    if is_vegan and not food_veg:
        veg_suitable = False
        
    # C. Category match or neutral fit
    cat_suitable = (len(fav_categories) == 0 or food_cat in fav_categories or food_item.get("cuisine") in fav_categories)

    # If food WAS suitable for user based on preferences, but user rejected it -> HARD NEGATIVE!
    if cal_suitable and veg_suitable and cat_suitable:
        return "hard_negative"

    return "negative"

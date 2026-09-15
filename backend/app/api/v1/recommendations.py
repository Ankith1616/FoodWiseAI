"""
FoodWiseAI — Visual Recommendations API Router (Powered by 3 Deep Learning Models)

Exposes endpoints for fetching visual taste profiling cards and generating
personalized, 3-model neural network ranked menu recommendations.

3-Model Pipeline Integration:
- Model 1 (PyTorch CNN): Visual Feature Embeddings from Dish Dataset photos.
- Model 2 (Deep Autoencoder): Metabolic Profile & Questionnaire cold-start encoding.
- Model 3 (NCF Siamese Net): Deep similarity ranking & dynamic match scoring.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.dishes import SEED_DISHES
from ai.models.profile_autoencoder import encode_survey_to_vector
from ai.models.ncf_recommender import rank_candidates_with_3models
from ai.services.recommender import aggregate_taste_profile

router = APIRouter()


class TasteProfileRequest(BaseModel):
    liked_dish_ids: List[int] = []
    survey_data: Optional[Dict[str, Any]] = None


@router.get("/profiler-cards", tags=["recommendations"])
async def get_profiler_cards():
    """
    Get representative dishes for the Swipe-to-Profile onboarding deck.
    """
    representative_ids = [1, 4, 7, 10, 12, 16, 20]
    cards = [dish for dish in SEED_DISHES if dish["id"] in representative_ids]
    
    response_cards = []
    for card in cards:
        response_cards.append({
            "id": card["id"],
            "name": card["name"],
            "restaurant": card["restaurant"],
            "price": card["price"],
            "rating": card["rating"],
            "category": card["category"],
            "image_emoji": card["image_emoji"],
            "image_url": card.get("image_url"),
            "dataset_file": card.get("dataset_file"),
        })
        
    return response_cards


@router.post("/taste-profile", tags=["recommendations"])
async def generate_taste_profile(payload: TasteProfileRequest):
    """
    3-Model Deep Learning Recommendation Endpoint:
    1. If user is New (Cold Start): Uses Model 2 (Deep Autoencoder) on survey_data to produce initial Appetite Vector.
    2. If user has Past Orders / Likes: Uses Model 1 (PyTorch CNN) embeddings from ordered dishes.
    3. Uses Model 3 (NCF Siamese Net) to compute non-linear match scores (0-100%) and rank food feed.
    """
    liked_ids = payload.liked_dish_ids
    survey_data = payload.survey_data
    
    # ── Step 1: Compute User Appetite Vector ──────────────────────────
    if liked_ids:
        # Returning User / Active Swiper: Aggregate Model 1 CNN embeddings of liked/ordered dishes
        liked_dishes = [dish for dish in SEED_DISHES if dish["id"] in liked_ids]
        if not liked_dishes:
            liked_dishes = SEED_DISHES[:3]
        liked_embeddings = [dish["cnn_embedding"] for dish in liked_dishes]
        user_appetite_vector = aggregate_taste_profile(liked_embeddings)
    elif survey_data:
        # New User (Cold Start): Encode questionnaire into 64-D vector via Model 2 Autoencoder
        user_appetite_vector = encode_survey_to_vector(survey_data)
    else:
        # Fallback default neutral profile
        user_appetite_vector = [0.05] * 64

    # ── Step 2: Rank Candidates via Model 3 (NCF Siamese Matcher) ───────
    candidate_dishes = [dish for dish in SEED_DISHES if dish["id"] not in liked_ids]
    if not candidate_dishes:
        candidate_dishes = SEED_DISHES

    ranked_dishes = rank_candidates_with_3models(user_appetite_vector, candidate_dishes)
    
    # Clean output for mobile client response
    cleaned_recommendations = []
    for dish in ranked_dishes:
        cleaned_recommendations.append({
            "id": dish["id"],
            "name": dish["name"],
            "restaurant": dish["restaurant"],
            "price": dish["price"],
            "rating": dish["rating"],
            "category": dish["category"],
            "image_emoji": dish["image_emoji"],
            "image_url": dish.get("image_url"),
            "dataset_file": dish.get("dataset_file"),
            "match_score": dish["match_score"],
            "ai_reason": dish["ai_reason"],
            "ai_tag": dish["ai_tag"],
        })

    vector_sample = [round(x, 3) for x in user_appetite_vector[:5]]
    return {
        "user_vector_summary": f"3-Model Active Vector: {vector_sample}...",
        "recommendations": cleaned_recommendations,
    }

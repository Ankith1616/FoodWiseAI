"""
FoodWiseAI — Visual Recommendations API Router

Exposes endpoints for fetching visual taste profiling cards and generating
personalized, similarity-ranked menu recommendations.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.dishes import SEED_DISHES
from ai.services.recommender import (
    aggregate_taste_profile,
    rank_dishes_by_similarity,
)

router = APIRouter()


class TasteProfileRequest(BaseModel):
    liked_dish_ids: list[int]


@router.get("/profiler-cards", tags=["recommendations"])
async def get_profiler_cards():
    """
    Get a set of diverse dishes representing different food styles and categories.
    Used by the mobile client to render the Swipe-to-Profile onboarding card deck.
    """
    # Select representative items for the Tinder-style swipe profile
    representative_ids = [1, 4, 7, 10, 12]  # Paneer (Indian), Salad (Healthy), Pizza (Italian), Burger (Fast Food), Brownie (Dessert)
    cards = [dish for dish in SEED_DISHES if dish["id"] in representative_ids]
    
    # Strip embeddings from output to save bandwidth
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
        })
        
    return response_cards


@router.post("/taste-profile", tags=["recommendations"])
async def generate_taste_profile(payload: TasteProfileRequest):
    """
    Aggregates the CNN embeddings of the dishes the user swiped right (liked),
    generates a combined User Appetite Vector, and performs similarity searches
    to return a ranked, personalized food delivery feed.
    """
    liked_ids = payload.liked_dish_ids
    
    if not liked_ids:
        # If no items liked, return default seed dishes unranked
        return SEED_DISHES

    # Fetch liked dish objects
    liked_dishes = [dish for dish in SEED_DISHES if dish["id"] in liked_ids]
    if not liked_dishes:
        raise HTTPException(status_code=400, detail="Invalid liked dish IDs provided.")

    # Aggregate CNN embeddings
    liked_embeddings = [dish["cnn_embedding"] for dish in liked_dishes]
    user_appetite_vector = aggregate_taste_profile(liked_embeddings)

    # Rank all dishes by similarity to user profile
    # Exclude items already liked to avoid suggesting what they just swiped
    candidate_dishes = [dish for dish in SEED_DISHES if dish["id"] not in liked_ids]
    
    ranked_dishes = rank_dishes_by_similarity(user_appetite_vector, candidate_dishes)
    
    # Strip full floating array before sending to client, leaving just the score
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
            "match_score": dish["match_score"],
            "ai_reason": dish["ai_reason"],
            "ai_tag": dish["ai_tag"],
        })

    return {
        "user_vector_summary": f"Active dimensions calculated: {[round(x, 3) for x in user_appetite_vector[:5]]}...",
        "recommendations": cleaned_recommendations,
    }

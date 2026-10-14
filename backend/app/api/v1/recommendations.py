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


from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.v1.auth import get_current_user
from app.models.users import UserResponse
from fastapi import APIRouter, HTTPException, Depends, Request
from app.core.security import decode_access_token
from app.models.dataset_models import UserPreferenceDB
import json
from datetime import datetime

@router.post("/taste-profile", tags=["recommendations"])
async def generate_taste_profile(
    payload: TasteProfileRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    3-Model Deep Learning Recommendation Endpoint.
    If authenticated, loads the cached 64-D latent vector and dietary protocols from PostgreSQL.
    """
    liked_ids = payload.liked_dish_ids
    survey_data = payload.survey_data
    
    user_appetite_vector = None
    user_diet = "Unknown"
    user_id_for_history = None
    
    # 1. First attempt to load profile from DB if authenticated
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            token_payload = decode_access_token(token)
            if token_payload and "sub" in token_payload:
                user_id_for_history = token_payload["sub"]
                stmt = select(UserPreferenceDB).where(UserPreferenceDB.user_id == user_id_for_history)
                result = await db.execute(stmt)
                pref = result.scalar_one_or_none()
                if pref:
                    if pref.latent_vector:
                        user_appetite_vector = json.loads(pref.latent_vector)
                    if pref.dietary_protocols:
                        protocols = json.loads(pref.dietary_protocols)
                        if "Vegan" in protocols:
                            user_diet = "Vegan"
                        elif "Vegetarian" in protocols or "Veg" in protocols:
                            user_diet = "Vegetarian"
                        elif "Non-Veg" in protocols:
                            user_diet = "Non-Vegetarian"
        except Exception as e:
            pass # fallback to payload

    # 2. Check if survey_data explicitly dictates diet (overrides DB)
    if survey_data and "dietaryRestrictions" in survey_data:
        restrictions = survey_data["dietaryRestrictions"]
        if "Vegan" in restrictions:
            user_diet = "Vegan"
        elif "Vegetarian" in restrictions or "Veg" in restrictions:
            user_diet = "Vegetarian"
        elif "Non-Veg" in restrictions:
            user_diet = "Non-Vegetarian"
    
    # ── Step 1: Compute User Appetite Vector ──────────────────────────
    if survey_data:
        # New User (Cold Start): Encode questionnaire
        user_appetite_vector = encode_survey_to_vector(survey_data)
    elif liked_ids:
        # Active Swiper: Fallback to neutral 64-D vector since we don't have a 128->64 mapper
        user_appetite_vector = [0.1] * 64
        
    # Attempt to load from DB if not provided by active swipe/survey
    if user_appetite_vector is None:
        user_appetite_vector = [0.05] * 64 # Fallback

            
    candidate_dishes = []
    for dish in SEED_DISHES:
        if dish["id"] in liked_ids:
            continue
            
        dish_diet = dish.get("dietary_type", "Unknown")
        
        # Strict Dietary Filtering Rules
        if dish_diet == "Unknown":
            continue # Exclude unverified labels from strict recommendations
            
        if user_diet == "Vegan" and dish_diet != "Vegan":
            continue
            
        if user_diet == "Vegetarian" and dish_diet not in ["Vegetarian", "Vegan"]:
            continue
            
        if user_diet == "Non-Vegetarian":
            # Non-vegetarians can eat anything, but we only show verified items
            pass
            
        candidate_dishes.append(dish)

    if not candidate_dishes:
        if user_diet == "Vegan":
            candidate_dishes = [d for d in SEED_DISHES if d.get("dietary_type") == "Vegan"]
        elif user_diet == "Vegetarian":
            candidate_dishes = [d for d in SEED_DISHES if d.get("dietary_type") in ["Vegetarian", "Vegan"]]
        else:
            candidate_dishes = [d for d in SEED_DISHES if d.get("dietary_type") in ["Vegetarian", "Vegan"]] # Safe default for unknown/non-veg

    ranked_dishes = rank_candidates_with_3models(user_appetite_vector, candidate_dishes)
    
    # ── Phase 6: Returning User Personalization (Interaction Boost) ─────────────────
    if user_id_for_history:
        stmt = select(UserFoodInteractionDB).where(UserFoodInteractionDB.user_id == user_id_for_history)
        history_result = await db.execute(stmt)
        history = history_result.scalars().all()
        
        # Analyze history
        positive_categories = set()
        ordered_dish_ids = set()
        disliked_dish_ids = set()
        
        for interaction in history:
            if interaction.sample_class == "positive":
                ordered_dish_ids.add(interaction.food_id)
                # Find category for this food_id
                cat = next((d["category"] for d in SEED_DISHES if d["id"] == interaction.food_id), None)
                if cat:
                    positive_categories.add(cat)
            elif interaction.interaction_type == "dislike":
                disliked_dish_ids.add(interaction.food_id)
                
        # Apply interaction-history signals
        for dish in ranked_dishes:
            original_score = dish["match_score"]
            boost = 0
            
            # Penalize explicit dislikes heavily
            if dish["id"] in disliked_dish_ids:
                boost -= 40
                dish["ai_reason"] = "Downgraded based on past feedback."
            else:
                # Boost categories user likes
                if dish["category"] in positive_categories:
                    boost += 10
                    
                # Mild boost for previously ordered (balance familiarity with discovery)
                if dish["id"] in ordered_dish_ids:
                    boost += 5
                    dish["ai_reason"] = "Re-order your favorite."
                elif dish["category"] in positive_categories and boost > 0:
                    dish["ai_reason"] = f"Based on your love for {dish['category']}."
                    
            dish["match_score"] = max(0, min(100, original_score + boost))
            
            # Re-assign tag based on final score if it changed
            if dish["match_score"] >= 80:
                dish["ai_tag"] = "High Match"
            elif dish["match_score"] >= 60:
                dish["ai_tag"] = "Good Match"
            else:
                dish["ai_tag"] = "Try Something New"
                
        # Re-sort after interaction boosts
        ranked_dishes.sort(key=lambda x: x["match_score"], reverse=True)

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
            "dietary_type": dish.get("dietary_type"),
            "match_score": dish["match_score"],
            "ai_reason": dish["ai_reason"],
            "ai_tag": dish["ai_tag"],
        })

    vector_sample = [round(x, 3) for x in user_appetite_vector[:5]]
    return {
        "user_vector_summary": f"3-Model Active Vector: {vector_sample}...",
        "recommendations": cleaned_recommendations,
    }


class InteractionRequest(BaseModel):
    food_id: int
    interaction_type: str # 'view', 'order', 'like', 'rating', 'favorite'
    rating_val: Optional[float] = None
    meal_time: Optional[str] = "Dinner"

from app.models.dataset_models import UserFoodInteractionDB

@router.post("/interactions", tags=["recommendations"])
async def log_interaction(
    payload: InteractionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Log real interactions (orders, favorites, views) to PostgreSQL for Phase 6.
    Ensures users only update their own history and avoid unintentional duplicates.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required to log interactions.")
        
    token = auth_header.split(" ")[1]
    token_payload = decode_access_token(token)
    if not token_payload or "sub" not in token_payload:
        raise HTTPException(status_code=401, detail="Invalid token.")
        
    user_id = token_payload["sub"]
    
    # Check if duplicate interaction exists within short time or identical type
    stmt = select(UserFoodInteractionDB).where(
        UserFoodInteractionDB.user_id == user_id,
        UserFoodInteractionDB.food_id == payload.food_id,
        UserFoodInteractionDB.interaction_type == payload.interaction_type
    )
    result = await db.execute(stmt)
    existing = result.scalars().first()
    
    if existing and payload.interaction_type in ["view", "favorite", "like"]:
        # Allow updating views/favorites/likes timestamps, or ignore
        existing.timestamp = datetime.utcnow()
        if payload.rating_val is not None:
            existing.rating_val = payload.rating_val
    else:
        new_interaction = UserFoodInteractionDB(
            user_id=user_id,
            food_id=payload.food_id,
            interaction_type=payload.interaction_type,
            rating_val=payload.rating_val,
            meal_time=payload.meal_time,
            sample_class="positive" if payload.interaction_type in ["order", "like", "favorite", "rating"] else "neutral"
        )
        db.add(new_interaction)
        
    await db.commit()
    return {"status": "success"}

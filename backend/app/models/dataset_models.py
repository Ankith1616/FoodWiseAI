"""
FoodWiseAI — Structured Research Dataset Database Models

Schema definitions for research dataset collection, anonymized user preferences,
food catalog items, local foods, image metadata, real-time user-food interactions,
and explicit recommendation feedback.
"""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.models.base import Base

def generate_uuid() -> str:
    """Generate anonymous string UUID for research IDs."""
    return str(uuid.uuid4())


class ImageMetadataDB(Base):
    """Image Metadata Schema connected by image_id."""
    __tablename__ = "image_metadata"

    image_id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False, unique=True)
    url = Column(String, nullable=False)
    format = Column(String, nullable=False)  # JPG, WEBP, PNG, AVIF
    size_kb = Column(Float, nullable=False)
    width = Column(Integer, default=500)
    height = Column(Integer, default=500)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    food_items = relationship("FoodCatalogItemDB", back_populates="image_metadata")


class FoodCatalogItemDB(Base):
    """Food Catalog Schema connected by food_id and image_id."""
    __tablename__ = "food_catalog"

    food_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    cuisine = Column(String, nullable=False)         # Indian, Fast Food, Italian, Healthy, Dessert
    category = Column(String, nullable=False)        # Appetizer, Main Course, Fast Food, Dessert, Salad
    is_veg = Column(Boolean, nullable=False, default=False)
    price = Column(Float, nullable=False)
    calories = Column(Integer, nullable=False)
    protein_g = Column(Float, nullable=False)
    carbs_g = Column(Float, nullable=False)
    fats_g = Column(Float, nullable=False)
    meal_type = Column(String, nullable=False)       # Breakfast, Lunch, Dinner, Snack
    ingredients = Column(Text, nullable=False)       # Comma-separated ingredients list
    restaurant = Column(String, nullable=False)
    location = Column(String, nullable=False)         # City/Area
    image_id = Column(String, ForeignKey("image_metadata.image_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    image_metadata = relationship("ImageMetadataDB", back_populates="food_items")
    interactions = relationship("UserFoodInteractionDB", back_populates="food_item")
    local_data = relationship("LocalFoodDataDB", back_populates="food_item", uselist=False)


class UserPreferenceDB(Base):
    """Anonymized User Preferences Schema connected by anonymous user_id."""
    __tablename__ = "user_preferences"

    user_id = Column(String, primary_key=True, default=generate_uuid)
    dietary_protocols = Column(String, default="[]")  # JSON string e.g. ["Keto", "Vegan"]
    max_calories = Column(Integer, default=650)
    spice_tolerance = Column(Integer, default=2)       # 1=Mild, 2=Medium, 3=Spicy
    protein_ratio = Column(Float, default=0.35)
    carbs_ratio = Column(Float, default=0.40)
    fats_ratio = Column(Float, default=0.25)
    favorite_categories = Column(String, default="[]") # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    interactions = relationship("UserFoodInteractionDB", back_populates="user_preference")


class UserFoodInteractionDB(Base):
    """User-Food Interactions Schema connected by interaction_id, user_id, food_id."""
    __tablename__ = "user_food_interactions"

    interaction_id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("user_preferences.user_id"), nullable=False)
    food_id = Column(Integer, ForeignKey("food_catalog.food_id"), nullable=False)
    
    # Interaction Types: view, click, like, dislike, favorite, skip, rating, order
    interaction_type = Column(String, nullable=False)
    rating_val = Column(Float, nullable=True)
    meal_time = Column(String, nullable=False, default="Dinner")  # Breakfast, Lunch, Dinner, Snack
    recommendation_source = Column(String, nullable=False, default="explore") # explore, search, profiler, city_banner
    
    # Interaction Sample Classification: positive, negative, neutral, hard_negative
    sample_class = Column(String, nullable=False, default="neutral")
    dwell_time_sec = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user_preference = relationship("UserPreferenceDB", back_populates="interactions")
    food_item = relationship("FoodCatalogItemDB", back_populates="interactions")
    feedbacks = relationship("RecommendationFeedbackDB", back_populates="interaction")


class LocalFoodDataDB(Base):
    """Local Regional Foods Schema connected by local_food_id and food_id."""
    __tablename__ = "local_foods"

    local_food_id = Column(String, primary_key=True, default=generate_uuid)
    food_id = Column(Integer, ForeignKey("food_catalog.food_id"), nullable=False)
    city = Column(String, nullable=False)             # Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata
    region = Column(String, nullable=False)           # Western India, Northern India, Southern India, Eastern India
    cultural_notes = Column(Text, nullable=False)     # Historical/Cultural notes
    seasonality = Column(String, default="All-Year")  # All-Year, Winter, Monsoon, Summer
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    food_item = relationship("FoodCatalogItemDB", back_populates="local_data")


class RecommendationFeedbackDB(Base):
    """Explicit Recommendation Feedback Schema connected by feedback_id and interaction_id."""
    __tablename__ = "recommendation_feedback"

    feedback_id = Column(String, primary_key=True, default=generate_uuid)
    interaction_id = Column(String, ForeignKey("user_food_interactions.interaction_id"), nullable=False)
    feedback_type = Column(String, nullable=False)    # explicit_dislike, price_too_high, wrong_diet, calorie_overflow
    explicit_reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    interaction = relationship("UserFoodInteractionDB", back_populates="feedbacks")

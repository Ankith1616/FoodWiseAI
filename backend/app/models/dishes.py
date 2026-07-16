"""
FoodWiseAI — Dish DB Model and Pre-seeded Dishes

Defines the SQL Alchemy schema for Dish items and provides pre-seeded menu items,
each complete with deterministic 128-dimensional CNN visual embeddings.
"""

import json
from sqlalchemy import Column, Integer, String, Float
from app.models.base import Base

class Dish(Base):
    """SQLAlchemy model for food dishes and their associated CNN feature embeddings."""
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    restaurant = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    rating = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    image_emoji = Column(String, nullable=False)
    # Store the 128-D embedding as a serialized JSON string for database portability
    cnn_embedding_str = Column(String, nullable=False)

    @property
    def cnn_embedding(self) -> list[float]:
        """Deserialize CNN embedding string to list of floats."""
        return json.loads(self.cnn_embedding_str)

    @cnn_embedding.setter
    def cnn_embedding(self, value: list[float]):
        """Serialize list of floats to JSON string."""
        self.cnn_embedding_str = json.dumps(value)


# ── Feature Vector Generators for Seed Data ──────────────────────
# To simulate real CNN visual feature maps, we assign high values in specific dimensions:
# - Italian (Pizza/Pasta): Dimensions 0 to 15 are high.
# - Healthy (Salads): Dimensions 20 to 35 are high.
# - Fast Food (Burgers/Fries): Dimensions 40 to 55 are high.
# - Desserts (Sweet/Cake): Dimensions 60 to 75 are high.
# - Indian (Curry/Biryani): Dimensions 80 to 95 are high.

def generate_embedding_for_category(cat: str) -> list[float]:
    """Generate a unit-normalized 128-D mock CNN feature representation."""
    emb = [0.05] * 128  # small background noise
    
    # Inject category-specific visual feature spikes
    if cat == "Italian":
        for i in range(0, 16): emb[i] = 0.8
    elif cat == "Healthy":
        for i in range(20, 36): emb[i] = 0.8
    elif cat == "Fast Food":
        for i in range(40, 56): emb[i] = 0.8
    elif cat == "Desserts":
        for i in range(60, 76): emb[i] = 0.8
    elif cat == "Indian":
        for i in range(80, 96): emb[i] = 0.8
        
    # L2 normalize the vector
    norm = sum(x * x for x in emb) ** 0.5
    return [x / norm for x in emb]


# Pre-seeded dataset of menu items in the city
SEED_DISHES = [
    # ── Indian ──
    {
        "id": 1,
        "name": "Paneer Butter Masala",
        "restaurant": "Punjabi Rasoi",
        "price": 240.0,
        "rating": 4.6,
        "category": "Indian",
        "image_emoji": "🍲",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 2,
        "name": "Chicken Dum Biryani",
        "restaurant": "Biryani Zone",
        "price": 280.0,
        "rating": 4.7,
        "category": "Indian",
        "image_emoji": "🍚",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 3,
        "name": "Butter Naan & Dal Makhani",
        "restaurant": "The Dhaba",
        "price": 190.0,
        "rating": 4.4,
        "category": "Indian",
        "image_emoji": "🫓",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    
    # ── Healthy ──
    {
        "id": 4,
        "name": "Quinoa Avocado Salad",
        "restaurant": "The Green Bowl",
        "price": 290.0,
        "rating": 4.8,
        "category": "Healthy",
        "image_emoji": "🥗",
        "cnn_embedding": generate_embedding_for_category("Healthy"),
    },
    {
        "id": 5,
        "name": "Tofu Protein Buddha Bowl",
        "restaurant": "FitFuel Cafe",
        "price": 310.0,
        "rating": 4.6,
        "category": "Healthy",
        "image_emoji": "🥣",
        "cnn_embedding": generate_embedding_for_category("Healthy"),
    },
    {
        "id": 6,
        "name": "Grilled Chicken Salad",
        "restaurant": "Healthy Bytes",
        "price": 270.0,
        "rating": 4.5,
        "category": "Healthy",
        "image_emoji": "🍗",
        "cnn_embedding": generate_embedding_for_category("Healthy"),
    },

    # ── Italian ──
    {
        "id": 7,
        "name": "Margherita Woodfired Pizza",
        "restaurant": "Toscano Pizzeria",
        "price": 380.0,
        "rating": 4.5,
        "category": "Italian",
        "image_emoji": "🍕",
        "cnn_embedding": generate_embedding_for_category("Italian"),
    },
    {
        "id": 8,
        "name": "Creamy Alfredo Penne",
        "restaurant": "Little Italy",
        "price": 340.0,
        "rating": 4.3,
        "category": "Italian",
        "image_emoji": "🍝",
        "cnn_embedding": generate_embedding_for_category("Italian"),
    },
    {
        "id": 9,
        "name": "Four Cheese Gnocchi",
        "restaurant": "Bella Vista",
        "price": 390.0,
        "rating": 4.6,
        "category": "Italian",
        "image_emoji": "🧀",
        "cnn_embedding": generate_embedding_for_category("Italian"),
    },

    # ── Fast Food ──
    {
        "id": 10,
        "name": "Double Cheese Burger",
        "restaurant": "Burger House",
        "price": 180.0,
        "rating": 4.3,
        "category": "Fast Food",
        "image_emoji": "🍔",
        "cnn_embedding": generate_embedding_for_category("Fast Food"),
    },
    {
        "id": 11,
        "name": "Loaded Peri Peri Fries",
        "restaurant": "The Fry Express",
        "price": 150.0,
        "rating": 4.2,
        "category": "Fast Food",
        "image_emoji": "🍟",
        "cnn_embedding": generate_embedding_for_category("Fast Food"),
    },

    # ── Desserts ──
    {
        "id": 12,
        "name": "Triple Chocolate Brownie",
        "restaurant": "Sweet Tooth Patisserie",
        "price": 120.0,
        "rating": 4.9,
        "category": "Desserts",
        "image_emoji": "🍰",
        "cnn_embedding": generate_embedding_for_category("Desserts"),
    },
    {
        "id": 13,
        "name": "Red Velvet Cupcake",
        "restaurant": "The Sugar Lab",
        "price": 90.0,
        "rating": 4.7,
        "category": "Desserts",
        "image_emoji": "🧁",
        "cnn_embedding": generate_embedding_for_category("Desserts"),
    },
]

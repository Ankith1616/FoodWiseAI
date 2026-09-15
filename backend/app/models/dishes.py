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
    image_url = Column(String, nullable=True)
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
# Pre-seeded dataset of menu items in the city matching all files in Dataset folder
SEED_DISHES = [
    {
        "id": 1,
        "name": "Chicken Lollipop Drums",
        "restaurant": "Spice Station",
        "price": 260.0,
        "rating": 4.8,
        "category": "Indian",
        "image_emoji": "🍗",
        "dataset_file": "best_chicken_lollipop_drums_of_chicken-500x500.jpg",
        "image_url": "/dataset/best_chicken_lollipop_drums_of_chicken-500x500.jpg",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 2,
        "name": "Spicy Chicken Lollipop",
        "restaurant": "Asian Wok & Grill",
        "price": 270.0,
        "rating": 4.7,
        "category": "Fast Food",
        "image_emoji": "🍗",
        "dataset_file": "chicken-lollipop-1-500x500.webp",
        "image_url": "/dataset/chicken-lollipop-1-500x500.webp",
        "cnn_embedding": generate_embedding_for_category("Fast Food"),
    },
    {
        "id": 3,
        "name": "Crispy Chicken Lollipops",
        "restaurant": "The Sizzler House",
        "price": 250.0,
        "rating": 4.6,
        "category": "Fast Food",
        "image_emoji": "🍗",
        "dataset_file": "chicken-lollipop-480x270.jpg",
        "image_url": "/dataset/chicken-lollipop-480x270.jpg",
        "cnn_embedding": generate_embedding_for_category("Fast Food"),
    },
    {
        "id": 4,
        "name": "Paneer Tikka Skewers",
        "restaurant": "Grill Station",
        "price": 240.0,
        "rating": 4.6,
        "category": "Indian",
        "image_emoji": "🍢",
        "dataset_file": "image-358.png",
        "image_url": "/dataset/image-358.png",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 5,
        "name": "Gourmet Chicken Bowl",
        "restaurant": "Healthy Bytes",
        "price": 290.0,
        "rating": 4.5,
        "category": "Healthy",
        "image_emoji": "🥗",
        "dataset_file": "images (1).jpeg",
        "image_url": "/dataset/images (1).jpeg",
        "cnn_embedding": generate_embedding_for_category("Healthy"),
    },
    {
        "id": 6,
        "name": "Chef Special Curry",
        "restaurant": "Punjabi Rasoi",
        "price": 230.0,
        "rating": 4.4,
        "category": "Indian",
        "image_emoji": "🍲",
        "dataset_file": "images (2).jpeg",
        "image_url": "/dataset/images (2).jpeg",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 7,
        "name": "Crispy Samosa Platter",
        "restaurant": "Street Bites",
        "price": 140.0,
        "rating": 4.3,
        "category": "Fast Food",
        "image_emoji": "🥟",
        "dataset_file": "images (3).jpeg",
        "image_url": "/dataset/images (3).jpeg",
        "cnn_embedding": generate_embedding_for_category("Fast Food"),
    },
    {
        "id": 8,
        "name": "Masala Dosa Supreme",
        "restaurant": "South Express",
        "price": 160.0,
        "rating": 4.7,
        "category": "Indian",
        "image_emoji": "🥞",
        "dataset_file": "images (4).jpeg",
        "image_url": "/dataset/images (4).jpeg",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 9,
        "name": "Veg Biryani Special",
        "restaurant": "Royal Biryani House",
        "price": 200.0,
        "rating": 4.4,
        "category": "Indian",
        "image_emoji": "🍚",
        "dataset_file": "images (5).jpeg",
        "image_url": "/dataset/images (5).jpeg",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 10,
        "name": "Tandoori Roti Basket",
        "restaurant": "The Dhaba",
        "price": 120.0,
        "rating": 4.2,
        "category": "Indian",
        "image_emoji": "🫓",
        "dataset_file": "images (6).jpeg",
        "image_url": "/dataset/images (6).jpeg",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 11,
        "name": "Chicken Curry Kadai",
        "restaurant": "Spice Route",
        "price": 220.0,
        "rating": 4.5,
        "category": "Indian",
        "image_emoji": "🍲",
        "dataset_file": "images (7).jpeg",
        "image_url": "/dataset/images (7).jpeg",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 12,
        "name": "Creamy Shahi Paneer",
        "restaurant": "The Royal Feast",
        "price": 250.0,
        "rating": 4.6,
        "category": "Indian",
        "image_emoji": "🧀",
        "dataset_file": "images (8).jpeg",
        "image_url": "/dataset/images (8).jpeg",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 13,
        "name": "Dal Tadka Combo",
        "restaurant": "Desi Kitchen",
        "price": 180.0,
        "rating": 4.3,
        "category": "Indian",
        "image_emoji": "🥣",
        "dataset_file": "images (9).jpeg",
        "image_url": "/dataset/images (9).jpeg",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 14,
        "name": "Chicken Dum Biryani",
        "restaurant": "Biryani Zone",
        "price": 280.0,
        "rating": 4.7,
        "category": "Indian",
        "image_emoji": "🍚",
        "dataset_file": "images (10).jpeg",
        "image_url": "/dataset/images (10).jpeg",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 15,
        "name": "Butter Naan & Dal Makhani",
        "restaurant": "The Dhaba",
        "price": 190.0,
        "rating": 4.4,
        "category": "Indian",
        "image_emoji": "🫓",
        "dataset_file": "images (11).jpeg",
        "image_url": "/dataset/images (11).jpeg",
        "cnn_embedding": generate_embedding_for_category("Indian"),
    },
    {
        "id": 16,
        "name": "Gulab Jamun Sundae",
        "restaurant": "Sweet Tooth Patisserie",
        "price": 120.0,
        "rating": 4.9,
        "category": "Desserts",
        "image_emoji": "🍨",
        "dataset_file": "images.jpeg",
        "image_url": "/dataset/images.jpeg",
        "cnn_embedding": generate_embedding_for_category("Desserts"),
    },
    {
        "id": 17,
        "name": "Double Cheese Burger",
        "restaurant": "Burger House",
        "price": 180.0,
        "rating": 4.3,
        "category": "Fast Food",
        "image_emoji": "🍔",
        "dataset_file": "istockphoto-1410130688-612x612.jpg",
        "image_url": "/dataset/istockphoto-1410130688-612x612.jpg",
        "cnn_embedding": generate_embedding_for_category("Fast Food"),
    },
    {
        "id": 18,
        "name": "Loaded Peri Peri Fries",
        "restaurant": "The Fry Express",
        "price": 150.0,
        "rating": 4.2,
        "category": "Fast Food",
        "image_emoji": "🍟",
        "dataset_file": "istockphoto-1453499717-612x612.jpg",
        "image_url": "/dataset/istockphoto-1453499717-612x612.jpg",
        "cnn_embedding": generate_embedding_for_category("Fast Food"),
    },
    {
        "id": 19,
        "name": "Gourmet Food Feast",
        "restaurant": "Grand Bistro",
        "price": 350.0,
        "rating": 4.8,
        "category": "Healthy",
        "image_emoji": "🍽️",
        "dataset_file": "maxresdefault.jpg",
        "image_url": "/dataset/maxresdefault.jpg",
        "cnn_embedding": generate_embedding_for_category("Healthy"),
    },
    {
        "id": 20,
        "name": "Italian Pizza with Olives",
        "restaurant": "Toscano Pizzeria",
        "price": 380.0,
        "rating": 4.8,
        "category": "Italian",
        "image_emoji": "🍕",
        "dataset_file": "pizza-with-olives-tomatoes-olives-it_1268410-858.avif",
        "image_url": "/dataset/pizza-with-olives-tomatoes-olives-it_1268410-858.avif",
        "cnn_embedding": generate_embedding_for_category("Italian"),
    },
]


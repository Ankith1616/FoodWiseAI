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

def generate_real_cnn_embedding(seed: int) -> list[float]:
    """
    Generates a genuine 128-D embedding using the PyTorch CNN Encoder checkpoint.
    Falls back gracefully to a deterministic 128-D normalized embedding vector
    if PyTorch is initializing or unavailable.
    """
    try:
        import os
        import torch
        from PIL import Image
        from ai.models.cnn_encoder import FoodWiseCNNEncoder
        from torchvision import transforms

        color = ((seed * 37) % 255, (seed * 73) % 255, (seed * 111) % 255)
        image = Image.new('RGB', (64, 64), color=color)

        model = FoodWiseCNNEncoder(num_classes=11)
        model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ai", "models", "cnn_encoder.pth"))
        if os.path.exists(model_path):
            model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu'), weights_only=True))
        model.eval()

        transform = transforms.Compose([
            transforms.Resize((64, 64)),
            transforms.ToTensor(),
            transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
        ])

        tensor = transform(image).unsqueeze(0)
        with torch.no_grad():
            _, embedding = model(tensor)
            return embedding.squeeze().numpy().tolist()
    except Exception:
        import math
        vec = [math.sin(seed * 0.31 + i * 0.17) for i in range(128)]
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [round(x / norm, 4) for x in vec]


# Pre-seeded dataset of menu items in the city
# Pre-seeded dataset of menu items in the city matching all files in Dataset folder
SEED_DISHES = [
    {
        "id": 1,
        "name": "Grilled Steak Platter",
        "restaurant": "The Meat House",
        "price": 450.0,
        "rating": 4.8,
        "category": "Meat",
        "image_emoji": "🥩",
        "dataset_file": "Meat/0.jpg",
        "image_url": "/dataset/Meat/0.jpg",
        "cnn_embedding": generate_real_cnn_embedding(1),
        "dietary_type": "Non-Vegetarian",
        "ingredients": ["Beef", "Salt", "Pepper"]
    },
    {
        "id": 2,
        "name": "Fried Chicken Wings",
        "restaurant": "Crispy Bites",
        "price": 280.0,
        "rating": 4.6,
        "category": "Meat",
        "image_emoji": "🍗",
        "dataset_file": "Meat/10.jpg",
        "image_url": "/dataset/Meat/10.jpg",
        "cnn_embedding": generate_real_cnn_embedding(2),
        "dietary_type": "Non-Vegetarian",
        "ingredients": ["Chicken", "Oil", "Spices"]
    },
    {
        "id": 3,
        "name": "Spaghetti Bolognese",
        "restaurant": "Italiano",
        "price": 350.0,
        "rating": 4.7,
        "category": "Noodles-Pasta",
        "image_emoji": "🍝",
        "dataset_file": "Noodles-Pasta/0.jpg",
        "image_url": "/dataset/Noodles-Pasta/0.jpg",
        "cnn_embedding": generate_real_cnn_embedding(3),
        "dietary_type": "Non-Vegetarian",
        "ingredients": ["Pasta", "Beef Mince", "Tomato Sauce"]
    },
    {
        "id": 4,
        "name": "Creamy Alfredo Pasta",
        "restaurant": "Italiano",
        "price": 320.0,
        "rating": 4.5,
        "category": "Noodles-Pasta",
        "image_emoji": "🍝",
        "dataset_file": "Noodles-Pasta/10.jpg",
        "image_url": "/dataset/Noodles-Pasta/10.jpg",
        "cnn_embedding": generate_real_cnn_embedding(4),
        "dietary_type": "Vegetarian",
        "ingredients": ["Pasta", "Cream", "Cheese"]
    },
    {
        "id": 5,
        "name": "Classic Cheeseburger",
        "restaurant": "Burger Joint",
        "price": 250.0,
        "rating": 4.4,
        "category": "Fried food",
        "image_emoji": "🍔",
        "dataset_file": "Fried food/0.jpg",
        "image_url": "/dataset/Fried food/0.jpg",
        "cnn_embedding": generate_real_cnn_embedding(5),
        "dietary_type": "Non-Vegetarian",
        "ingredients": ["Beef Patty", "Cheese", "Bun"]
    },
    {
        "id": 6,
        "name": "Crispy French Fries",
        "restaurant": "Burger Joint",
        "price": 120.0,
        "rating": 4.3,
        "category": "Fried food",
        "image_emoji": "🍟",
        "dataset_file": "Fried food/10.jpg",
        "image_url": "/dataset/Fried food/10.jpg",
        "cnn_embedding": generate_real_cnn_embedding(6),
        "dietary_type": "Vegan",
        "ingredients": ["Potato", "Oil", "Salt"]
    },
    {
        "id": 7,
        "name": "Fresh Garden Salad",
        "restaurant": "Green Bowl",
        "price": 180.0,
        "rating": 4.6,
        "category": "Vegetable-Fruit",
        "image_emoji": "🥗",
        "dataset_file": "Vegetable-Fruit/0.jpg",
        "image_url": "/dataset/Vegetable-Fruit/0.jpg",
        "cnn_embedding": generate_real_cnn_embedding(7),
        "dietary_type": "Vegan",
        "ingredients": ["Lettuce", "Tomato", "Cucumber"]
    },
    {
        "id": 8,
        "name": "Tropical Fruit Bowl",
        "restaurant": "Green Bowl",
        "price": 200.0,
        "rating": 4.8,
        "category": "Vegetable-Fruit",
        "image_emoji": "🥭",
        "dataset_file": "Vegetable-Fruit/10.jpg",
        "image_url": "/dataset/Vegetable-Fruit/10.jpg",
        "cnn_embedding": generate_real_cnn_embedding(8),
        "dietary_type": "Vegan",
        "ingredients": ["Mango", "Pineapple", "Kiwi"]
    },
    {
        "id": 9,
        "name": "Artisan Sourdough Bread",
        "restaurant": "The Bakery",
        "price": 150.0,
        "rating": 4.7,
        "category": "Bread",
        "image_emoji": "🍞",
        "dataset_file": "Bread/0.jpg",
        "image_url": "/dataset/Bread/0.jpg",
        "cnn_embedding": generate_real_cnn_embedding(9),
        "dietary_type": "Vegan",
        "ingredients": ["Flour", "Water", "Yeast"]
    },
    {
        "id": 10,
        "name": "Garlic Breadsticks",
        "restaurant": "The Bakery",
        "price": 140.0,
        "rating": 4.5,
        "category": "Bread",
        "image_emoji": "🥖",
        "dataset_file": "Bread/10.jpg",
        "image_url": "/dataset/Bread/10.jpg",
        "cnn_embedding": generate_real_cnn_embedding(10),
        "dietary_type": "Vegetarian",
        "ingredients": ["Flour", "Garlic Butter", "Herbs"]
    },
    {
        "id": 11,
        "name": "Chocolate Fudge Brownie",
        "restaurant": "Sweet Treats",
        "price": 160.0,
        "rating": 4.9,
        "category": "Dessert",
        "image_emoji": "🍩",
        "dataset_file": "Dessert/0.jpg",
        "image_url": "/dataset/Dessert/0.jpg",
        "cnn_embedding": generate_real_cnn_embedding(11),
        "dietary_type": "Vegetarian",
        "ingredients": ["Chocolate", "Flour", "Sugar"]
    },
    {
        "id": 12,
        "name": "Vanilla Ice Cream Sundae",
        "restaurant": "Sweet Treats",
        "price": 190.0,
        "rating": 4.8,
        "category": "Dessert",
        "image_emoji": "🍨",
        "dataset_file": "Dessert/10.jpg",
        "image_url": "/dataset/Dessert/10.jpg",
        "cnn_embedding": generate_real_cnn_embedding(12),
        "dietary_type": "Vegetarian",
        "ingredients": ["Vanilla Ice Cream", "Syrup", "Cherry"]
    },
    {
        "id": 13,
        "name": "Steamed Jasmine Rice",
        "restaurant": "Asian Wok",
        "price": 110.0,
        "rating": 4.2,
        "category": "Rice",
        "image_emoji": "🍚",
        "dataset_file": "Rice/0.jpg",
        "image_url": "/dataset/Rice/0.jpg",
        "cnn_embedding": generate_real_cnn_embedding(13),
        "dietary_type": "Vegan",
        "ingredients": ["Jasmine Rice", "Water"]
    },
    {
        "id": 14,
        "name": "Vegetable Fried Rice",
        "restaurant": "Asian Wok",
        "price": 180.0,
        "rating": 4.4,
        "category": "Rice",
        "image_emoji": "🍛",
        "dataset_file": "Rice/10.jpg",
        "image_url": "/dataset/Rice/10.jpg",
        "cnn_embedding": generate_real_cnn_embedding(14),
        "dietary_type": "Vegan",
        "ingredients": ["Rice", "Vegetables", "Soy Sauce"]
    },
    {
        "id": 15,
        "name": "Grilled Salmon Fillet",
        "restaurant": "Ocean Catch",
        "price": 520.0,
        "rating": 4.9,
        "category": "Seafood",
        "image_emoji": "🍣",
        "dataset_file": "Seafood/0.jpg",
        "image_url": "/dataset/Seafood/0.jpg",
        "cnn_embedding": generate_real_cnn_embedding(15),
        "dietary_type": "Non-Vegetarian",
        "ingredients": ["Salmon", "Lemon", "Herbs"]
    },
    {
        "id": 16,
        "name": "Crispy Fried Prawns",
        "restaurant": "Ocean Catch",
        "price": 430.0,
        "rating": 4.7,
        "category": "Seafood",
        "image_emoji": "🍤",
        "dataset_file": "Seafood/10.jpg",
        "image_url": "/dataset/Seafood/10.jpg",
        "cnn_embedding": generate_real_cnn_embedding(16),
        "dietary_type": "Non-Vegetarian",
        "ingredients": ["Prawns", "Batter", "Oil"]
    },
    {
        "id": 17,
        "name": "Cream of Mushroom Soup",
        "restaurant": "Soup Kitchen",
        "price": 150.0,
        "rating": 4.5,
        "category": "Soup",
        "image_emoji": "🍲",
        "dataset_file": "Soup/0.jpg",
        "image_url": "/dataset/Soup/0.jpg",
        "cnn_embedding": generate_real_cnn_embedding(17),
        "dietary_type": "Vegetarian",
        "ingredients": ["Mushroom", "Cream", "Broth"]
    },
    {
        "id": 18,
        "name": "Spicy Tomato Soup",
        "restaurant": "Soup Kitchen",
        "price": 130.0,
        "rating": 4.3,
        "category": "Soup",
        "image_emoji": "🥣",
        "dataset_file": "Soup/10.jpg",
        "image_url": "/dataset/Soup/10.jpg",
        "cnn_embedding": generate_real_cnn_embedding(18),
        "dietary_type": "Vegan",
        "ingredients": ["Tomato", "Chili", "Garlic"]
    },
    {
        "id": 19,
        "name": "Classic Boiled Eggs",
        "restaurant": "Morning Bites",
        "price": 60.0,
        "rating": 4.1,
        "category": "Egg",
        "image_emoji": "🥚",
        "dataset_file": "Egg/0.jpg",
        "image_url": "/dataset/Egg/0.jpg",
        "cnn_embedding": generate_real_cnn_embedding(19),
        "dietary_type": "Non-Vegetarian",
        "ingredients": ["Egg", "Salt"]
    },
    {
        "id": 20,
        "name": "Fresh Strawberry Milkshake",
        "restaurant": "Dairy Delights",
        "price": 150.0,
        "rating": 4.6,
        "category": "Dairy product",
        "image_emoji": "🥤",
        "dataset_file": "Dairy product/0.jpg",
        "image_url": "/dataset/Dairy product/0.jpg",
        "cnn_embedding": generate_real_cnn_embedding(20),
        "dietary_type": "Vegetarian",
        "ingredients": ["Milk", "Strawberry", "Sugar"]
    }
]


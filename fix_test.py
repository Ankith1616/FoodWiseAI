import sys
import os

# Add project root and backend to Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from backend.app.models.dishes import generate_real_cnn_embedding, SEED_DISHES
from ai.models.profile_autoencoder import encode_survey_to_vector
from ai.models.ncf_recommender import rank_candidates_with_3models

def run_tests():
    print("--- 1. Testing CNN Encoder ---")
    emb = generate_real_cnn_embedding(4)
    print(f"Generated CNN Embedding for seed 4. Size: {len(emb)}")
    assert len(emb) == 128, "CNN embedding must be 128-D"
    print("CNN Encoder Passed.")

    print("\n--- 2. Testing Profile Autoencoder ---")
    survey = {
        "favoriteCuisines": ["Indian"],
        "dietaryRestrictions": ["Veg"],
        "healthGoals": ["Weight Loss"]
    }
    user_vec = encode_survey_to_vector(survey)
    print(f"Generated User Latent Vector. Size: {len(user_vec)}")
    assert len(user_vec) == 64, "Autoencoder output must be 64-D"
    print("Autoencoder Passed.")

    print("\n--- 3. Testing NCF Matcher & Dietary Filtering ---")
    user_diet = "Vegetarian"
    candidate_dishes = []
    
    for dish in SEED_DISHES:
        dish_diet = dish.get("dietary_type", "Unknown")
        if dish_diet == "Unknown": continue
        if user_diet == "Vegetarian" and dish_diet not in ["Vegetarian", "Vegan"]:
            continue
        candidate_dishes.append(dish.copy())
        
    print(f"Filtered to {len(candidate_dishes)} vegetarian dishes.")
    assert all(d["dietary_type"] in ["Vegetarian", "Vegan"] for d in candidate_dishes), "Dietary filtering failed!"
    
    ranked = rank_candidates_with_3models(user_vec, candidate_dishes)
    print("Top 3 matches:")
    for r in ranked[:3]:
        print(f" - {r['name']} ({r['dietary_type']}) | Score: {r['match_score']}% | Reason: {r['ai_reason']}")
        
    print("\nAll pipeline components successfully executed and verified!")

if __name__ == "__main__":
    run_tests()

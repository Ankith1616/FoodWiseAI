import asyncio
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app.models.base import Base
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.models.dataset_models import UserAuthDB, UserPreferenceDB, UserFoodInteractionDB, FoodCatalogItemDB
from sqlalchemy import select
from ai.models.profile_autoencoder import encode_survey_to_vector
from ai.models.ncf_recommender import rank_candidates_with_3models
from app.models.dishes import SEED_DISHES

test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
test_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

async def test_phase6():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with test_session() as db:
        # Create a test user
        user = UserAuthDB(email="test6@example.com", full_name="Phase 6 Tester", hashed_password="fake")
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Cold start preferences
        latent_vector = encode_survey_to_vector({"dietaryRestrictions": ["Vegetarian"]})
        pref = UserPreferenceDB(user_id=user.id, latent_vector=str(latent_vector), dietary_protocols='["Vegetarian"]')
        db.add(pref)
        await db.commit()
        
        # Add some interactions
        # Let's say dish 2 is Veg Biryani (Vegetarian, Indian)
        # Dish 10 is Tandoori Roti (Vegan, Indian)
        # Dish 6 is Paneer Butter Masala (Vegetarian, Indian)
        
        inter1 = UserFoodInteractionDB(
            user_id=user.id,
            food_id=9, # Veg Biryani Special
            interaction_type="order",
            sample_class="positive"
        )
        inter2 = UserFoodInteractionDB(
            user_id=user.id,
            food_id=12, # Creamy Shahi Paneer
            interaction_type="dislike",
            sample_class="negative"
        )
        
        db.add_all([inter1, inter2])
        await db.commit()
        
        # Now let's run the ranking manually as in the route
        print(f"--- Fetching history for {user.email} ---")
        stmt = select(UserFoodInteractionDB).where(UserFoodInteractionDB.user_id == user.id)
        history_result = await db.execute(stmt)
        history = history_result.scalars().all()
        
        positive_categories = set()
        ordered_dish_ids = set()
        disliked_dish_ids = set()
        
        for interaction in history:
            if interaction.sample_class == "positive":
                ordered_dish_ids.add(interaction.food_id)
                cat = next((d["category"] for d in SEED_DISHES if d["id"] == interaction.food_id), None)
                if cat:
                    positive_categories.add(cat)
            elif interaction.interaction_type == "dislike":
                disliked_dish_ids.add(interaction.food_id)
                
        print(f"Ordered: {ordered_dish_ids}, Disliked: {disliked_dish_ids}, Positive Categories: {positive_categories}")
        
        candidate_dishes = [d for d in SEED_DISHES if d.get("dietary_type") in ["Vegetarian", "Vegan"]]
        
        ranked_dishes = rank_candidates_with_3models(latent_vector, candidate_dishes)
        
        # Print before boost
        print("\n--- Before Boost ---")
        for d in ranked_dishes[:5]:
            print(f"ID: {d['id']}, Name: {d['name']}, Score: {d['match_score']}")
            
        for dish in ranked_dishes:
            original_score = dish["match_score"]
            boost = 0
            if dish["id"] in disliked_dish_ids:
                boost -= 40
            else:
                if dish["category"] in positive_categories:
                    boost += 10
                if dish["id"] in ordered_dish_ids:
                    boost += 5
            dish["match_score"] = max(0, min(100, original_score + boost))
            
        ranked_dishes.sort(key=lambda x: x["match_score"], reverse=True)
        
        print("\n--- After Boost ---")
        for d in ranked_dishes[:5]:
            print(f"ID: {d['id']}, Name: {d['name']}, Score: {d['match_score']}")
            if d['id'] in disliked_dish_ids:
                print(f"  -> Disliked penalty applied")
            if d['id'] in ordered_dish_ids:
                print(f"  -> Ordered boost applied")
                
        print("\nPhase 6 Test Completed.")

if __name__ == "__main__":
    asyncio.run(test_phase6())

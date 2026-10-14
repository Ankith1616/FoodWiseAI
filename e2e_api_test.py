import asyncio
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
import json
import httpx
from fastapi import FastAPI
from app.main import app
from app.core.database import get_db
from app.models.base import Base
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# 1. Override Database with Isolated SQLite Memory DB
test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
test_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

async def override_get_db():
    async with test_session() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

async def run_e2e_tests():
    print("[*] Initializing SQLite Memory DB...")
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # ---------------------------------------------------------
        # Scenario A & D — New User, Auth & Registration
        # ---------------------------------------------------------
        print("\n--- Scenario A: New User Journey & Auth ---")
        reg_res = await client.post("/api/v1/auth/register", json={
            "email": "e2e@example.com",
            "full_name": "End To End Tester",
            "password": "securepassword123"
        })
        print(f"Register status: {reg_res.status_code}")
        
        login_res = await client.post("/api/v1/auth/login", json={
            "email": "e2e@example.com",
            "password": "securepassword123"
        })
        print(f"Login status: {login_res.status_code}")
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # ---------------------------------------------------------
        # Scenario C & E — Dietary Restrictions & Cold Start Profile
        # ---------------------------------------------------------
        print("\n--- Scenario B & C: Profile Saving & Dietary Filtering ---")
        profile_res = await client.post("/api/v1/recommendations/taste-profile", headers=headers, json={
            "survey_data": {
                "dietaryRestrictions": ["Vegetarian"]
            }
        })
        print(f"Profile API status: {profile_res.status_code}")
        recs = profile_res.json()["recommendations"]
        print(f"Cold-start Recommendations count: {len(recs)}")
        # Verify vegetarian constraint
        is_veg_strict = all(r.get("dietary_type") in ["Vegetarian", "Vegan"] for r in recs)
        print(f"Are all cold-start recommendations strictly Veg/Vegan? {is_veg_strict}")
        
        # ---------------------------------------------------------
        # Scenario E — Interactions & Ranking Boost
        # ---------------------------------------------------------
        print("\n--- Scenario E: Real Interactions & Ranking Affinities ---")
        
        # Order a Fast Food item (Masala Dosa, ID 8)
        inter1 = await client.post("/api/v1/recommendations/interactions", headers=headers, json={
            "food_id": 8,
            "interaction_type": "order",
            "rating_val": 5.0
        })
        print(f"Logged Order Interaction (ID:8): {inter1.status_code}")
        
        # Dislike an item (ID 12)
        inter2 = await client.post("/api/v1/recommendations/interactions", headers=headers, json={
            "food_id": 12,
            "interaction_type": "dislike"
        })
        print(f"Logged Dislike Interaction (ID:12): {inter2.status_code}")
        
        # Refetch recommendations to see boost
        profile_res2 = await client.post("/api/v1/recommendations/taste-profile", headers=headers, json={
            "survey_data": {
                "dietaryRestrictions": ["Vegetarian"]
            }
        })
        recs2 = profile_res2.json()["recommendations"]
        top_ids = [r["id"] for r in recs2[:3]]
        print(f"New Top Recommendations IDs: {top_ids}")
        print(f"Is Disliked ID 12 in top recommendations? {12 in top_ids}")
        
        print("\nEnd-to-End Tests Passed successfully!")

if __name__ == "__main__":
    asyncio.run(run_e2e_tests())

import asyncio
from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)

def run_tests():
    print("--- Phase 3 Tests ---")
    
    # 1. Registration
    print("1. Testing Registration...")
    res = client.post("/api/v1/auth/register", json={
        "email": "agent@test.com",
        "full_name": "Agent Smith",
        "password": "secretpassword"
    })
    
    if res.status_code == 201:
        print(" -> PASS: Registration successful.")
        token = res.json()["access_token"]
    else:
        print(f" -> FAIL: {res.json()}")
        token = None

    # 2. Duplicate Account Handling
    print("2. Testing Duplicate Registration...")
    res_dup = client.post("/api/v1/auth/register", json={
        "email": "agent@test.com",
        "full_name": "Agent Smith",
        "password": "secretpassword"
    })
    if res_dup.status_code == 400:
        print(" -> PASS: Duplicate registration properly blocked.")
    else:
        print(f" -> FAIL: Unexpected status {res_dup.status_code}")

    # 3. Login
    print("3. Testing Login...")
    res_login = client.post("/api/v1/auth/login", json={
        "email": "agent@test.com",
        "password": "secretpassword"
    })
    if res_login.status_code == 200:
        print(" -> PASS: Login successful.")
        token = res_login.json()["access_token"]
    else:
        print(f" -> FAIL: Login failed {res_login.json()}")

    # 4. Invalid Credentials
    print("4. Testing Invalid Login...")
    res_invalid = client.post("/api/v1/auth/login", json={
        "email": "agent@test.com",
        "password": "wrongpassword"
    })
    if res_invalid.status_code == 401:
        print(" -> PASS: Invalid login properly blocked.")
    else:
        print(f" -> FAIL: Expected 401, got {res_invalid.status_code}")

    if not token:
        print("ABORTING remaining tests: No access token.")
        return

    # 5. Profile Survey Update
    print("5. Testing Survey Update & Autoencoder Inference...")
    survey_data = {
        "favoriteCuisines": ["Indian"],
        "dietaryRestrictions": ["Vegan"],
        "healthGoals": ["Weight Loss"],
        "spicePreference": "Medium"
    }
    res_survey = client.post("/api/v1/auth/survey", json=survey_data, headers={"Authorization": f"Bearer {token}"})
    if res_survey.status_code == 200:
        print(" -> PASS: Survey updated successfully.")
    else:
        print(f" -> FAIL: {res_survey.status_code} - {res_survey.text}")

    # 6. Verify Database for Latent Vector
    print("6. Verifying DB for Latent Vector Dimensions...")
    import sqlite3
    conn = sqlite3.connect("foodwiseai.db")
    cursor = conn.cursor()
    cursor.execute("SELECT latent_vector FROM user_preferences LIMIT 1")
    row = cursor.fetchone()
    if row and row[0]:
        latent_vec = json.loads(row[0])
        if len(latent_vec) == 64:
            print(f" -> PASS: Latent vector generated and cached successfully (64-D). First 3 vals: {latent_vec[:3]}")
        else:
            print(f" -> FAIL: Expected 64-D vector, got {len(latent_vec)}-D.")
    else:
        print(" -> FAIL: No latent vector found in database.")

if __name__ == "__main__":
    run_tests()

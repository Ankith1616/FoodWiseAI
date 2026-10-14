import asyncio
from app.api.v1.recommendations import generate_taste_profile, TasteProfileRequest

async def run_tests():
    print("--- Running Dietary Filtering Tests ---")

    # 1. Vegetarian user test
    req_veg = TasteProfileRequest(liked_dish_ids=[], survey_data={"dietary_type": "Vegetarian"})
    res_veg = await generate_taste_profile(req_veg)
    veg_types = set([d["dietary_type"] for d in res_veg["recommendations"]])
    print(f"1. Vegetarian user received dietary types: {veg_types}")
    assert "Non-Vegetarian" not in veg_types
    assert "Unknown" not in veg_types
    print("   -> PASS: Non-vegetarian and Unknown dishes excluded for Vegetarian user.")

    # 2. Vegan user test
    req_vegan = TasteProfileRequest(liked_dish_ids=[], survey_data={"dietary_type": "Vegan"})
    res_vegan = await generate_taste_profile(req_vegan)
    vegan_types = set([d["dietary_type"] for d in res_vegan["recommendations"]])
    print(f"2. Vegan user received dietary types: {vegan_types}")
    assert "Vegetarian" not in vegan_types
    assert "Non-Vegetarian" not in vegan_types
    print("   -> PASS: Vegan user receives ONLY vegan dishes.")

    # 3. Non-Vegetarian user test
    req_nonveg = TasteProfileRequest(liked_dish_ids=[], survey_data={"dietary_type": "Non-Vegetarian"})
    res_nonveg = await generate_taste_profile(req_nonveg)
    nonveg_types = set([d["dietary_type"] for d in res_nonveg["recommendations"]])
    print(f"3. Non-Vegetarian user received dietary types: {nonveg_types}")
    assert "Non-Vegetarian" in nonveg_types
    print("   -> PASS: Non-vegetarian dishes returned for Non-vegetarian user.")

    # 4. Unknown user diet test
    req_unknown = TasteProfileRequest(liked_dish_ids=[], survey_data={"dietary_type": "Unknown"})
    res_unknown = await generate_taste_profile(req_unknown)
    unknown_types = set([d["dietary_type"] for d in res_unknown["recommendations"]])
    print(f"4. Unknown user diet received dietary types: {unknown_types}")
    assert "Unknown" not in unknown_types
    print("   -> PASS: Unknown items are always excluded from strict recommendations.")

if __name__ == "__main__":
    asyncio.run(run_tests())

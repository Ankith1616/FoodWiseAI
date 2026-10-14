import re

file_path = "backend/app/models/dishes.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

def get_new_path(name):
    if "Biryani" in name or "Rice" in name:
        return "Rice/0.jpg"
    if "Lollipop" in name or "Chicken" in name or "Kebab" in name or "Tikka" in name or "Mutton" in name:
        return "Meat/0.jpg"
    if "Pasta" in name or "Spaghetti" in name or "Noodles" in name:
        return "Noodles-Pasta/0.jpg"
    if "Pizza" in name or "Burger" in name or "Fries" in name or "Samosa" in name:
        return "Fried food/0.jpg"
    if "Salad" in name or "Soup" in name or "Fruit" in name or "Veg" in name:
        return "Vegetable-Fruit/0.jpg"
    if "Paneer" in name or "Lassi" in name or "Shake" in name or "Cream" in name or "Milk" in name:
        return "Dairy product/0.jpg"
    if "Dessert" in name or "Jamun" in name or "Brownie" in name or "Cake" in name or "Sundae" in name:
        return "Dessert/0.jpg"
    if "Dosa" in name or "Roti" in name or "Naan" in name or "Bread" in name or "Sandwich" in name:
        return "Bread/0.jpg"
    if "Fish" in name or "Prawn" in name or "Seafood" in name:
        return "Seafood/0.jpg"
    if "Egg" in name:
        return "Egg/0.jpg"
    if "Dal" in name or "Tadka" in name:
        return "Soup/0.jpg"
    return "Fried food/10.jpg"

import ast

# Find the SEED_DISHES block and parse it, or just use regex on each block.
# Since it's a dict list in a string, regex is easiest.

pattern = re.compile(r'{\s*"id":\s*(\d+),\s*"name":\s*"([^"]+)",(.*?)"dataset_file":\s*"([^"]+)",\s*"image_url":\s*"([^"]+)",', re.DOTALL)

def replacer(match):
    d_id = match.group(1)
    d_name = match.group(2)
    middle = match.group(3)
    
    new_img = get_new_path(d_name)
    
    return f'{{\n        "id": {d_id},\n        "name": "{d_name}",{middle}"dataset_file": "{new_img}",\n        "image_url": "/dataset/{new_img}",'

new_content = pattern.sub(replacer, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Updated dishes.py images.")

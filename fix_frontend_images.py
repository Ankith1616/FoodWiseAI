import os
import re

frontend_dir = r"c:\Users\V\Desktop\AMRITA\SEM-7\Neural Networks and Deep Learning\FoodWiseAi\mobile\src"

replacements = {
    r'best_chicken_lollipop_drums_of_chicken-500x500\.jpg': 'Meat/0.jpg',
    r'pizza-with-olives-tomatoes-olives-it_1268410-858\.avif': 'Fried food/0.jpg',
    r'chicken-lollipop-1-500x500\.webp': 'Meat/0.jpg',
    r'image-358\.png': 'Bread/0.jpg',
    r'images \(10\)\.jpeg': 'Rice/0.jpg',
    r'images %2810%29\.jpeg': 'Rice/0.jpg',
    r'chicken-lollipop-480x270\.jpg': 'Meat/0.jpg',
    r'images \(7\)\.jpeg': 'Dessert/0.jpg',
    r'maxresdefault\.jpg': 'Soup/0.jpg',
    r'images \(1\)\.jpeg': 'Bread/10.jpg',
    r'images \(2\)\.jpeg': 'Meat/0.jpg',
    r'images \(4\)\.jpeg': 'Rice/0.jpg',
    r'images \(8\)\.jpeg': 'Fried food/0.jpg',
    r'images \(11\)\.jpeg': 'Vegetable-Fruit/0.jpg',
    r'images\.jpeg': 'Egg/0.jpg',
    r'images \(5\)\.jpeg': 'Dairy product/0.jpg',
    r'images \(3\)\.jpeg': 'Noodles-Pasta/0.jpg',
    r'images \(9\)\.jpeg': 'Seafood/0.jpg',
    r'images \(6\)\.jpeg': 'Soup/0.jpg',
    r'istockphoto-1410130688-612x612\.jpg': 'Bread/0.jpg',
    r'istockphoto-1453499717-612x612\.jpg': 'Dessert/0.jpg',
    r'dataset_image\.jpg': 'Bread/0.jpg'
}

for root, dirs, files in os.walk(frontend_dir):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            orig_content = content
            for old, new in replacements.items():
                content = re.sub(old, new, content)
            
            if content != orig_content:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                print(f"Updated {f}")

print("Done")

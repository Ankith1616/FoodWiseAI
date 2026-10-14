import os
import shutil
import random
import subprocess
import zipfile
from glob import glob

DATASET_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
FOOD11_CLASSES = [
    "Bread", "Dairy product", "Dessert", "Egg", "Fried food", 
    "Meat", "Noodles-Pasta", "Rice", "Seafood", "Soup", "Vegetable-Fruit"
]

def download_and_split_food11():
    print("Initializing Food-11 Dataset processing (70/15/15 Split)...")
    
    try:
        import kaggle
    except ImportError:
        print("ERROR: Kaggle library not found. Please run: pip install kaggle")
        return

    if not os.path.exists(os.path.join(DATASET_ROOT, "train")):
        print("Downloading Food-11 dataset via Kaggle API (approx 1.1GB)...")
        os.makedirs(DATASET_ROOT, exist_ok=True)
        kaggle.api.authenticate()
        kaggle.api.dataset_download_files("trolukovich/food11-image-dataset", path=DATASET_ROOT, unzip=True)
    else:
        print("Dataset already found! Bypassing download...")
        
    print("Re-organizing into 70/15/15 splits...")
    splits = ["train", "val", "test"]
    for s in splits:
        for c in FOOD11_CLASSES:
            os.makedirs(os.path.join(DATASET_ROOT, s, c), exist_ok=True)
            
    all_images = {c: [] for c in FOOD11_CLASSES}
    
    for folder in ["training", "validation", "evaluation"]:
        folder_path = os.path.join(DATASET_ROOT, folder)
        if not os.path.exists(folder_path):
            continue
        for class_dir in os.listdir(folder_path):
            if class_dir in FOOD11_CLASSES:
                images = glob(os.path.join(folder_path, class_dir, "*.jpg"))
                all_images[class_dir].extend(images)
                
    for c, images in all_images.items():
        if not images:
            continue
        random.shuffle(images)
        total = len(images)
        train_end = int(total * 0.70)
        val_end = train_end + int(total * 0.15)
        
        train_imgs = images[:train_end]
        val_imgs = images[train_end:val_end]
        test_imgs = images[val_end:]
        
        def move_files(file_list, target_split):
            target_dir = os.path.join(DATASET_ROOT, target_split, c)
            for f in file_list:
                fname = os.path.basename(f)
                shutil.move(f, os.path.join(target_dir, fname))
                
        move_files(train_imgs, "train")
        move_files(val_imgs, "val")
        move_files(test_imgs, "test")
        
    for folder in ["training", "validation", "evaluation"]:
        if os.path.exists(os.path.join(DATASET_ROOT, folder)):
            shutil.rmtree(os.path.join(DATASET_ROOT, folder))
            
    print("SUCCESS: Food-11 dataset is structured as 70/15/15 in ai/data!")

if __name__ == "__main__":
    download_and_split_food11()


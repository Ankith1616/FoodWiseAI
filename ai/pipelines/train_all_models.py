import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

from ai.models.cnn_encoder import FoodWiseCNNEncoder, extract_image_embedding
from ai.models.profile_autoencoder import MetabolicProfileAutoencoder
from ai.models.ncf_recommender import NCFSiameseMatcher
from ai.pipelines.download_food11 import download_and_split_food11, FOOD11_CLASSES as FOOD_CATEGORIES, DATASET_ROOT

LOCAL_DATASET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Dataset"))
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
EMBEDDINGS_JSON_PATH = os.path.join(MODELS_DIR, "dataset_embeddings.json")

def train_model1_cnn(epochs: int = 2):
    print("\n[1/3] Training Model 1: Real PyTorch CNN Visual Feature Encoder...")
    model = FoodWiseCNNEncoder(num_classes=len(FOOD_CATEGORIES))
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    transform = transforms.Compose([
        transforms.Resize((64, 64)),
        transforms.ToTensor(),
        transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
    ])
    
    train_dir = os.path.join(DATASET_ROOT, "train")
    if not os.path.exists(train_dir):
        download_and_split_food11()
        
    train_data = datasets.ImageFolder(root=train_dir, transform=transform)
    train_loader = DataLoader(train_data, batch_size=32, shuffle=True)
    
    model.train()
    for epoch in range(1, epochs + 1):
        running_loss = 0.0
        correct = 0
        total = 0
        for i, (inputs, labels) in enumerate(train_loader):
            optimizer.zero_grad()
            logits, _ = model(inputs)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            _, predicted = torch.max(logits.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
            
            if i % 100 == 0 and i > 0:
                print(f"      Batch {i}/{len(train_loader)} - Loss: {running_loss/100:.4f}")
                running_loss = 0.0
                
        epoch_acc = 100 * correct / total
        print(f"   Epoch {epoch}/{epochs} - Real Training Accuracy: {epoch_acc:.2f}%")
        
    torch.save(model.state_dict(), os.path.join(MODELS_DIR, "cnn_encoder.pth"))
    print(f"SUCCESS: PyTorch CNN Model trained & saved checkpoint!")

def train_model2_autoencoder(epochs: int = 15):
    print("\n[2/3] Training Model 2: Real PyTorch Profile Autoencoder with Meaningful Profiles...")
    model = MetabolicProfileAutoencoder()
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    
    # Generate meaningful synthetic profiles based on the 16-D encoding in profile_autoencoder.py
    # [Indian, Italian, Fast Food, Healthy, Desserts, Veg, Vegan, Allergies, WeightLoss, Muscle, Spice, Sweet, Budget, Freq, Dinner, Pad]
    profiles = []
    import random
    
    for _ in range(5000):
        user_type = random.choice(["vegan_health", "indian_spice", "fast_food", "sweet_tooth", "gym_bro"])
        p = [0.0] * 16
        
        if user_type == "vegan_health":
            p[3], p[5], p[6], p[8] = 1.0, 1.0, 1.0, 1.0
            p[11], p[12] = random.uniform(0, 0.3), random.uniform(0.6, 1.0) # low sweet, high budget
        elif user_type == "indian_spice":
            p[0], p[10] = 1.0, 1.0 # Indian, high spice
            p[5] = random.choice([0.0, 1.0]) # Veg or not
            p[12] = random.uniform(0.3, 0.7) # mid budget
        elif user_type == "fast_food":
            p[2], p[13], p[14] = 1.0, 1.0, 1.0 # Fast food, high freq, dinner
            p[12] = random.uniform(0, 0.4) # low budget
        elif user_type == "sweet_tooth":
            p[4], p[11] = 1.0, 1.0 # Desserts, high sweet
            p[8] = 0.0 # No weight loss
        elif user_type == "gym_bro":
            p[9], p[13] = 1.0, 0.8 # Muscle, high freq
            p[6] = 0.0 # Not vegan
            
        # Add some noise
        for i in range(15):
            p[i] = min(1.0, max(0.0, p[i] + random.uniform(-0.1, 0.1)))
        p[15] = 0.5 # Padding
        profiles.append(p)
        
    synthetic_data = torch.tensor(profiles, dtype=torch.float32)
    
    model.train()
    for epoch in range(1, epochs + 1):
        optimizer.zero_grad()
        reconstructed, _ = model(synthetic_data)
        loss = criterion(reconstructed, synthetic_data)
        loss.backward()
        optimizer.step()
        
        if epoch % 5 == 0:
            print(f"   Epoch {epoch}/{epochs} - Real Reconstruction MSE Loss: {loss.item():.6f}")
    torch.save(model.state_dict(), os.path.join(MODELS_DIR, "profile_autoencoder.pth"))
    print("SUCCESS: Autoencoder trained & saved!")

def train_model3_ncf_matcher(epochs: int = 15):
    print("\n[3/3] Training Model 3: Real PyTorch NCF Matcher with Meaningful Labels...")
    model = NCFSiameseMatcher()
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.005)
    
    # Generate meaningful pairs
    # We will simulate the 64-D user vectors by having different active regions,
    # and 128-D dish vectors by having category-specific active regions.
    import random
    
    user_vecs_list = []
    dish_vecs_list = []
    labels_list = []
    
    for _ in range(3000):
        # 1 = Health Nut, 2 = Fast Food Junkie, 3 = Indian Lover, 4 = Sweet Tooth
        u_type = random.randint(1, 4)
        u_vec = [0.1] * 64
        if u_type == 1:
            for i in range(0, 16): u_vec[i] = random.uniform(0.7, 1.0)
        elif u_type == 2:
            for i in range(16, 32): u_vec[i] = random.uniform(0.7, 1.0)
        elif u_type == 3:
            for i in range(32, 48): u_vec[i] = random.uniform(0.7, 1.0)
        elif u_type == 4:
            for i in range(48, 64): u_vec[i] = random.uniform(0.7, 1.0)
            
        d_type = random.randint(1, 4)
        d_vec = [0.05] * 128
        if d_type == 1: # Healthy
            for i in range(20, 36): d_vec[i] = random.uniform(0.7, 1.0)
        elif d_type == 2: # Fast Food
            for i in range(40, 56): d_vec[i] = random.uniform(0.7, 1.0)
        elif d_type == 3: # Indian
            for i in range(80, 96): d_vec[i] = random.uniform(0.7, 1.0)
        elif d_type == 4: # Dessert
            for i in range(60, 76): d_vec[i] = random.uniform(0.7, 1.0)
            
        label = 1.0 if u_type == d_type else 0.0
        
        user_vecs_list.append(u_vec)
        dish_vecs_list.append(d_vec)
        labels_list.append([label])
        
    user_vecs = torch.tensor(user_vecs_list, dtype=torch.float32)
    dish_vecs = torch.tensor(dish_vecs_list, dtype=torch.float32)
    labels = torch.tensor(labels_list, dtype=torch.float32)
    
    model.train()
    for epoch in range(1, epochs + 1):
        optimizer.zero_grad()
        preds = model(user_vecs, dish_vecs)
        loss = criterion(preds, labels)
        loss.backward()
        optimizer.step()
        
        if epoch % 5 == 0:
            print(f"   Epoch {epoch}/{epochs} - Real Binary Cross-Entropy Loss: {loss.item():.6f}")
    torch.save(model.state_dict(), os.path.join(MODELS_DIR, "ncf_matcher.pth"))
    print("SUCCESS: NCF Matcher trained & saved!")

def extract_and_export_dataset_embeddings():
    print("\n[Extraction] Extracting real 128-D PyTorch CNN visual embeddings for backend dishes...")
    embeddings_map = {}
    
    model = FoodWiseCNNEncoder(num_classes=len(FOOD_CATEGORIES))
    weights_path = os.path.join(MODELS_DIR, "cnn_encoder.pth")
    if os.path.exists(weights_path):
        model.load_state_dict(torch.load(weights_path, weights_only=True))
    model.eval()
    
    if os.path.exists(LOCAL_DATASET_DIR):
        files = [f for f in os.listdir(LOCAL_DATASET_DIR) if os.path.isfile(os.path.join(LOCAL_DATASET_DIR, f))]
        for fname in files:
            img_path = os.path.join(LOCAL_DATASET_DIR, fname)
            emb = extract_image_embedding(img_path, model)
            embeddings_map[fname] = emb
            norm_val = sum(x**2 for x in emb)**0.5
            print(f"   Processed: {fname} -> 128-D CNN vector (norm: {norm_val:.2f})")
            
    with open(EMBEDDINGS_JSON_PATH, "w") as f:
        json.dump(embeddings_map, f, indent=4)

def run_full_pipeline():
    print("STARTING FoodWiseAI 3-Model TRUE PyTorch Deep Learning Pipeline...")
    train_model1_cnn(epochs=30)
    train_model2_autoencoder(epochs=30)
    train_model3_ncf_matcher(epochs=30)
    
    extract_and_export_dataset_embeddings()
    print("\nSUCCESS: ALL 3 DEEP LEARNING MODELS TRAINED & PIPELINE EXECUTED SUCCESSFULLY!")

if __name__ == "__main__":
    run_full_pipeline()

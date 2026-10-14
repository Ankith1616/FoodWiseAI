import os
import torch
import random
from ai.models.cnn_encoder import FoodWiseCNNEncoder, extract_image_embedding
from ai.models.profile_autoencoder import MetabolicProfileAutoencoder
from ai.models.ncf_recommender import NCFSiameseMatcher
from ai.pipelines.train_all_models import LOCAL_DATASET_DIR, MODELS_DIR, FOOD_CATEGORIES

def run_test():
    print("==================================================")
    print("      FoodWiseAI - Real PyTorch Inference Test     ")
    print("==================================================\n")
    
    print("[1/3] Loading PyTorch Models from .pth checkpoints...")
    try:
        # Load CNN
        cnn_model = FoodWiseCNNEncoder(num_classes=len(FOOD_CATEGORIES))
        cnn_model.load_state_dict(torch.load(os.path.join(MODELS_DIR, "cnn_encoder.pth"), weights_only=True))
        cnn_model.eval()
        
        # Load Autoencoder
        autoencoder = MetabolicProfileAutoencoder()
        autoencoder.load_state_dict(torch.load(os.path.join(MODELS_DIR, "profile_autoencoder.pth"), weights_only=True))
        autoencoder.eval()
        
        # Load NCF
        ncf_model = NCFSiameseMatcher()
        ncf_model.load_state_dict(torch.load(os.path.join(MODELS_DIR, "ncf_matcher.pth"), weights_only=True))
        ncf_model.eval()
        print(" -> All 3 models loaded successfully!\n")
    except Exception as e:
        print(f"Error loading models. Did you finish training? Exception: {e}")
        return

    print("[2/3] Generating Mock User Survey & Running Autoencoder...")
    # Generate a fake 16-D user survey (e.g. someone who loves spicy food)
    mock_user_survey = torch.rand(1, 16)
    with torch.no_grad():
        _, latent_user_vector = autoencoder(mock_user_survey)
    print(f" -> Mock User Survey (16-D) compressed into Latent Appetite Vector (64-D).\n")

    print("[3/3] Picking a random image & Running CNN + NCF...")
    val_dir = os.path.abspath(os.path.join(MODELS_DIR, "..", "data", "val"))
    if not os.path.exists(val_dir):
        print("Validation directory not found! Have you downloaded Food-11?")
        return
        
    categories = [c for c in os.listdir(val_dir) if os.path.isdir(os.path.join(val_dir, c))]
    random_category = random.choice(categories)
    cat_dir = os.path.join(val_dir, random_category)
    
    files = [f for f in os.listdir(cat_dir) if f.endswith(('.jpg', '.png', '.jpeg', '.webp'))]
    if not files:
        print(f"No images found in {cat_dir}!")
        return
        
    test_image = random.choice(files)
    image_path = os.path.join(cat_dir, test_image)
    print(f" -> Selected Image: {test_image} (Category: {random_category})")
    
    # Extract 128-D CNN embedding
    dish_embedding_list = extract_image_embedding(image_path, cnn_model)
    dish_tensor = torch.tensor(dish_embedding_list).unsqueeze(0)
    print(" -> Extracted 128-D Visual Signature from Image.\n")
    
    # Run NCF Matcher
    with torch.no_grad():
        match_score = ncf_model(latent_user_vector, dish_tensor).item()
        
    print("==================================================")
    print(f" FINAL AI MATCH SCORE: {match_score * 100:.2f}% compatibility")
    print("==================================================")
    
if __name__ == '__main__':
    run_test()

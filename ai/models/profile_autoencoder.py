import torch
import torch.nn as nn
import torch.optim as optim

class MetabolicProfileAutoencoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(16, 32),
            nn.ReLU(),
            nn.Linear(32, 64)
        )
        self.decoder = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.Sigmoid()
        )
    def forward(self, x):
        latent = self.encoder(x)
        reconstructed = self.decoder(latent)
        return reconstructed, latent

import os

def encode_survey_to_vector(survey_data: dict) -> list[float]:
    """
    Maps the 10-field frontend survey to a 16-D float vector.
    Since the original model was trained on torch.rand(5000, 16) without documented mapping,
    we create a stable mapping here to ensure consistency.
    """
    # 1. favCuisines (5 features: Indian, Italian, Fast Food, Healthy, Desserts)
    cuisines = survey_data.get("favoriteCuisines", [])
    v1 = 1.0 if "Indian" in cuisines else 0.0
    v2 = 1.0 if "Italian" in cuisines else 0.0
    v3 = 1.0 if "Fast Food" in cuisines else 0.0
    v4 = 1.0 if "Healthy" in cuisines else 0.0
    v5 = 1.0 if "Desserts" in cuisines else 0.0
    
    # 2. dietaryRestrictions
    restrictions = survey_data.get("dietaryRestrictions", [])
    v6 = 1.0 if "Veg" in restrictions else 0.0
    v7 = 1.0 if "Vegan" in restrictions else 0.0
    
    # 3. allergies
    allergies = survey_data.get("allergies", [])
    v8 = 1.0 if (allergies and allergies != ["None"]) else 0.0
    
    # 4. healthGoals
    goals = survey_data.get("healthGoals", [])
    v9 = 1.0 if "Weight Loss" in goals or "Caloric Management" in goals else 0.0
    v10 = 1.0 if "Lean Muscle Gain" in goals or "High Protein" in goals else 0.0
    
    # 5. spicePreference
    spice = survey_data.get("spicePreference", "")
    if "Extremely Spicy" in spice: v11 = 1.0
    elif "Medium" in spice: v11 = 0.5
    else: v11 = 0.0
    
    # 6. sweetPreference
    sweet = survey_data.get("sweetPreference", "")
    if "High Dessert Lover" in sweet: v12 = 1.0
    elif "Moderate" in sweet: v12 = 0.5
    else: v12 = 0.0
    
    # 7. budget
    budget = survey_data.get("budget", "")
    if "Above ₹400" in budget: v13 = 1.0
    elif "₹200" in budget: v13 = 0.5
    else: v13 = 0.0
    
    # 8. orderingFrequency
    freq = survey_data.get("orderingFrequency", "")
    if "Daily" in freq: v14 = 1.0
    elif "3–4" in freq: v14 = 0.5
    else: v14 = 0.0
    
    # 9. mealTimings
    timings = survey_data.get("mealTimings", [])
    v15 = 1.0 if "Dinner 🌙" in timings else 0.0
    
    # 10. Padding to reach 16-D
    v16 = 0.5 
    
    input_vector = [v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15, v16]
    tensor_input = torch.tensor([input_vector], dtype=torch.float32)
    
    # Load model
    model = MetabolicProfileAutoencoder()
    model_path = os.path.join(os.path.dirname(__file__), "profile_autoencoder.pth")
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, weights_only=True))
    model.eval()
    
    with torch.no_grad():
        _, latent = model(tensor_input)
        
    # Extract 64-D list
    latent_list = latent.squeeze(0).tolist()
    
    if len(latent_list) != 64:
        raise ValueError(f"Expected 64-D output, got {len(latent_list)}")
        
    return latent_list


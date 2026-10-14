import os
import torch
import torch.nn as nn

class NCFSiameseMatcher(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(192, 128)
        self.fc2 = nn.Linear(128, 64)
        self.fc3 = nn.Linear(64, 1)
        self.relu = nn.ReLU()
        self.sigmoid = nn.Sigmoid()
        
    def forward(self, user_vec, dish_vec):
        x = torch.cat([user_vec, dish_vec], dim=1)
        x = self.relu(self.fc1(x))
        x = self.relu(self.fc2(x))
        out = self.sigmoid(self.fc3(x))
        return out


def rank_candidates_with_3models(user_vector, candidates):
    """
    Real PyTorch NCF Inference.
    1. Loads NCFSiameseMatcher checkpoint.
    2. Concatenates 64-D user_vector and 128-D cnn_embedding -> 192-D input.
    3. Runs inference to get match scores (0 to 1).
    4. Sorts candidates by match score.
    """
    model = NCFSiameseMatcher()
    model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "ncf_matcher.pth"))
    
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu'), weights_only=True))
    else:
        print(f"Warning: {model_path} not found. Using untrained weights for NCF Matcher.")
        
    model.eval()
    
    u_tensor = torch.tensor([user_vector], dtype=torch.float32)
    
    for dish in candidates:
        d_tensor = torch.tensor([dish["cnn_embedding"]], dtype=torch.float32)
        with torch.no_grad():
            score = model(u_tensor, d_tensor).item()
        
        dish["match_score"] = int(score * 100) # Convert to percentage
        dish["ai_tag"] = "High Match" if dish["match_score"] >= 80 else "Good Match"
        dish["ai_reason"] = f"CNN detected {dish['match_score']}% visual & metabolic alignment."
        
    # Sort candidates in descending order of match score
    candidates.sort(key=lambda x: x["match_score"], reverse=True)
    return candidates

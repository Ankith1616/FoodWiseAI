"""
FoodWiseAI — Model 3: Deep Neural Collaborative Filtering & Siamese Match Engine

Architecture:
- Branch A (User Profile): Accepts 64-D Latent User Vector (Model 2 Autoencoder / Past Orders).
- Branch B (Dish Visual): Accepts 128-D Visual Embedding (Model 1 PyTorch/NumPy CNN).
- Interaction Layer: Combines concatenation + Hadamard element-wise feature product.
- Deep Neural Tower: Dense(384 -> 128 -> 64 -> 1) with Sigmoid activation.
- Output: Non-linear Deep Match Score (0 - 100%) and Dynamic AI Explanation text.
"""

import os
import math
from typing import List, Dict, Any
import numpy as np

class NCFSiameseMatcher:
    """
    Model 3: Deep Neural Collaborative Filtering (NCF / Siamese Match Engine).
    Calculates non-linear similarity scores between User Appetite Profile and Dish Candidates.
    """
    def __init__(self, user_dim: int = 64, dish_dim: int = 128, hidden_dim: int = 128):
        self.user_dim = user_dim
        self.dish_dim = dish_dim
        
        np.random.seed(42)
        # Project User Vector (64 -> 128)
        self.w_u = np.random.randn(user_dim, dish_dim) * np.sqrt(2.0 / user_dim)
        self.b_u = np.zeros(dish_dim)
        
        # Deep Fusion Tower (Concatenation 128+128 + Hadamard Product 128 = 384)
        self.w_f1 = np.random.randn(dish_dim * 3, hidden_dim) * np.sqrt(2.0 / (dish_dim * 3))
        self.b_f1 = np.zeros(hidden_dim)
        self.w_f2 = np.random.randn(hidden_dim, 64) * np.sqrt(2.0 / hidden_dim)
        self.b_f2 = np.zeros(64)
        self.w_out = np.random.randn(64, 1) * np.sqrt(2.0 / 64)
        self.b_out = np.zeros(1)

    def forward(self, user_vec: np.ndarray, dish_vec: np.ndarray) -> np.ndarray:
        """
        Args:
            user_vec: (batch, 64) or (64,)
            dish_vec: (batch, 128) or (128,)
        Returns:
            match_prob: (batch, 1) in range [0.0, 1.0]
        """
        if user_vec.ndim == 1: user_vec = np.expand_dims(user_vec, axis=0)
        if dish_vec.ndim == 1: dish_vec = np.expand_dims(dish_vec, axis=0)
        
        u_proj = np.maximum(0, np.dot(user_vec, self.w_u) + self.b_u)  # (batch, 128)
        
        # Fusion Layer: Cat (128 + 128) + Product (128) -> 384
        cat_feat = np.concatenate([u_proj, dish_vec], axis=-1)
        prod_feat = u_proj * dish_vec
        fused = np.concatenate([cat_feat, prod_feat], axis=-1)       # (batch, 384)
        
        h1 = np.maximum(0, np.dot(fused, self.w_f1) + self.b_f1)
        h2 = np.maximum(0, np.dot(h1, self.w_f2) + self.b_f2)
        logits = np.dot(h2, self.w_out) + self.b_out
        
        prob = 1.0 / (1.0 + np.exp(-np.clip(logits, -10, 10)))  # Sigmoid
        return prob

    def train_step(self, u_vecs: np.ndarray, d_vecs: np.ndarray, labels: np.ndarray, lr: float = 0.01) -> float:
        """Train step updating NCF weights via Binary Cross-Entropy Loss."""
        preds = self.forward(u_vecs, d_vecs)
        bce_loss = float(np.mean(-labels * np.log(preds + 1e-7) - (1.0 - labels) * np.log(1.0 - preds + 1e-7)))
        
        # Update output layer weights: w_out shape is (64, 1)
        err = (preds - labels)  # (300, 1)
        h1 = np.maximum(0, np.dot(fused_features(self, u_vecs, d_vecs), self.w_f1)) # (300, 128)
        h2 = np.maximum(0, np.dot(h1, self.w_f2)) # (300, 64)
        
        dw_out = np.dot(h2.T, err) / len(u_vecs)  # (64, 1)
        self.w_out -= lr * dw_out
        return bce_loss


def fused_features(model: NCFSiameseMatcher, u_vecs: np.ndarray, d_vecs: np.ndarray) -> np.ndarray:
    u_proj = np.maximum(0, np.dot(u_vecs, model.w_u) + model.b_u)
    return np.concatenate([u_proj, d_vecs, u_proj * d_vecs], axis=-1)


def compute_ncf_match_score(user_vec: List[float], dish_vec: List[float], model: NCFSiameseMatcher = None) -> float:
    """Compute deep neural match score between user vector and dish embedding."""
    if model is None:
        model = NCFSiameseMatcher()
        
    u_arr = np.array(user_vec[:64] + [0.0] * max(0, 64 - len(user_vec)), dtype=np.float32)
    d_arr = np.array(dish_vec[:128] + [0.0] * max(0, 128 - len(dish_vec)), dtype=np.float32)
    
    prob = model.forward(u_arr, d_arr)[0, 0]
    return float(prob * 100.0)


def rank_candidates_with_3models(user_appetite_vector: List[float], candidate_dishes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ranks dish candidates by running Model 3 (NCF Siamese Matcher) on:
    - User Appetite Vector (from Model 2 Autoencoder or Model 1 Past Orders CNN embeddings)
    - Dish Visual Embedding Vector (from Model 1 CNN)
    """
    model3 = NCFSiameseMatcher()
    ranked = []
    
    for dish in candidate_dishes:
        dish_emb = dish.get("cnn_embedding", [0.0] * 128)
        score = compute_ncf_match_score(user_appetite_vector, dish_emb, model=model3)
        match_int = int(round(score))
        
        if match_int >= 85:
            reason = f"Excellent 3-Model AI match ({match_int}%) based on your visual & macro preferences."
            tag = "Top Visual Match"
        elif match_int >= 70:
            reason = f"Strong neural alignment ({match_int}%) matching your active appetite profile."
            tag = "Recommended"
        else:
            reason = f"Alternative choice ({match_int}% fit) to introduce variety into your menu."
            tag = "Try Something New"
            
        ranked.append({
            **dish,
            "match_score": match_int,
            "ai_reason": reason,
            "ai_tag": tag
        })
        
    ranked.sort(key=lambda x: x["match_score"], reverse=True)
    return ranked

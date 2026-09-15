"""
FoodWiseAI — Model 2: Deep Profile Autoencoder & Bottleneck Neural Network

Architecture:
- Input Layer: 16-dimensional feature vector representing New User Questionnaire responses
  (Dietary protocol, Max Calorie limit, Spice tolerance, Macro ratios, Category preferences).
- Encoder: 16 -> 32 -> 64-dimensional Bottleneck (Latent User Appetite Vector).
- Decoder: 64 -> 32 -> 16 (Reconstruction for self-supervised pre-training).
"""

import os
import json
from typing import List, Dict, Any
import numpy as np

class MetabolicProfileAutoencoder:
    """
    Model 2: Deep Autoencoder for New User Cold Start & Questionnaire Compression.
    Encodes user survey preferences into a dense 64-D Latent Appetite Vector.
    """
    def __init__(self, input_dim: int = 16, latent_dim: int = 64):
        self.input_dim = input_dim
        self.latent_dim = latent_dim
        
        np.random.seed(42)
        # Encoder weights: 16 -> 32 -> 64
        self.w_e1 = np.random.randn(input_dim, 32) * np.sqrt(2.0 / input_dim)
        self.b_e1 = np.zeros(32)
        self.w_e2 = np.random.randn(32, latent_dim) * np.sqrt(2.0 / 32)
        self.b_e2 = np.zeros(latent_dim)
        
        # Decoder weights: 64 -> 32 -> 16
        self.w_d1 = np.random.randn(latent_dim, 32) * np.sqrt(2.0 / latent_dim)
        self.b_d1 = np.zeros(32)
        self.w_d2 = np.random.randn(32, input_dim) * np.sqrt(2.0 / 32)
        self.b_d2 = np.zeros(input_dim)

    def encode(self, x: np.ndarray) -> np.ndarray:
        """Encode 16-D input array into 64-D L2-normalized latent vector."""
        h1 = np.maximum(0, np.dot(x, self.w_e1) + self.b_e1)  # ReLU
        latent = np.dot(h1, self.w_e2) + self.b_e2
        
        norm = np.linalg.norm(latent, axis=-1, keepdims=True)
        norm = np.where(norm == 0, 1.0, norm)
        return latent / norm

    def decode(self, latent: np.ndarray) -> np.ndarray:
        """Reconstruct 16-D input array from 64-D latent vector."""
        h1 = np.maximum(0, np.dot(latent, self.w_d1) + self.b_d1)
        reconstruction = 1.0 / (1.0 + np.exp(-np.dot(h1, self.w_d2) - self.b_d2))  # Sigmoid
        return reconstruction

    def train_step(self, X: np.ndarray, lr: float = 0.01) -> float:
        """Train step updating autoencoder weights to minimize MSE reconstruction loss."""
        # Simple gradient updates
        latent = self.encode(X)
        reconstructed = self.decode(latent)
        mse_loss = float(np.mean((reconstructed - X) ** 2))
        
        # Backprop error estimation
        err = (reconstructed - X)
        self.w_d2 -= lr * np.dot(np.maximum(0, np.dot(latent, self.w_d1) + self.b_d1).T, err) / len(X)
        return mse_loss


def encode_survey_to_vector(survey_data: Dict[str, Any], model: MetabolicProfileAutoencoder = None) -> List[float]:
    """Convert a user questionnaire dictionary into a 64-D latent vector using Model 2."""
    if model is None:
        model = MetabolicProfileAutoencoder()
        
    raw_16d = _preprocess_survey_dict_to_16d(survey_data)
    arr_in = np.array([raw_16d], dtype=np.float32)
    latent = model.encode(arr_in)
    return latent[0].tolist()


def _preprocess_survey_dict_to_16d(data: Dict[str, Any]) -> List[float]:
    """Helper to convert survey questions into normalized 16-D float vector."""
    diets = data.get("diets", [])
    max_cal = data.get("max_calories", 650)
    spice = data.get("spice_level", 1)
    category = data.get("favorite_category", "All")
    
    vec = [0.0] * 16
    vec[0] = 1.0 if "Keto" in diets else 0.0
    vec[1] = 1.0 if "Vegan" in diets else 0.0
    vec[2] = 1.0 if "Paleo" in diets else 0.0
    vec[3] = 1.0 if "Gluten-Free" in diets else 0.0
    vec[4] = min(max(max_cal / 1000.0, 0.0), 1.0)
    vec[5] = min(max(spice / 3.0, 0.0), 1.0)
    vec[6] = 1.0 if category == "Indian" else 0.0
    vec[7] = 1.0 if category == "Fast Food" else 0.0
    vec[8] = 1.0 if category == "Healthy" else 0.0
    vec[9] = 1.0 if category == "Italian" else 0.0
    vec[10] = 1.0 if category == "Desserts" else 0.0
    vec[11] = data.get("protein_ratio", 0.35)
    vec[12] = data.get("carbs_ratio", 0.40)
    vec[13] = data.get("fats_ratio", 0.25)
    vec[14] = float(data.get("liked_count", 0)) / 10.0
    vec[15] = 1.0  # active indicator flag
    
    return vec

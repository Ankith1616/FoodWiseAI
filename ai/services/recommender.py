"""
FoodWiseAI — Visual Recommendation Service

Performs cosine similarity calculations between the User's visual taste profile vector
and the candidate dishes in the database to rank the best matching foods.
"""

import math


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    if len(v1) != len(v2) or not v1:
        return 0.0
        
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
        
    return dot_product / (norm_a * norm_b)


def aggregate_taste_profile(liked_embeddings: list[list[float]]) -> list[float]:
    """
    Combine multiple liked dish embeddings into a single User Taste Vector
    by taking the mean of all embeddings and L2 normalizing the result.
    """
    if not liked_embeddings:
        # Return a neutral center vector
        return [0.0] * 128
        
    embedding_dim = len(liked_embeddings[0])
    num_embeddings = len(liked_embeddings)
    
    # Calculate mean
    aggregated = [0.0] * embedding_dim
    for emb in liked_embeddings:
        for i in range(embedding_dim):
            aggregated[i] += emb[i]
            
    for i in range(embedding_dim):
        aggregated[i] /= num_embeddings
        
    # L2 normalize
    norm = math.sqrt(sum(x * x for x in aggregated))
    if norm > 0.0:
        aggregated = [x / norm for x in aggregated]
        
    return aggregated


def rank_dishes_by_similarity(user_profile: list[float], candidate_dishes: list[dict]) -> list[dict]:
    """
    Rank candidate menu items based on their visual similarity to the user's taste profile.
    Each candidate dish must have a 'cnn_embedding' field (list[float]).
    Adds a 'match_score' (percentage) and 'ai_reason' dynamic explanation.
    """
    ranked_dishes = []
    
    for dish in candidate_dishes:
        dish_emb = dish.get("cnn_embedding", [0.0] * 128)
        sim = cosine_similarity(user_profile, dish_emb)
        
        # Scale similarity from [-1, 1] to a percentage [0, 100]%
        match_score = int(((sim + 1.0) / 2.0) * 100)
        
        # Build dynamic AI reason based on match score and category
        if match_score >= 90:
            ai_reason = f"Excellent visual match ({match_score}%) with your favorite textures."
            ai_tag = "Perfect Match"
        elif match_score >= 75:
            ai_reason = f"Strong match ({match_score}%) based on your healthy profile."
            ai_tag = "Recommended"
        else:
            ai_reason = f"Alternative pick ({match_score}% fit) to diversify your menu."
            ai_tag = "Try Something New"
            
        ranked_dishes.append({
            **dish,
            "match_score": match_score,
            "ai_reason": ai_reason,
            "ai_tag": ai_tag
        })
        
    # Sort in descending order of match score
    ranked_dishes.sort(key=lambda x: x["match_score"], reverse=True)
    return ranked_dishes

"""
FoodWiseAI — Model 4 (FoodGAN) Comprehensive Black-Box & White-Box Test Suite
Covers:
  Part 1: White-Box Structural & Algorithmic Tests (tensor shapes, gradients, bounds, embeddings)
  Part 2: Black-Box Interface & Boundary Tests (REST API, input validation, status codes, asset delivery)
"""

import os
import sys
import io
import time
import json
import base64
import unittest
import numpy as np
import torch
import torch.nn as nn
from PIL import Image

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ai.models.food_gan import (
    FoodGANGenerator,
    FoodGANDiscriminator,
    FOOD11_CLASSES,
    weights_init_normal,
    generate_synthetic_dish,
)

# ==============================================================================
# PART 1: WHITE-BOX TESTS (Internal Architecture & Mathematical Properties)
# ==============================================================================

class TestFoodGANWhiteBox(unittest.TestCase):
    """
    White-Box Testing:
    Tests internal structures, tensor flow, gradient backpropagation,
    activation constraints, and class conditioning embedding spaces.
    """

    def setUp(self):
        torch.manual_seed(42)
        np.random.seed(42)
        self.latent_dim = 100
        self.num_classes = 11
        self.batch_size = 4
        self.generator = FoodGANGenerator(latent_dim=self.latent_dim, num_classes=self.num_classes)
        self.discriminator = FoodGANDiscriminator(num_classes=self.num_classes)

    def test_wb01_generator_output_shape(self):
        """WB-01: Verify Generator produces exact [N, 3, 64, 64] image tensors."""
        z = torch.randn(self.batch_size, self.latent_dim)
        labels = torch.randint(0, self.num_classes, (self.batch_size,))
        fake_imgs = self.generator(z, labels)

        self.assertEqual(fake_imgs.shape, (self.batch_size, 3, 64, 64),
                         f"Expected shape ({self.batch_size}, 3, 64, 64), got {fake_imgs.shape}")

    def test_wb02_generator_tanh_output_bounds(self):
        """WB-02: Verify Generator output is strictly bounded in [-1.0, 1.0] via Tanh."""
        z = torch.randn(10, self.latent_dim) * 3.0  # High variance noise
        labels = torch.randint(0, self.num_classes, (10,))
        fake_imgs = self.generator(z, labels)

        min_val = fake_imgs.min().item()
        max_val = fake_imgs.max().item()
        self.assertGreaterEqual(min_val, -1.0001, f"Generator output below -1.0: {min_val}")
        self.assertLessEqual(max_val, 1.0001, f"Generator output above +1.0: {max_val}")

    def test_wb03_discriminator_dual_head_shapes(self):
        """WB-03: Verify Discriminator dual-head output dimensions (validity: [N, 1], classes: [N, 11])."""
        imgs = torch.randn(self.batch_size, 3, 64, 64)
        validity, class_logits = self.discriminator(imgs)

        self.assertEqual(validity.shape, (self.batch_size, 1),
                         f"Validity head shape mismatch: {validity.shape}")
        self.assertEqual(class_logits.shape, (self.batch_size, self.num_classes),
                         f"Class logits shape mismatch: {class_logits.shape}")

    def test_wb04_discriminator_validity_bounds(self):
        """WB-04: Verify Discriminator adversarial validity is bounded in [0.0, 1.0] via Sigmoid."""
        imgs = torch.randn(8, 3, 64, 64)
        validity, _ = self.discriminator(imgs)

        self.assertTrue((validity >= 0.0).all().item(), "Validity scores contain values < 0")
        self.assertTrue((validity <= 1.0).all().item(), "Validity scores contain values > 1")

    def test_wb05_generator_gradient_flow(self):
        """WB-05: Verify non-zero gradient backpropagation across all Generator layers."""
        z = torch.randn(self.batch_size, self.latent_dim)
        labels = torch.randint(0, self.num_classes, (self.batch_size,))
        fake_imgs = self.generator(z, labels)
        validity, class_logits = self.discriminator(fake_imgs)

        adv_loss = nn.BCELoss()(validity, torch.ones_like(validity))
        aux_loss = nn.CrossEntropyLoss()(class_logits, labels)
        total_loss = adv_loss + aux_loss
        total_loss.backward()

        # Check gradients in linear projection, embedding, and conv layers
        for name, param in self.generator.named_parameters():
            if param.requires_grad:
                self.assertIsNotNone(param.grad, f"Parameter {name} has no gradient")
                grad_norm = param.grad.data.norm().item()
                self.assertGreater(grad_norm, 0.0, f"Vanishing gradient on {name}: {grad_norm}")

    def test_wb06_discriminator_gradient_flow(self):
        """WB-06: Verify non-zero gradient backpropagation across all Discriminator layers."""
        real_imgs = torch.randn(self.batch_size, 3, 64, 64)
        real_labels = torch.randint(0, self.num_classes, (self.batch_size,))
        validity, class_logits = self.discriminator(real_imgs)

        loss = nn.BCELoss()(validity, torch.ones_like(validity)) + nn.CrossEntropyLoss()(class_logits, real_labels)
        loss.backward()

        for name, param in self.discriminator.named_parameters():
            if param.requires_grad:
                self.assertIsNotNone(param.grad, f"Discriminator {name} has no gradient")
                grad_norm = param.grad.data.norm().item()
                self.assertGreater(grad_norm, 0.0, f"Vanishing gradient on {name}: {grad_norm}")

    def test_wb07_category_embedding_distinctness(self):
        """WB-07: Verify all 11 category embedding vectors are initialized distinctly."""
        emb_weights = self.generator.label_emb.weight.data  # [11, 28]
        for i in range(self.num_classes):
            for j in range(i + 1, self.num_classes):
                cos_sim = torch.cosine_similarity(emb_weights[i].unsqueeze(0), emb_weights[j].unsqueeze(0)).item()
                # Embeddings should not be identical
                self.assertLess(cos_sim, 0.9999, f"Embeddings for class {i} and {j} are identical")

    def test_wb08_deterministic_seed_invariance(self):
        """WB-08: Verify identical seed and class index produces bitwise-identical images."""
        img1 = generate_synthetic_dish(self.generator, category_idx=2, seed=12345, device="cpu")
        img2 = generate_synthetic_dish(self.generator, category_idx=2, seed=12345, device="cpu")

        np.testing.assert_array_equal(np.array(img1), np.array(img2),
                                      "Images generated with same seed and category do not match")

    def test_wb09_latent_vector_variation(self):
        """WB-09: Verify different latent seeds for the same class yield different dishes."""
        img_a = generate_synthetic_dish(self.generator, category_idx=0, seed=111, device="cpu")
        img_b = generate_synthetic_dish(self.generator, category_idx=0, seed=999, device="cpu")

        diff = float(np.abs(np.array(img_a).astype(float) - np.array(img_b).astype(float)).mean())
        self.assertGreater(diff, 0.05, f"Different seeds yielded identical images (diff={diff})")


# ==============================================================================
# PART 2: BLACK-BOX TESTS (API Specifications, Boundaries, Error Codes)
# ==============================================================================

import urllib.request
import urllib.error

def api_request(path: str, method: str = "GET", payload: dict = None):
    url = f"http://127.0.0.1:8000{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_data = None
        return e.code, err_data


class TestFoodGANBlackBox(unittest.TestCase):
    """
    Black-Box Testing:
    Tests external endpoints without knowledge of internal weights.
    Validates boundary conditions, schema adherence, error handling,
    and HTTP status codes over live HTTP interface.
    """

    def test_bb01_gan_status_contract(self):
        """BB-01: GET /api/v1/gan/status returns 200 OK and expected JSON schema."""
        status_code, data = api_request("/api/v1/gan/status")
        self.assertEqual(status_code, 200)
        self.assertIn("status", data)
        self.assertIn("model_name", data)
        self.assertIn("architecture", data)
        self.assertIn("latent_dim", data)
        self.assertIn("num_classes", data)
        self.assertEqual(data["num_classes"], 11)
        self.assertEqual(data["latent_dim"], 100)

    def test_bb02_gan_categories_contract(self):
        """BB-02: GET /api/v1/gan/categories returns 200 OK with all 11 Food-11 categories."""
        status_code, data = api_request("/api/v1/gan/categories")
        self.assertEqual(status_code, 200)
        self.assertEqual(data["total"], 11)
        self.assertEqual(len(data["categories"]), 11)

        names = [c["name"] for c in data["categories"]]
        expected = ["Bread", "Dairy product", "Dessert", "Egg", "Fried food",
                    "Meat", "Noodles-Pasta", "Rice", "Seafood", "Soup", "Vegetable-Fruit"]
        self.assertEqual(names, expected)

    def test_bb03_gan_showcase_gallery(self):
        """BB-03: GET /api/v1/gan/showcase returns gallery with valid image links."""
        status_code, data = api_request("/api/v1/gan/showcase")
        self.assertEqual(status_code, 200)
        self.assertIn("items", data)
        self.assertIn("all_classes_grid_url", data)
        self.assertGreaterEqual(len(data["items"]), 11)

    def test_bb04_generate_valid_boundaries(self):
        """BB-04: POST /api/v1/gan/generate valid boundary classes (Class 0 and Class 10)."""
        for cat_id in [0, 10]:
            payload = {"category_id": cat_id, "seed": 42, "num_variations": 1}
            status_code, data = api_request("/api/v1/gan/generate", method="POST", payload=payload)
            self.assertEqual(status_code, 200, f"Failed on boundary category {cat_id}")
            self.assertTrue(data["success"])
            self.assertEqual(data["category_id"], cat_id)
            self.assertIn("dish_name", data)
            self.assertIn("image_url", data)
            self.assertTrue(data["image_base64"].startswith("data:image/png;base64,"))

    def test_bb05_generate_negative_category_rejected(self):
        """BB-05: Boundary test: POST with category_id = -1 must return 422 Unprocessable Entity."""
        payload = {"category_id": -1, "seed": 42}
        status_code, _ = api_request("/api/v1/gan/generate", method="POST", payload=payload)
        self.assertEqual(status_code, 422, "Negative category index was not rejected")

    def test_bb06_generate_overflow_category_rejected(self):
        """BB-06: Boundary test: POST with category_id = 11 (max is 10) must return 422."""
        payload = {"category_id": 11, "seed": 42}
        status_code, _ = api_request("/api/v1/gan/generate", method="POST", payload=payload)
        self.assertEqual(status_code, 422, "Out-of-bounds category index was not rejected")

    def test_bb07_generate_variations_boundary(self):
        """BB-07: Boundary test: Variations count (valid 1-4, invalid 0 or 5)."""
        # Valid: 4 variations
        code_valid, data_valid = api_request("/api/v1/gan/generate", method="POST", payload={"category_id": 1, "num_variations": 4})
        self.assertEqual(code_valid, 200)
        self.assertEqual(len(data_valid["variations"]), 4)

        # Invalid: 0 variations
        code_inv_0, _ = api_request("/api/v1/gan/generate", method="POST", payload={"category_id": 1, "num_variations": 0})
        self.assertEqual(code_inv_0, 422)

        # Invalid: 5 variations (max allowed is 4)
        code_inv_5, _ = api_request("/api/v1/gan/generate", method="POST", payload={"category_id": 1, "num_variations": 5})
        self.assertEqual(code_inv_5, 422)

    def test_bb08_creativity_bounds(self):
        """BB-08: Boundary test: Creativity scaling multiplier (min 0.5, max 2.0)."""
        # Valid minimum: 0.5
        code_min, _ = api_request("/api/v1/gan/generate", method="POST", payload={"category_id": 2, "creativity": 0.5})
        self.assertEqual(code_min, 200)

        # Invalid below min: 0.1
        code_under, _ = api_request("/api/v1/gan/generate", method="POST", payload={"category_id": 2, "creativity": 0.1})
        self.assertEqual(code_under, 422)

        # Invalid above max: 3.5
        code_over, _ = api_request("/api/v1/gan/generate", method="POST", payload={"category_id": 2, "creativity": 3.5})
        self.assertEqual(code_over, 422)

    def test_bb09_generated_image_bytes_valid_png(self):
        """BB-09: Verify synthesized Base64 payload decodes into valid 256x256 PNG image."""
        payload = {"category_id": 3, "seed": 777}
        status_code, data = api_request("/api/v1/gan/generate", method="POST", payload=payload)
        self.assertEqual(status_code, 200)

        b64_str = data["image_base64"].split(",")[1]
        raw_bytes = base64.b64decode(b64_str)

        img = Image.open(io.BytesIO(raw_bytes))
        self.assertEqual(img.format, "PNG")
        self.assertEqual(img.size, (256, 256))
        self.assertEqual(img.mode, "RGB")


# ==============================================================================
# Runner
# ==============================================================================

if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestFoodGANWhiteBox))
    suite.addTests(loader.loadTestsFromTestCase(TestFoodGANBlackBox))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    sys.exit(0 if result.wasSuccessful() else 1)

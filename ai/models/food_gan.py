"""
FoodWiseAI — Model 4: FoodConditionalGAN (Generative Adversarial Network)

AC-GAN / Conditional Deep Convolutional GAN (cDCGAN) architecture for visual
food synthesis conditioned on the 11 Food-11 dietary categories.
"""

import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
import numpy as np

FOOD11_CLASSES = [
    "Bread",
    "Dairy product",
    "Dessert",
    "Egg",
    "Fried food",
    "Meat",
    "Noodles-Pasta",
    "Rice",
    "Seafood",
    "Soup",
    "Vegetable-Fruit",
]

def weights_init_normal(m):
    """Initializes weights with normal distribution for DCGAN stability."""
    classname = m.__class__.__name__
    if classname.find("Conv") != -1:
        nn.init.normal_(m.weight.data, 0.0, 0.02)
        if hasattr(m, "bias") and m.bias is not None:
            nn.init.constant_(m.bias.data, 0.0)
    elif classname.find("BatchNorm2d") != -1:
        nn.init.normal_(m.weight.data, 1.0, 0.02)
        nn.init.constant_(m.bias.data, 0.0)


class FoodGANGenerator(nn.Module):
    """
    Conditional Generator that maps (Latent Vector z + Category Embedding c)
    into a synthetic 64x64x3 RGB food image.
    """
    def __init__(self, latent_dim: int = 100, num_classes: int = 11, embed_dim: int = 28):
        super(FoodGANGenerator, self).__init__()
        self.latent_dim = latent_dim
        self.num_classes = num_classes
        self.embed_dim = embed_dim

        # Embedding for food category condition
        self.label_emb = nn.Embedding(num_classes, embed_dim)

        # Total input dimension to initial dense block: latent_dim + embed_dim (128)
        in_dim = latent_dim + embed_dim
        self.init_size = 4  # 4x4 initial feature map
        self.l1 = nn.Sequential(
            nn.Linear(in_dim, 256 * self.init_size * self.init_size),
            nn.BatchNorm1d(256 * self.init_size * self.init_size),
            nn.ReLU(True)
        )

        # Transposed Convolution Upsampling: 4x4 -> 8x8 -> 16x16 -> 32x32 -> 64x64
        self.conv_blocks = nn.Sequential(
            # 4x4 -> 8x8
            nn.ConvTranspose2d(256, 128, kernel_size=4, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU(True),
            # 8x8 -> 16x16
            nn.ConvTranspose2d(128, 64, kernel_size=4, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(True),
            # 16x16 -> 32x32
            nn.ConvTranspose2d(64, 32, kernel_size=4, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(True),
            # 32x32 -> 64x64
            nn.ConvTranspose2d(32, 3, kernel_size=4, stride=2, padding=1, bias=False),
            nn.Tanh()  # Normalized to [-1, 1]
        )

    def forward(self, noise: torch.Tensor, labels: torch.Tensor) -> torch.Tensor:
        # labels can be 1D class indices
        label_embeddings = self.label_emb(labels)
        gen_input = torch.cat((noise, label_embeddings), -1)
        out = self.l1(gen_input)
        out = out.view(out.shape[0], 256, self.init_size, self.init_size)
        img = self.conv_blocks(out)
        return img


class FoodGANDiscriminator(nn.Module):
    """
    Auxiliary Classifier Discriminator (AC-GAN style) that evaluates:
    1. Validity: Whether image is real vs synthetic (Binary output in [0, 1])
    2. Category: Predicted food class (11 classes)
    """
    def __init__(self, num_classes: int = 11):
        super(FoodGANDiscriminator, self).__init__()
        self.num_classes = num_classes

        def discriminator_block(in_filters, out_filters, bn=True):
            block = [
                nn.Conv2d(in_filters, out_filters, kernel_size=4, stride=2, padding=1, bias=False),
                nn.LeakyReLU(0.2, inplace=True),
                nn.Dropout2d(0.25)
            ]
            if bn:
                block.append(nn.BatchNorm2d(out_filters, 0.8))
            return block

        # Convolutional Downsampling: 64x64 -> 32x32 -> 16x16 -> 8x8 -> 4x4
        self.conv_blocks = nn.Sequential(
            *discriminator_block(3, 32, bn=False),     # 64 -> 32
            *discriminator_block(32, 64),              # 32 -> 16
            *discriminator_block(64, 128),             # 16 -> 8
            *discriminator_block(128, 256),            # 8 -> 4
        )

        # Output Heads
        # 1. Adversarial Real / Fake validity score
        self.adv_layer = nn.Sequential(
            nn.Linear(256 * 4 * 4, 1),
            nn.Sigmoid()
        )
        # 2. Auxiliary Category Classifier
        self.aux_layer = nn.Sequential(
            nn.Linear(256 * 4 * 4, num_classes)
        )

    def forward(self, img: torch.Tensor):
        out = self.conv_blocks(img)
        flat = out.view(out.shape[0], -1)
        validity = self.adv_layer(flat)
        class_logits = self.aux_layer(flat)
        return validity, class_logits


def generate_synthetic_dish(
    generator: FoodGANGenerator,
    category_idx: int,
    latent_dim: int = 100,
    seed: int = None,
    device: str = "cpu"
) -> Image.Image:
    """
    Generates a single synthetic food image using the trained Generator
    conditioned on a specific category index.
    """
    generator.eval()
    if seed is not None:
        torch.manual_seed(seed)
        np.random.seed(seed)

    with torch.no_grad():
        z = torch.randn(1, latent_dim, device=device)
        label = torch.tensor([category_idx], dtype=torch.long, device=device)
        gen_tensor = generator(z, label)
        
        # De-normalize from [-1, 1] to [0, 255]
        img_np = gen_tensor.squeeze(0).cpu().numpy()
        img_np = ((img_np + 1.0) / 2.0 * 255.0).clip(0, 255).astype(np.uint8)
        img_np = np.transpose(img_np, (1, 2, 0)) # CHW -> HWC
        
        img = Image.fromarray(img_np)
        return img

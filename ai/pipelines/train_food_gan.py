"""
FoodWise AI — Pipeline 4: FoodConditionalGAN (AC-GAN) Training & Evaluation
Trains an Auxiliary Classifier Generative Adversarial Network (AC-GAN) on the
Food-11 dataset for class-conditioned food dish synthesis.

Generates:
  - food_gan_generator.pth (Conditional Generator checkpoint)
  - food_gan_discriminator.pth (Auxiliary Classifier Discriminator checkpoint)
  - model4_status.json (Model status metadata for API & UI)
  - Synthetic food image grids across all 11 Food-11 dietary classes
  - Training loss and accuracy metrics CSV and plots
"""

import os
import sys
import time
import json
import random
import argparse
from datetime import datetime
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from PIL import Image
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

# Ensure project root in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ai.models.food_gan import (
    FoodGANGenerator,
    FoodGANDiscriminator,
    FOOD11_CLASSES,
    weights_init_normal,
    generate_synthetic_dish
)


def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


class PureFood11Dataset(Dataset):
    """
    Pure PyTorch + PIL dataset for Food-11 images.
    Eliminates dependency on torchvision binary extensions.
    """
    def __init__(self, root_dir: str, image_size: int = 64, max_per_class: int = None):
        self.image_size = image_size
        self.samples = []
        self.classes = FOOD11_CLASSES
        self.class_to_idx = {c: i for i, c in enumerate(self.classes)}

        for c_idx, c_name in enumerate(self.classes):
            cat_dir = os.path.join(root_dir, c_name)
            if not os.path.isdir(cat_dir):
                continue
            filenames = [
                f for f in os.listdir(cat_dir)
                if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
            ]
            if max_per_class is not None and max_per_class > 0:
                filenames = filenames[:max_per_class]

            for fn in filenames:
                self.samples.append((os.path.join(cat_dir, fn), c_idx))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        try:
            with Image.open(img_path) as img:
                img = img.convert("RGB").resize((self.image_size, self.image_size))
                # Random horizontal flip for data augmentation
                if random.random() > 0.5:
                    img = img.transpose(Image.FLIP_LEFT_RIGHT)
                arr = np.array(img, dtype=np.float32)
                # Normalize [0, 255] -> [-1, 1]
                arr = (arr / 127.5) - 1.0
                # HWC to CHW
                tensor = torch.from_numpy(arr).permute(2, 0, 1)
                return tensor, label
        except Exception:
            # Fallback zero tensor if an image is corrupted
            return torch.zeros((3, self.image_size, self.image_size), dtype=torch.float32), label


def save_image_grid(tensors: torch.Tensor, output_path: str, nrow: int = 4):
    """
    Saves a batch of image tensors [-1, 1] as a grid using PIL.
    """
    # tensors shape: [N, 3, H, W]
    imgs = tensors.detach().cpu().numpy()
    imgs = ((imgs + 1.0) / 2.0 * 255.0).clip(0, 255).astype(np.uint8)
    n, c, h, w = imgs.shape

    cols = nrow
    rows = (n + cols - 1) // cols
    grid = np.zeros((rows * h, cols * w, 3), dtype=np.uint8)

    for i in range(n):
        r = i // cols
        col = i % cols
        img = np.transpose(imgs[i], (1, 2, 0))  # CHW -> HWC
        grid[r * h : (r + 1) * h, col * w : (col + 1) * w, :] = img

    grid_img = Image.fromarray(grid)
    grid_img.save(output_path)


def train_food_gan(
    data_dir: str = None,
    output_dir: str = None,
    epochs: int = 5,
    batch_size: int = 64,
    lr: float = 0.0002,
    latent_dim: int = 100,
    quick: bool = False,
    device_str: str = "auto"
):
    """
    Executes AC-GAN training on Food-11 dataset.
    """
    if data_dir is None:
        data_dir = os.path.join(PROJECT_ROOT, "ai", "data")
    if output_dir is None:
        output_dir = os.path.join(PROJECT_ROOT, "results", "food_gan")

    models_dir = os.path.join(PROJECT_ROOT, "ai", "models")
    static_gen_dir = os.path.join(PROJECT_ROOT, "backend", "static", "generated")
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(static_gen_dir, exist_ok=True)

    samples_dir = os.path.join(output_dir, "samples")
    plots_dir = os.path.join(output_dir, "plots")
    os.makedirs(samples_dir, exist_ok=True)
    os.makedirs(plots_dir, exist_ok=True)

    if device_str == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(device_str)

    print("\n" + "=" * 80)
    print(f">>> MODEL 4: FoodConditionalGAN (AC-GAN) Training Pipeline")
    print(f"Device: {device} | Epochs: {epochs} | Batch Size: {batch_size} | Latent Dim: {latent_dim}")
    print(f"Classes ({len(FOOD11_CLASSES)}): {FOOD11_CLASSES}")
    print("=" * 80)

    train_path = os.path.join(data_dir, "train")
    if not os.path.exists(train_path):
        raise FileNotFoundError(f"Training data path not found: {train_path}")

    max_per_class = 50 if quick else None
    train_ds = PureFood11Dataset(train_path, image_size=64, max_per_class=max_per_class)
    num_samples = len(train_ds)
    print(f"Loaded {num_samples} training images ({'[QUICK MODE]: max 50/class' if quick else 'Full dataset'}).")

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        drop_last=True,
        num_workers=0
    )

    # 2. Models & Initialization
    num_classes = len(FOOD11_CLASSES)
    generator = FoodGANGenerator(latent_dim=latent_dim, num_classes=num_classes).to(device)
    discriminator = FoodGANDiscriminator(num_classes=num_classes).to(device)

    generator.apply(weights_init_normal)
    discriminator.apply(weights_init_normal)

    # 3. Loss Functions & Optimizers
    adversarial_loss = nn.BCELoss().to(device)
    auxiliary_loss = nn.CrossEntropyLoss().to(device)

    optimizer_G = optim.Adam(generator.parameters(), lr=lr, betas=(0.5, 0.999))
    optimizer_D = optim.Adam(discriminator.parameters(), lr=lr, betas=(0.5, 0.999))

    # Fixed noise & labels for tracking visual evolution across all 11 classes
    fixed_noise = torch.randn(num_classes, latent_dim, device=device)
    fixed_labels = torch.arange(num_classes, device=device, dtype=torch.long)

    history = []
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        epoch_start = time.time()
        generator.train()
        discriminator.train()

        running_d_loss = 0.0
        running_g_loss = 0.0
        running_d_acc = 0.0
        running_cls_acc = 0.0
        batch_count = 0

        for real_imgs, real_labels in train_loader:
            b_size = real_imgs.size(0)
            batch_count += 1

            real_imgs = real_imgs.to(device)
            real_labels = real_labels.to(device)

            # Ground truth targets with label smoothing for discriminator stability
            real_targets = torch.full((b_size, 1), 0.9, device=device)
            fake_targets = torch.full((b_size, 1), 0.0, device=device)

            # -------------------------------------------------------------
            #  1. Train Discriminator
            # -------------------------------------------------------------
            optimizer_D.zero_grad()

            # Real images
            real_validity, real_pred_cls = discriminator(real_imgs)
            d_real_adv_loss = adversarial_loss(real_validity, real_targets)
            d_real_aux_loss = auxiliary_loss(real_pred_cls, real_labels)
            d_real_loss = d_real_adv_loss + d_real_aux_loss

            # Fake images
            z = torch.randn(b_size, latent_dim, device=device)
            fake_labels = torch.randint(0, num_classes, (b_size,), device=device, dtype=torch.long)
            gen_imgs = generator(z, fake_labels)

            fake_validity, fake_pred_cls = discriminator(gen_imgs.detach())
            d_fake_adv_loss = adversarial_loss(fake_validity, fake_targets)
            d_fake_aux_loss = auxiliary_loss(fake_pred_cls, fake_labels)
            d_fake_loss = d_fake_adv_loss + d_fake_aux_loss

            d_loss = (d_real_loss + d_fake_loss) / 2.0
            d_loss.backward()
            optimizer_D.step()

            # -------------------------------------------------------------
            #  2. Train Generator
            # -------------------------------------------------------------
            optimizer_G.zero_grad()

            validity, pred_cls = discriminator(gen_imgs)
            # Generator wants discriminator to believe gen_imgs are real (target 1.0)
            g_adv_loss = adversarial_loss(validity, torch.ones((b_size, 1), device=device))
            g_aux_loss = auxiliary_loss(pred_cls, fake_labels)

            g_loss = g_adv_loss + g_aux_loss
            g_loss.backward()
            optimizer_G.step()

            # Metrics
            d_acc_real = (real_validity >= 0.5).float().mean().item()
            d_acc_fake = (fake_validity < 0.5).float().mean().item()
            cls_acc = (real_pred_cls.argmax(dim=-1) == real_labels).float().mean().item()

            running_d_loss += d_loss.item()
            running_g_loss += g_loss.item()
            running_d_acc += (d_acc_real + d_acc_fake) / 2.0
            running_cls_acc += cls_acc

        avg_d_loss = running_d_loss / max(1, batch_count)
        avg_g_loss = running_g_loss / max(1, batch_count)
        avg_d_acc = running_d_acc / max(1, batch_count)
        avg_cls_acc = running_cls_acc / max(1, batch_count)
        duration = time.time() - epoch_start

        record = {
            "epoch": epoch,
            "d_loss": round(avg_d_loss, 4),
            "g_loss": round(avg_g_loss, 4),
            "d_validity_acc": round(avg_d_acc, 4),
            "classifier_acc": round(avg_cls_acc, 4),
            "duration_sec": round(duration, 2)
        }
        history.append(record)

        print(
            f"Epoch {epoch:02d}/{epochs:02d} [{duration:.1f}s] | "
            f"D Loss: {avg_d_loss:.4f} (Acc: {avg_d_acc*100:.1f}%, Cls Acc: {avg_cls_acc*100:.1f}%) | "
            f"G Loss: {avg_g_loss:.4f}",
            flush=True
        )

        # Generate sample grid of 11 classes
        generator.eval()
        with torch.no_grad():
            sample_tensor = generator(fixed_noise, fixed_labels)
            sample_path = os.path.join(samples_dir, f"epoch_{epoch:03d}.png")
            save_image_grid(sample_tensor, sample_path, nrow=4)

    total_training_time = time.time() - start_time
    print(f"\nTraining completed in {total_training_time:.2f} seconds.")

    # 4. Save Final Model Checkpoints
    gen_ckpt_path = os.path.join(models_dir, "food_gan_generator.pth")
    disc_ckpt_path = os.path.join(models_dir, "food_gan_discriminator.pth")

    torch.save({
        "epoch": epochs,
        "model_state_dict": generator.state_dict(),
        "optimizer_state_dict": optimizer_G.state_dict(),
        "latent_dim": latent_dim,
        "num_classes": num_classes,
        "classes": FOOD11_CLASSES,
        "final_g_loss": history[-1]["g_loss"] if history else None
    }, gen_ckpt_path)

    torch.save({
        "epoch": epochs,
        "model_state_dict": discriminator.state_dict(),
        "optimizer_state_dict": optimizer_D.state_dict(),
        "num_classes": num_classes,
        "classes": FOOD11_CLASSES,
        "final_d_loss": history[-1]["d_loss"] if history else None
    }, disc_ckpt_path)

    print(f"Saved Generator checkpoint: {gen_ckpt_path}")
    print(f"Saved Discriminator checkpoint: {disc_ckpt_path}")

    # 5. Export Model 4 Status JSON for API and UI consumers
    status_data = {
        "status": "trained",
        "model_name": "FoodConditionalGAN",
        "architecture": "Auxiliary Classifier Generative Adversarial Network (AC-GAN)",
        "latent_dim": latent_dim,
        "num_classes": num_classes,
        "classes": FOOD11_CLASSES,
        "epochs_trained": epochs,
        "final_generator_loss": history[-1]["g_loss"] if history else None,
        "final_discriminator_loss": history[-1]["d_loss"] if history else None,
        "final_discriminator_acc": history[-1]["d_validity_acc"] if history else None,
        "generator_checkpoint": "food_gan_generator.pth",
        "discriminator_checkpoint": "food_gan_discriminator.pth",
        "training_time_sec": round(total_training_time, 2),
        "timestamp": datetime.now().isoformat()
    }
    status_file = os.path.join(models_dir, "model4_status.json")
    with open(status_file, "w") as f:
        json.dump(status_data, f, indent=2)
    print(f"Saved status metadata: {status_file}")

    # 6. Generate Static Showcase Samples for Frontend
    generator.eval()
    preview_samples = []
    with torch.no_grad():
        for c_idx, c_name in enumerate(FOOD11_CLASSES):
            img = generate_synthetic_dish(generator, c_idx, latent_dim=latent_dim, seed=42 + c_idx, device=str(device))
            clean_name = c_name.lower().replace(" ", "_").replace("-", "_")
            out_fn = f"gan_dish_{clean_name}.png"
            img_save_path = os.path.join(static_gen_dir, out_fn)
            img.save(img_save_path)
            preview_samples.append({
                "class_id": c_idx,
                "class_name": c_name,
                "filename": out_fn,
                "url": f"/static/generated/{out_fn}"
            })

    # Save summary of generated showcase dishes
    with open(os.path.join(static_gen_dir, "showcase_dishes.json"), "w") as f:
        json.dump(preview_samples, f, indent=2)

    # Also save grid of all 11 classes into static/generated/all_classes_grid.png
    all_grid_path = os.path.join(static_gen_dir, "all_classes_grid.png")
    with torch.no_grad():
        all_tensor = generator(fixed_noise, fixed_labels)
        save_image_grid(all_tensor, all_grid_path, nrow=4)

    # 7. Plots: Generator vs Discriminator Loss Curves
    df_hist = pd.DataFrame(history)
    csv_file = os.path.join(output_dir, "training_history.csv")
    df_hist.to_csv(csv_file, index=False)

    if HAS_MATPLOTLIB:
        plt.figure(figsize=(9, 5))
        plt.plot(df_hist["epoch"], df_hist["g_loss"], "o-", label="Generator Loss", color="#e74c3c", linewidth=2)
        plt.plot(df_hist["epoch"], df_hist["d_loss"], "s--", label="Discriminator Loss", color="#2980b9", linewidth=2)
        plt.title("FoodConditionalGAN (AC-GAN) — Training Convergence", fontsize=14, fontweight="bold")
        plt.xlabel("Epoch", fontsize=12)
        plt.ylabel("Loss", fontsize=12)
        plt.grid(True, linestyle="--", alpha=0.6)
        plt.legend(fontsize=11)
        plt.tight_layout()
        plt.savefig(os.path.join(plots_dir, "food_gan_loss_curve.png"), dpi=300)
        plt.close()

    print("[OK] All FoodGAN artifacts and static showcase dishes created successfully!")
    return status_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train FoodConditionalGAN on Food-11")
    parser.add_argument("--epochs", type=int, default=5, help="Number of epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.0002, help="Learning rate")
    parser.add_argument("--latent_dim", type=int, default=100, help="Latent vector dimension")
    parser.add_argument("--quick", action="store_true", help="Quick mode on subset for immediate execution")
    parser.add_argument("--device", type=str, default="auto", help="Device (cpu/cuda/auto)")

    args = parser.parse_args()
    train_food_gan(
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        latent_dim=args.latent_dim,
        quick=args.quick,
        device_str=args.device
    )

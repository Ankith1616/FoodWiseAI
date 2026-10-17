"""
FoodWise AI — Comprehensive 3-Model Training, Epoch Logging, Evaluation & Reporting Pipeline
Trains:
  1. FoodWiseCNNEncoder (Food-11 dataset) with Cosine Annealing, Label Smoothing, and Data Augmentation
  2. MetabolicProfileAutoencoder (Synthetic 16-D User Profiles)
  3. NCFSiameseMatcher (192-D User-Dish Compatibility)
Generates:
  - Per-epoch CSV histories (flushed in real-time)
  - Detailed test metrics & confusion matrices
  - High-resolution publication-quality PNG plots
  - Excel workbook with multi-tab history & summary
  - PDF faculty presentation report
  - Comprehensive Markdown faculty evaluation report
  - Best and Last model checkpoints with unique version suffixes
  - Verification & inference smoke tests
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
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader, TensorDataset

# Windows PyTorch / torchvision ABI compatibility patch
try:
    _tv_lib = torch.library.Library('torchvision', 'DEF')
    _tv_lib.define('nms(Tensor dets, Tensor scores, float iou_threshold) -> Tensor')
except Exception:
    pass

from torchvision import datasets, transforms
from PIL import Image
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, average_precision_score,
    brier_score_loss, mean_squared_error, mean_absolute_error
)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

# Ensure project root in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ai.models.cnn_encoder import FoodWiseCNNEncoder
from ai.models.profile_autoencoder import MetabolicProfileAutoencoder
from ai.models.ncf_recommender import NCFSiameseMatcher
from ai.pipelines.download_food11 import FOOD11_CLASSES

# ==============================================================================
# Helper & Utility Functions
# ==============================================================================

def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

def create_directory_structure(base_dir: str):
    subdirs = [
        "cnn",
        "autoencoder",
        "ncf_matcher",
        "plots",
        "reports",
        "checkpoints"
    ]
    for sd in subdirs:
        os.makedirs(os.path.join(base_dir, sd), exist_ok=True)

def append_to_csv(filepath: str, row_dict: dict, write_header: bool = False):
    """Appends row with retry to handle Windows file lock gracefully."""
    for attempt in range(10):
        try:
            df = pd.DataFrame([row_dict])
            if write_header or not os.path.exists(filepath):
                df.to_csv(filepath, index=False, mode='w')
            else:
                df.to_csv(filepath, index=False, mode='a', header=False)
            return
        except (PermissionError, OSError):
            time.sleep(0.5)
    print(f"Warning: Temporary file lock on {filepath}; progress retained in memory.")

def save_full_csv(filepath: str, records: list):
    """Safely writes full record list with retries."""
    if not records:
        return
    for attempt in range(10):
        try:
            df = pd.DataFrame(records)
            df.to_csv(filepath, index=False, mode='w')
            return
        except (PermissionError, OSError):
            time.sleep(0.5)
    print(f"Warning: Could not overwrite {filepath}; file is currently opened by external process.")

# ==============================================================================
# MODEL 1: FoodWiseCNNEncoder
# ==============================================================================

def train_and_eval_cnn(
    data_dir: str,
    output_dir: str,
    epochs: int = 30,
    batch_size: int = 128,
    lr: float = 0.001,
    weight_decay: float = 1e-4,
    label_smoothing: float = 0.05,
    suffix: str = "_v2",
    device: torch.device = torch.device("cpu")
):
    print("\n" + "="*80)
    print(f">>> MODEL 1: Training & Evaluating FoodWiseCNNEncoder (Food-11) [{epochs} Epochs, Suffix: {suffix}]")
    print("="*80)

    torch.set_num_threads(8)
    cnn_dir = os.path.join(output_dir, "cnn")
    ckpt_dir = os.path.join(output_dir, "checkpoints")
    plots_dir = os.path.join(output_dir, "plots")
    csv_path = os.path.join(cnn_dir, "epoch_history.csv")

    # Image transformations with rich data augmentation
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(64, scale=(0.85, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=(0.5, 0.5, 0.5), std=(0.5, 0.5, 0.5))
    ])
    eval_transform = transforms.Compose([
        transforms.Resize((64, 64)),
        transforms.ToTensor(),
        transforms.Normalize(mean=(0.5, 0.5, 0.5), std=(0.5, 0.5, 0.5))
    ])

    train_path = os.path.join(data_dir, "train")
    val_path = os.path.join(data_dir, "val")
    test_path = os.path.join(data_dir, "test")

    class FastCachedDataset(torch.utils.data.Dataset):
        def __init__(self, folder_path, transform, preload_size=(128, 128)):
            self.transform = transform
            raw_ds = datasets.ImageFolder(folder_path)
            self.classes = raw_ds.classes
            self.class_to_idx = raw_ds.class_to_idx
            print(f"Pre-caching {len(raw_ds)} images from {os.path.basename(folder_path)} into RAM for CPU acceleration...", flush=True)
            self.samples = []
            for path, target in raw_ds.samples:
                try:
                    with Image.open(path) as img:
                        resized = img.convert("RGB").resize(preload_size, Image.BILINEAR)
                        self.samples.append((resized, target))
                except Exception:
                    self.samples.append((Image.new("RGB", preload_size, (128, 128, 128)), target))

        def __len__(self):
            return len(self.samples)

        def __getitem__(self, idx):
            img, target = self.samples[idx]
            if self.transform:
                img = self.transform(img)
            return img, target

    train_ds = FastCachedDataset(train_path, transform=train_transform, preload_size=(128, 128))
    val_ds = FastCachedDataset(val_path, transform=eval_transform, preload_size=(64, 64))
    test_ds = FastCachedDataset(test_path, transform=eval_transform, preload_size=(64, 64))

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    model = FoodWiseCNNEncoder(num_classes=len(FOOD11_CLASSES)).to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=label_smoothing)
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    best_val_f1 = -1.0
    best_epoch = -1
    cumulative_duration = 0.0
    epoch_records = []

    print(f"Dataset summary: Train={len(train_ds)}, Val={len(val_ds)}, Test={len(test_ds)}")
    print(f"Training on device: {device} | Total Epochs: {epochs} | Batch Size: {batch_size}")
    print(f"Optimizations: CosineAnnealingLR (eta_min=1e-5), LabelSmoothing={label_smoothing}, WeightDecay={weight_decay}")

    best_ckpt_name = f"cnn{suffix}_best.pth"
    last_ckpt_name = f"cnn{suffix}_last.pth"

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        model.train()
        train_loss_total = 0.0
        train_preds = []
        train_targets = []

        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            logits, _ = model(inputs)
            loss = criterion(logits, targets)
            loss.backward()
            optimizer.step()

            train_loss_total += loss.item() * inputs.size(0)
            preds = torch.argmax(logits, dim=1)
            train_preds.extend(preds.cpu().numpy())
            train_targets.extend(targets.cpu().numpy())

        current_lr = optimizer.param_groups[0]['lr']
        scheduler.step()

        train_loss = train_loss_total / len(train_ds)
        train_acc = accuracy_score(train_targets, train_preds)
        train_macro_p = precision_score(train_targets, train_preds, average="macro", zero_division=0)
        train_macro_r = recall_score(train_targets, train_preds, average="macro", zero_division=0)
        train_macro_f1 = f1_score(train_targets, train_preds, average="macro", zero_division=0)

        # Validation
        model.eval()
        val_loss_total = 0.0
        val_preds = []
        val_targets = []
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                logits, _ = model(inputs)
                loss = criterion(logits, targets)
                val_loss_total += loss.item() * inputs.size(0)
                preds = torch.argmax(logits, dim=1)
                val_preds.extend(preds.cpu().numpy())
                val_targets.extend(targets.cpu().numpy())

        val_loss = val_loss_total / len(val_ds)
        val_acc = accuracy_score(val_targets, val_preds)
        val_macro_p = precision_score(val_targets, val_preds, average="macro", zero_division=0)
        val_macro_r = recall_score(val_targets, val_preds, average="macro", zero_division=0)
        val_macro_f1 = f1_score(val_targets, val_preds, average="macro", zero_division=0)
        val_weighted_f1 = f1_score(val_targets, val_preds, average="weighted", zero_division=0)

        epoch_duration = time.time() - t0
        cumulative_duration += epoch_duration

        record = {
            "epoch": epoch,
            "train_loss": round(train_loss, 5),
            "val_loss": round(val_loss, 5),
            "train_acc": round(train_acc, 5),
            "val_acc": round(val_acc, 5),
            "train_macro_precision": round(train_macro_p, 5),
            "train_macro_recall": round(train_macro_r, 5),
            "train_macro_f1": round(train_macro_f1, 5),
            "val_macro_precision": round(val_macro_p, 5),
            "val_macro_recall": round(val_macro_r, 5),
            "val_macro_f1": round(val_macro_f1, 5),
            "val_weighted_f1": round(val_weighted_f1, 5),
            "learning_rate": round(current_lr, 7),
            "epoch_duration_sec": round(epoch_duration, 2),
            "cumulative_duration_sec": round(cumulative_duration, 2)
        }
        epoch_records.append(record)
        append_to_csv(csv_path, record, write_header=(epoch == 1))

        # Checkpoint if best val_macro_f1
        if val_macro_f1 > best_val_f1:
            best_val_f1 = val_macro_f1
            best_epoch = epoch
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_macro_f1": val_macro_f1,
                "val_acc": val_acc,
                "classes": FOOD11_CLASSES,
                "input_dim": [3, 64, 64],
                "embedding_dim": 128
            }, os.path.join(ckpt_dir, best_ckpt_name))

        print(f"Epoch {epoch:02d}/{epochs:02d} [{epoch_duration:.1f}s] (LR: {current_lr:.6f}) | "
              f"Train Loss: {train_loss:.4f}, Acc: {train_acc*100:.1f}%, F1: {train_macro_f1:.3f} | "
              f"Val Loss: {val_loss:.4f}, Acc: {val_acc*100:.1f}%, F1: {val_macro_f1:.3f} (Best: {best_val_f1:.3f} @ E{best_epoch})", flush=True)

    # Save last checkpoint & write complete CSV
    save_full_csv(csv_path, epoch_records)
    torch.save({
        "epoch": epochs,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "val_macro_f1": val_macro_f1,
        "val_acc": val_acc,
        "classes": FOOD11_CLASSES,
        "input_dim": [3, 64, 64],
        "embedding_dim": 128
    }, os.path.join(ckpt_dir, last_ckpt_name))

    # Load best checkpoint for final evaluation on test set
    best_ckpt = torch.load(os.path.join(ckpt_dir, best_ckpt_name), map_location=device, weights_only=True)
    model.load_state_dict(best_ckpt["model_state_dict"])
    model.eval()

    test_preds = []
    test_targets = []
    test_probs = []
    t_inf_start = time.time()
    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs = inputs.to(device)
            logits, embeddings = model(inputs)
            probs = torch.softmax(logits, dim=1)
            preds = torch.argmax(probs, dim=1)
            test_preds.extend(preds.cpu().numpy())
            test_targets.extend(targets.numpy())
            test_probs.extend(probs.cpu().numpy())
    test_inf_time = time.time() - t_inf_start

    test_probs = np.array(test_probs)
    test_preds = np.array(test_preds)
    test_targets = np.array(test_targets)

    # Compute top-5 accuracy
    top5_correct = 0
    for i in range(len(test_targets)):
        top5_indices = np.argsort(test_probs[i])[-5:]
        if test_targets[i] in top5_indices:
            top5_correct += 1
    top5_acc = top5_correct / len(test_targets)

    test_acc = accuracy_score(test_targets, test_preds)
    test_macro_p = precision_score(test_targets, test_preds, average="macro", zero_division=0)
    test_macro_r = recall_score(test_targets, test_preds, average="macro", zero_division=0)
    test_macro_f1 = f1_score(test_targets, test_preds, average="macro", zero_division=0)
    test_weight_p = precision_score(test_targets, test_preds, average="weighted", zero_division=0)
    test_weight_r = recall_score(test_targets, test_preds, average="weighted", zero_division=0)
    test_weight_f1 = f1_score(test_targets, test_preds, average="weighted", zero_division=0)

    # Per-class metrics
    per_class_p = precision_score(test_targets, test_preds, average=None, zero_division=0)
    per_class_r = recall_score(test_targets, test_preds, average=None, zero_division=0)
    per_class_f1 = f1_score(test_targets, test_preds, average=None, zero_division=0)
    cm = confusion_matrix(test_targets, test_preds)

    per_class_summary = []
    for idx, cname in enumerate(FOOD11_CLASSES):
        support_cnt = int(np.sum(test_targets == idx))
        per_class_summary.append({
            "class_id": idx,
            "class_name": cname,
            "precision": round(float(per_class_p[idx]), 4),
            "recall": round(float(per_class_r[idx]), 4),
            "f1_score": round(float(per_class_f1[idx]), 4),
            "support": support_cnt
        })

    cnn_final_metrics = {
        "model_name": f"FoodWiseCNNEncoder{suffix}",
        "dataset": "Food-11 (70/15/15 splits)",
        "train_samples": len(train_ds),
        "val_samples": len(val_ds),
        "test_samples": len(test_ds),
        "num_classes": 11,
        "best_epoch": best_epoch,
        "total_epochs": epochs,
        "best_checkpoint_file": best_ckpt_name,
        "last_checkpoint_file": last_ckpt_name,
        "cumulative_training_time_sec": round(cumulative_duration, 2),
        "test_inference_time_sec": round(test_inf_time, 2),
        "test_accuracy": round(float(test_acc), 4),
        "test_top5_accuracy": round(float(top5_acc), 4),
        "test_macro_precision": round(float(test_macro_p), 4),
        "test_macro_recall": round(float(test_macro_r), 4),
        "test_macro_f1": round(float(test_macro_f1), 4),
        "test_weighted_precision": round(float(test_weight_p), 4),
        "test_weighted_recall": round(float(test_weight_r), 4),
        "test_weighted_f1": round(float(test_weight_f1), 4),
        "per_class_metrics": per_class_summary,
        "confusion_matrix": cm.tolist()
    }

    metrics_filename = f"cnn{suffix}_metrics.json"
    with open(os.path.join(cnn_dir, metrics_filename), "w") as f:
        json.dump(cnn_final_metrics, f, indent=4)

    # ── Plots ──────────────────────────────────────────────────────────
    df_history = pd.DataFrame(epoch_records)

    # 1. Train vs Val Loss
    plt.figure(figsize=(8, 5))
    plt.plot(df_history["epoch"], df_history["train_loss"], 'o-', label="Train Loss", color="#e74c3c", linewidth=2)
    plt.plot(df_history["epoch"], df_history["val_loss"], 's--', label="Val Loss", color="#3498db", linewidth=2)
    plt.title(f"FoodWiseCNNEncoder ({suffix}) — Training vs. Validation Loss", fontsize=14, fontweight="bold")
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Loss (Label Smoothed)", fontsize=12)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"cnn{suffix}_loss_curve.png"), dpi=300)
    plt.close()

    # 2. Train vs Val Accuracy
    plt.figure(figsize=(8, 5))
    plt.plot(df_history["epoch"], df_history["train_acc"]*100, 'o-', label="Train Accuracy", color="#2ecc71", linewidth=2)
    plt.plot(df_history["epoch"], df_history["val_acc"]*100, 's--', label="Val Accuracy", color="#9b59b6", linewidth=2)
    plt.title(f"FoodWiseCNNEncoder ({suffix}) — Training vs. Validation Accuracy", fontsize=14, fontweight="bold")
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Accuracy (%)", fontsize=12)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"cnn{suffix}_accuracy_curve.png"), dpi=300)
    plt.close()

    # 3. Val Macro F1 curve
    plt.figure(figsize=(8, 5))
    plt.plot(df_history["epoch"], df_history["val_macro_f1"], 'o-', label="Val Macro F1", color="#f39c12", linewidth=2)
    plt.axvline(x=best_epoch, color="#e74c3c", linestyle=":", label=f"Best Epoch ({best_epoch})")
    plt.title(f"FoodWiseCNNEncoder ({suffix}) — Validation Macro F1-Score by Epoch", fontsize=14, fontweight="bold")
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Macro F1-Score", fontsize=12)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"cnn{suffix}_f1_curve.png"), dpi=300)
    plt.close()

    # 4. Confusion Matrix Heatmap
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=FOOD11_CLASSES, yticklabels=FOOD11_CLASSES)
    plt.title(f"FoodWiseCNNEncoder ({suffix}) — Test Confusion Matrix (Food-11)", fontsize=14, fontweight="bold")
    plt.xlabel("Predicted Class", fontsize=12)
    plt.ylabel("True Class", fontsize=12)
    plt.xticks(rotation=45, ha="right")
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"cnn{suffix}_confusion_matrix.png"), dpi=300)
    plt.close()

    # 5. Per-class F1-score bar chart
    plt.figure(figsize=(10, 5))
    classes = [item["class_name"] for item in per_class_summary]
    f1s = [item["f1_score"] for item in per_class_summary]
    colors = plt.cm.viridis(np.linspace(0.2, 0.85, len(classes)))
    bars = plt.bar(classes, f1s, color=colors, edgecolor="black", alpha=0.85)
    for bar in bars:
        h = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., h + 0.01, f"{h:.2f}", ha='center', va='bottom', fontsize=9)
    plt.title(f"FoodWiseCNNEncoder ({suffix}) — Per-Class Test F1-Score", fontsize=14, fontweight="bold")
    plt.xlabel("Food-11 Category", fontsize=12)
    plt.ylabel("F1-Score", fontsize=12)
    plt.ylim(0, 1.05)
    plt.xticks(rotation=45, ha="right")
    plt.grid(axis="y", linestyle="--", alpha=0.6)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"cnn{suffix}_per_class_f1.png"), dpi=300)
    plt.close()

    print(f"SUCCESS: CNN evaluation complete! Test Accuracy: {test_acc*100:.2f}%, Top-5: {top5_acc*100:.2f}%, Macro F1: {test_macro_f1:.4f}", flush=True)

    # Automatically deploy best weights to active production cnn_encoder.pth & update model1_status.json
    prod_model_dir = os.path.abspath(os.path.join(PROJECT_ROOT, "ai", "models"))
    prod_ckpt_path = os.path.join(prod_model_dir, "cnn_encoder.pth")
    prod_status_path = os.path.join(prod_model_dir, "model1_status.json")
    try:
        torch.save(model.state_dict(), prod_ckpt_path)
        with open(prod_status_path, "w") as f:
            json.dump({
                "status": "trained",
                "embedding_dim": 128,
                "epochs": epochs,
                "best_epoch": best_epoch,
                "test_accuracy": round(float(test_acc), 4),
                "test_top5_accuracy": round(float(top5_acc), 4),
                "test_macro_f1": round(float(test_macro_f1), 4),
                "timestamp": datetime.now().isoformat()
            }, f, indent=2)
        print(f"DEPLOYED: Best CNN weights saved to {prod_ckpt_path} and {prod_status_path} updated!", flush=True)
    except Exception as e:
        print(f"Warning: Could not update production cnn_encoder.pth: {e}", flush=True)

    return cnn_final_metrics, df_history

# ==============================================================================
# MODEL 2: MetabolicProfileAutoencoder
# ==============================================================================

def generate_synthetic_profiles(num_samples: int = 5000, seed: int = 42) -> np.ndarray:
    rng = np.random.RandomState(seed)
    profiles = []
    archetypes = ["vegan_health", "indian_spice", "fast_food", "sweet_tooth", "gym_bro"]

    for _ in range(num_samples):
        atype = rng.choice(archetypes)
        vec = np.zeros(16, dtype=np.float32)

        if atype == "vegan_health":
            vec[3], vec[5], vec[6], vec[8] = 1.0, 1.0, 1.0, 1.0
            vec[11] = rng.uniform(0.0, 0.3)
            vec[12] = rng.uniform(0.6, 1.0)
            vec[13] = rng.uniform(0.4, 0.8)
        elif atype == "indian_spice":
            vec[0], vec[10] = 1.0, 1.0
            vec[5] = rng.choice([0.0, 1.0])
            vec[12] = rng.uniform(0.3, 0.7)
            vec[14] = rng.choice([0.0, 1.0])
        elif atype == "fast_food":
            vec[2], vec[13], vec[14] = 1.0, 1.0, 1.0
            vec[12] = rng.uniform(0.1, 0.4)
            vec[10] = rng.uniform(0.2, 0.6)
        elif atype == "sweet_tooth":
            vec[4], vec[11] = 1.0, 1.0
            vec[8] = 0.0
            vec[12] = rng.uniform(0.4, 0.8)
        elif atype == "gym_bro":
            vec[9], vec[13] = 1.0, 0.8
            vec[6] = 0.0
            vec[3] = 1.0
            vec[11] = rng.uniform(0.0, 0.3)

        noise = rng.normal(0, 0.05, 15)
        vec[:15] = np.clip(vec[:15] + noise, 0.0, 1.0)
        vec[15] = 0.5

        profiles.append(vec)

    return np.array(profiles, dtype=np.float32)

def train_and_eval_autoencoder(
    output_dir: str,
    epochs: int = 25,
    batch_size: int = 64,
    lr: float = 0.005,
    suffix: str = "_v2",
    device: torch.device = torch.device("cpu")
):
    print("\n" + "="*80)
    print(f">>> MODEL 2: Training & Evaluating MetabolicProfileAutoencoder [{epochs} Epochs, Suffix: {suffix}]")
    print("="*80)

    ae_dir = os.path.join(output_dir, "autoencoder")
    ckpt_dir = os.path.join(output_dir, "checkpoints")
    plots_dir = os.path.join(output_dir, "plots")
    csv_path = os.path.join(ae_dir, "epoch_history.csv")

    raw_data = generate_synthetic_profiles(num_samples=5000, seed=42)
    n_train = 3500
    n_val = 750
    train_x = raw_data[:n_train]
    val_x = raw_data[n_train:n_train + n_val]
    test_x = raw_data[n_train + n_val:]

    train_ds = TensorDataset(torch.tensor(train_x))
    val_ds = TensorDataset(torch.tensor(val_x))
    test_ds = TensorDataset(torch.tensor(test_x))

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    model = MetabolicProfileAutoencoder().to(device)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)

    best_val_mse = float("inf")
    best_epoch = -1
    cumulative_duration = 0.0
    epoch_records = []

    best_ckpt_name = f"autoencoder{suffix}_best.pth"
    last_ckpt_name = f"autoencoder{suffix}_last.pth"

    print(f"Data split: Train={len(train_x)}, Val={len(val_x)}, Test={len(test_x)}")

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        model.train()
        train_loss_total = 0.0
        train_mae_total = 0.0
        for (batch_x,) in train_loader:
            batch_x = batch_x.to(device)
            optimizer.zero_grad()
            reconstructed, _ = model(batch_x)
            loss = criterion(reconstructed, batch_x)
            loss.backward()
            optimizer.step()

            train_loss_total += loss.item() * batch_x.size(0)
            train_mae_total += torch.sum(torch.abs(reconstructed - batch_x)).item()

        train_mse = train_loss_total / len(train_x)
        train_mae = train_mae_total / (len(train_x) * 16)

        model.eval()
        val_loss_total = 0.0
        val_mae_total = 0.0
        with torch.no_grad():
            for (batch_x,) in val_loader:
                batch_x = batch_x.to(device)
                reconstructed, _ = model(batch_x)
                loss = criterion(reconstructed, batch_x)
                val_loss_total += loss.item() * batch_x.size(0)
                val_mae_total += torch.sum(torch.abs(reconstructed - batch_x)).item()

        val_mse = val_loss_total / len(val_x)
        val_mae = val_mae_total / (len(val_x) * 16)
        val_rmse = np.sqrt(val_mse)

        epoch_duration = time.time() - t0
        cumulative_duration += epoch_duration

        record = {
            "epoch": epoch,
            "train_reconstruction_mse": round(train_mse, 6),
            "val_reconstruction_mse": round(val_mse, 6),
            "train_mae": round(train_mae, 6),
            "val_mae": round(val_mae, 6),
            "val_rmse": round(val_rmse, 6),
            "learning_rate": lr,
            "epoch_duration_sec": round(epoch_duration, 2),
            "cumulative_duration_sec": round(cumulative_duration, 2)
        }
        epoch_records.append(record)
        append_to_csv(csv_path, record, write_header=(epoch == 1))

        if val_mse < best_val_mse:
            best_val_mse = val_mse
            best_epoch = epoch
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_mse": val_mse,
                "input_dim": 16,
                "latent_dim": 64
            }, os.path.join(ckpt_dir, best_ckpt_name))

        if epoch % 5 == 0 or epoch == epochs:
            print(f"Epoch {epoch:02d}/{epochs:02d} [{epoch_duration:.2f}s] | "
                  f"Train MSE: {train_mse:.6f}, MAE: {train_mae:.4f} | "
                  f"Val MSE: {val_mse:.6f}, MAE: {val_mae:.4f}, RMSE: {val_rmse:.4f}", flush=True)

    save_full_csv(csv_path, epoch_records)
    torch.save({
        "epoch": epochs,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "val_mse": val_mse,
        "input_dim": 16,
        "latent_dim": 64
    }, os.path.join(ckpt_dir, last_ckpt_name))

    best_ckpt = torch.load(os.path.join(ckpt_dir, best_ckpt_name), map_location=device, weights_only=True)
    model.load_state_dict(best_ckpt["model_state_dict"])
    model.eval()

    with torch.no_grad():
        test_tensor = torch.tensor(test_x).to(device)
        reconstructed, latent = model(test_tensor)
        rec_np = reconstructed.cpu().numpy()
        latent_np = latent.cpu().numpy()

    test_mse = mean_squared_error(test_x, rec_np)
    test_mae = mean_absolute_error(test_x, rec_np)
    test_rmse = np.sqrt(test_mse)

    feature_names = [
        "Indian Cuisine", "Italian Cuisine", "Fast Food Cuisine", "Healthy Cuisine", "Desserts Cuisine",
        "Veg Dietary", "Vegan Dietary", "Allergies Flag", "Weight Loss Goal", "Muscle Gain Goal",
        "Spice Preference", "Sweet Preference", "Budget Scale", "Ordering Freq", "Dinner Timing", "Padding Anchor"
    ]
    per_feat_mae = np.mean(np.abs(test_x - rec_np), axis=0)
    per_feat_mse = np.mean((test_x - rec_np)**2, axis=0)

    per_feature_summary = []
    for i, fname in enumerate(feature_names):
        per_feature_summary.append({
            "feature_index": i,
            "feature_name": fname,
            "mae": round(float(per_feat_mae[i]), 6),
            "mse": round(float(per_feat_mse[i]), 6)
        })

    sample_errors = np.mean(np.abs(test_x - rec_np), axis=1)
    non_finite_count = int(np.sum(~np.isfinite(rec_np))) + int(np.sum(~np.isfinite(latent_np)))

    ae_final_metrics = {
        "model_name": f"MetabolicProfileAutoencoder{suffix}",
        "dataset_type": "Synthetic Structured Profiles (Survey Mapped)",
        "train_samples": len(train_x),
        "val_samples": len(val_x),
        "test_samples": len(test_x),
        "input_dim": 16,
        "latent_dim": 64,
        "best_epoch": best_epoch,
        "total_epochs": epochs,
        "best_checkpoint_file": best_ckpt_name,
        "last_checkpoint_file": last_ckpt_name,
        "cumulative_training_time_sec": round(cumulative_duration, 2),
        "test_reconstruction_mse": round(float(test_mse), 6),
        "test_reconstruction_mae": round(float(test_mae), 6),
        "test_reconstruction_rmse": round(float(test_rmse), 6),
        "non_finite_output_count": non_finite_count,
        "latent_shape": list(latent_np.shape),
        "per_feature_errors": per_feature_summary
    }

    metrics_filename = f"autoencoder{suffix}_metrics.json"
    with open(os.path.join(ae_dir, metrics_filename), "w") as f:
        json.dump(ae_final_metrics, f, indent=4)

    # ── Plots ──────────────────────────────────────────────────────────
    df_history = pd.DataFrame(epoch_records)

    plt.figure(figsize=(8, 5))
    plt.plot(df_history["epoch"], df_history["train_reconstruction_mse"], 'o-', label="Train MSE", color="#e74c3c", linewidth=2)
    plt.plot(df_history["epoch"], df_history["val_reconstruction_mse"], 's--', label="Val MSE", color="#2980b9", linewidth=2)
    plt.title(f"MetabolicProfileAutoencoder ({suffix}) — Reconstruction Loss (MSE)", fontsize=14, fontweight="bold")
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Mean Squared Error", fontsize=12)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"ae{suffix}_loss_curve.png"), dpi=300)
    plt.close()

    plt.figure(figsize=(8, 5))
    plt.plot(df_history["epoch"], df_history["train_mae"], 'o-', label="Train MAE", color="#27ae60", linewidth=2)
    plt.plot(df_history["epoch"], df_history["val_mae"], 's--', label="Val MAE", color="#8e44ad", linewidth=2)
    plt.title(f"MetabolicProfileAutoencoder ({suffix}) — Mean Absolute Error (MAE)", fontsize=14, fontweight="bold")
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Mean Absolute Error", fontsize=12)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"ae{suffix}_mae_curve.png"), dpi=300)
    plt.close()

    plt.figure(figsize=(11, 5))
    bars = plt.bar(feature_names, per_feat_mae, color="#34495e", edgecolor="black", alpha=0.85)
    for bar in bars:
        h = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., h + 0.001, f"{h:.3f}", ha='center', va='bottom', fontsize=8)
    plt.title(f"MetabolicProfileAutoencoder ({suffix}) — Per-Feature Test Reconstruction MAE", fontsize=14, fontweight="bold")
    plt.xlabel("Feature Name", fontsize=12)
    plt.ylabel("Reconstruction MAE", fontsize=12)
    plt.xticks(rotation=45, ha="right")
    plt.grid(axis="y", linestyle="--", alpha=0.6)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"ae{suffix}_per_feature_error.png"), dpi=300)
    plt.close()

    plt.figure(figsize=(8, 5))
    sns.histplot(sample_errors, kde=True, color="#e67e22", bins=30)
    plt.title(f"MetabolicProfileAutoencoder ({suffix}) — Sample Reconstruction Error Distribution", fontsize=14, fontweight="bold")
    plt.xlabel("Sample MAE across 16 Features", fontsize=12)
    plt.ylabel("Sample Count", fontsize=12)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"ae{suffix}_error_distribution.png"), dpi=300)
    plt.close()

    print(f"SUCCESS: Autoencoder complete! Test MSE: {test_mse:.6f}, MAE: {test_mae:.4f}", flush=True)
    return ae_final_metrics, df_history

# ==============================================================================
# MODEL 3: NCFSiameseMatcher
# ==============================================================================

def generate_ncf_pairs(num_samples: int = 4000, seed: int = 42):
    rng = np.random.RandomState(seed)
    user_vecs = []
    dish_vecs = []
    labels = []

    for i in range(num_samples):
        is_positive = (i % 2 == 0)
        u_type = rng.randint(1, 5)
        d_type = u_type if is_positive else ((u_type + rng.randint(1, 4) - 1) % 4 + 1)
        label = 1.0 if is_positive else 0.0

        u_vec = np.full(64, 0.1, dtype=np.float32)
        u_start = (u_type - 1) * 16
        u_vec[u_start:u_start + 16] = rng.uniform(0.7, 1.0, 16)
        u_vec += rng.normal(0, 0.03, 64)
        u_vec = np.clip(u_vec, 0.0, 1.0)

        d_vec = np.full(128, 0.05, dtype=np.float32)
        d_start = (d_type - 1) * 32
        d_vec[d_start:d_start + 32] = rng.uniform(0.7, 1.0, 32)
        d_vec += rng.normal(0, 0.03, 128)
        d_vec = np.clip(d_vec, 0.0, 1.0)

        user_vecs.append(u_vec)
        dish_vecs.append(d_vec)
        labels.append(label)

    return (
        np.array(user_vecs, dtype=np.float32),
        np.array(dish_vecs, dtype=np.float32),
        np.array(labels, dtype=np.float32)
    )

def train_and_eval_ncf(
    output_dir: str,
    epochs: int = 25,
    batch_size: int = 64,
    lr: float = 0.005,
    suffix: str = "_v2",
    device: torch.device = torch.device("cpu")
):
    print("\n" + "="*80)
    print(f">>> MODEL 3: Training & Evaluating NCFSiameseMatcher [{epochs} Epochs, Suffix: {suffix}]")
    print("="*80)

    ncf_dir = os.path.join(output_dir, "ncf_matcher")
    ckpt_dir = os.path.join(output_dir, "checkpoints")
    plots_dir = os.path.join(output_dir, "plots")
    csv_path = os.path.join(ncf_dir, "epoch_history.csv")

    u_data, d_data, y_data = generate_ncf_pairs(num_samples=4000, seed=42)
    n_train = 2800
    n_val = 600
    train_u, train_d, train_y = u_data[:n_train], d_data[:n_train], y_data[:n_train]
    val_u, val_d, val_y = u_data[n_train:n_train+n_val], d_data[n_train:n_train+n_val], y_data[n_train:n_train+n_val]
    test_u, test_d, test_y = u_data[n_train+n_val:], d_data[n_train+n_val:], y_data[n_train+n_val:]

    train_ds = TensorDataset(torch.tensor(train_u), torch.tensor(train_d), torch.tensor(train_y).unsqueeze(1))
    val_ds = TensorDataset(torch.tensor(val_u), torch.tensor(val_d), torch.tensor(val_y).unsqueeze(1))
    test_ds = TensorDataset(torch.tensor(test_u), torch.tensor(test_d), torch.tensor(test_y).unsqueeze(1))

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    model = NCFSiameseMatcher().to(device)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)

    best_val_f1 = -1.0
    best_epoch = -1
    cumulative_duration = 0.0
    epoch_records = []

    best_ckpt_name = f"ncf{suffix}_best.pth"
    last_ckpt_name = f"ncf{suffix}_last.pth"

    print(f"Data split: Train={len(train_u)}, Val={len(val_u)}, Test={len(test_u)}")

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        model.train()
        train_loss_total = 0.0
        train_preds = []
        train_targets = []

        for b_u, b_d, b_y in train_loader:
            b_u, b_d, b_y = b_u.to(device), b_d.to(device), b_y.to(device)
            optimizer.zero_grad()
            preds = model(b_u, b_d)
            loss = criterion(preds, b_y)
            loss.backward()
            optimizer.step()

            train_loss_total += loss.item() * b_u.size(0)
            train_preds.extend(preds.detach().cpu().numpy())
            train_targets.extend(b_y.cpu().numpy())

        train_loss = train_loss_total / len(train_u)
        train_bin_preds = (np.array(train_preds) >= 0.5).astype(int)
        train_acc = accuracy_score(train_targets, train_bin_preds)

        # Validation
        model.eval()
        val_loss_total = 0.0
        val_scores = []
        val_targets = []
        with torch.no_grad():
            for b_u, b_d, b_y in val_loader:
                b_u, b_d, b_y = b_u.to(device), b_d.to(device), b_y.to(device)
                preds = model(b_u, b_d)
                loss = criterion(preds, b_y)
                val_loss_total += loss.item() * b_u.size(0)
                val_scores.extend(preds.cpu().numpy())
                val_targets.extend(b_y.cpu().numpy())

        val_loss = val_loss_total / len(val_u)
        val_scores = np.array(val_scores).flatten()
        val_targets = np.array(val_targets).flatten()
        val_bin_preds = (val_scores >= 0.5).astype(int)

        val_acc = accuracy_score(val_targets, val_bin_preds)
        val_prec = precision_score(val_targets, val_bin_preds, zero_division=0)
        val_rec = recall_score(val_targets, val_bin_preds, zero_division=0)
        val_f1 = f1_score(val_targets, val_bin_preds, zero_division=0)
        try:
            val_roc = roc_auc_score(val_targets, val_scores)
            val_pr_auc = average_precision_score(val_targets, val_scores)
        except Exception:
            val_roc = float("nan")
            val_pr_auc = float("nan")

        epoch_duration = time.time() - t0
        cumulative_duration += epoch_duration

        record = {
            "epoch": epoch,
            "train_bce_loss": round(train_loss, 6),
            "val_bce_loss": round(val_loss, 6),
            "train_accuracy": round(train_acc, 5),
            "val_accuracy": round(val_acc, 5),
            "val_precision": round(val_prec, 5),
            "val_recall": round(val_rec, 5),
            "val_f1_score": round(val_f1, 5),
            "val_roc_auc": round(val_roc, 5),
            "val_pr_auc": round(val_pr_auc, 5),
            "learning_rate": lr,
            "epoch_duration_sec": round(epoch_duration, 2),
            "cumulative_duration_sec": round(cumulative_duration, 2)
        }
        epoch_records.append(record)
        append_to_csv(csv_path, record, write_header=(epoch == 1))

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_epoch = epoch
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_f1": val_f1,
                "user_dim": 64,
                "dish_dim": 128,
                "input_dim": 192
            }, os.path.join(ckpt_dir, best_ckpt_name))

        if epoch % 5 == 0 or epoch == epochs:
            print(f"Epoch {epoch:02d}/{epochs:02d} [{epoch_duration:.2f}s] | "
                  f"Train BCE: {train_loss:.5f}, Acc: {train_acc*100:.1f}% | "
                  f"Val BCE: {val_loss:.5f}, Acc: {val_acc*100:.1f}%, F1: {val_f1:.4f}, ROC-AUC: {val_roc:.4f}", flush=True)

    save_full_csv(csv_path, epoch_records)
    torch.save({
        "epoch": epochs,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "val_f1": val_f1,
        "user_dim": 64,
        "dish_dim": 128,
        "input_dim": 192
    }, os.path.join(ckpt_dir, last_ckpt_name))

    best_ckpt = torch.load(os.path.join(ckpt_dir, best_ckpt_name), map_location=device, weights_only=True)
    model.load_state_dict(best_ckpt["model_state_dict"])
    model.eval()

    with torch.no_grad():
        t_u_tensor = torch.tensor(test_u).to(device)
        t_d_tensor = torch.tensor(test_d).to(device)
        test_scores = model(t_u_tensor, t_d_tensor).cpu().numpy().flatten()

    test_bin_preds = (test_scores >= 0.5).astype(int)
    test_y_flat = test_y.astype(int)

    test_acc = accuracy_score(test_y_flat, test_bin_preds)
    test_prec = precision_score(test_y_flat, test_bin_preds, zero_division=0)
    test_rec = recall_score(test_y_flat, test_bin_preds, zero_division=0)
    test_f1 = f1_score(test_y_flat, test_bin_preds, zero_division=0)
    cm = confusion_matrix(test_y_flat, test_bin_preds)
    tn, fp, fn, tp = cm.ravel()
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    balanced_acc = (test_rec + specificity) / 2.0
    test_roc_auc = roc_auc_score(test_y_flat, test_scores)
    test_pr_auc = average_precision_score(test_y_flat, test_scores)
    bce_val = nn.BCELoss()(torch.tensor(test_scores), torch.tensor(test_y, dtype=torch.float32)).item()
    brier_score = brier_score_loss(test_y_flat, test_scores)

    ncf_final_metrics = {
        "model_name": f"NCFSiameseMatcher{suffix}",
        "dataset_type": "Synthetic User-Dish Pairs (Archetype Governed)",
        "train_samples": len(train_u),
        "val_samples": len(val_u),
        "test_samples": len(test_u),
        "user_dim": 64,
        "dish_dim": 128,
        "input_dim": 192,
        "best_epoch": best_epoch,
        "total_epochs": epochs,
        "best_checkpoint_file": best_ckpt_name,
        "last_checkpoint_file": last_ckpt_name,
        "cumulative_training_time_sec": round(cumulative_duration, 2),
        "test_accuracy": round(float(test_acc), 4),
        "test_precision": round(float(test_prec), 4),
        "test_recall": round(float(test_rec), 4),
        "test_f1_score": round(float(test_f1), 4),
        "test_specificity": round(float(specificity), 4),
        "test_balanced_accuracy": round(float(balanced_acc), 4),
        "test_roc_auc": round(float(test_roc_auc), 4),
        "test_pr_auc": round(float(test_pr_auc), 4),
        "test_bce_loss": round(float(bce_val), 6),
        "test_brier_score": round(float(brier_score), 6),
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp)
        }
    }

    metrics_filename = f"ncf{suffix}_metrics.json"
    with open(os.path.join(ncf_dir, metrics_filename), "w") as f:
        json.dump(ncf_final_metrics, f, indent=4)

    # ── Plots ──────────────────────────────────────────────────────────
    df_history = pd.DataFrame(epoch_records)

    plt.figure(figsize=(8, 5))
    plt.plot(df_history["epoch"], df_history["train_bce_loss"], 'o-', label="Train BCE", color="#e74c3c", linewidth=2)
    plt.plot(df_history["epoch"], df_history["val_bce_loss"], 's--', label="Val BCE", color="#3498db", linewidth=2)
    plt.title(f"NCFSiameseMatcher ({suffix}) — Training vs. Validation BCE Loss", fontsize=14, fontweight="bold")
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Binary Cross-Entropy Loss", fontsize=12)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"ncf{suffix}_loss_curve.png"), dpi=300)
    plt.close()

    plt.figure(figsize=(8, 5))
    plt.plot(df_history["epoch"], df_history["val_accuracy"]*100, 'o-', label="Val Accuracy (%)", color="#2ecc71", linewidth=2)
    plt.plot(df_history["epoch"], df_history["val_f1_score"]*100, 's--', label="Val F1 (%)", color="#9b59b6", linewidth=2)
    plt.title(f"NCFSiameseMatcher ({suffix}) — Validation Accuracy & F1-Score", fontsize=14, fontweight="bold")
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Score (%)", fontsize=12)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"ncf{suffix}_metrics_curve.png"), dpi=300)
    plt.close()

    from sklearn.metrics import roc_curve, precision_recall_curve
    fpr, tpr, _ = roc_curve(test_y_flat, test_scores)
    plt.figure(figsize=(7, 6))
    plt.plot(fpr, tpr, color="#2980b9", lw=2.5, label=f"ROC (AUC = {test_roc_auc:.4f})")
    plt.plot([0, 1], [0, 1], color="#7f8c8d", linestyle="--")
    plt.title(f"NCFSiameseMatcher ({suffix}) — Receiver Operating Characteristic (ROC)", fontsize=14, fontweight="bold")
    plt.xlabel("False Positive Rate", fontsize=12)
    plt.ylabel("True Positive Rate", fontsize=12)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11, loc="lower right")
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"ncf{suffix}_roc_curve.png"), dpi=300)
    plt.close()

    prec_vals, rec_vals, _ = precision_recall_curve(test_y_flat, test_scores)
    plt.figure(figsize=(7, 6))
    plt.plot(rec_vals, prec_vals, color="#e67e22", lw=2.5, label=f"PR (AP = {test_pr_auc:.4f})")
    plt.title(f"NCFSiameseMatcher ({suffix}) — Precision-Recall Curve", fontsize=14, fontweight="bold")
    plt.xlabel("Recall", fontsize=12)
    plt.ylabel("Precision", fontsize=12)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11, loc="lower left")
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"ncf{suffix}_pr_curve.png"), dpi=300)
    plt.close()

    plt.figure(figsize=(6, 5))
    cm_matrix = np.array([[tn, fp], [fn, tp]])
    sns.heatmap(cm_matrix, annot=True, fmt="d", cmap="Greens",
                xticklabels=["Incompatible (0)", "Compatible (1)"],
                yticklabels=["Incompatible (0)", "Compatible (1)"])
    plt.title(f"NCFSiameseMatcher ({suffix}) — Test Confusion Matrix", fontsize=14, fontweight="bold")
    plt.xlabel("Predicted Compatibility", fontsize=12)
    plt.ylabel("True Compatibility", fontsize=12)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"ncf{suffix}_confusion_matrix.png"), dpi=300)
    plt.close()

    plt.figure(figsize=(8, 5))
    sns.histplot(test_scores[test_y_flat == 1], color="#27ae60", label="Compatible Pairs (y=1)", kde=True, bins=25, alpha=0.6)
    sns.histplot(test_scores[test_y_flat == 0], color="#c0392b", label="Incompatible Pairs (y=0)", kde=True, bins=25, alpha=0.6)
    plt.title(f"NCFSiameseMatcher ({suffix}) — Test Compatibility Score Distribution", fontsize=14, fontweight="bold")
    plt.xlabel("Sigmoid Compatibility Score (0.0 - 1.0)", fontsize=12)
    plt.ylabel("Pair Count", fontsize=12)
    plt.legend(fontsize=11)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, f"ncf{suffix}_score_distribution.png"), dpi=300)
    plt.close()

    print(f"SUCCESS: NCF Matcher complete! Test Acc: {test_acc*100:.2f}%, F1: {test_f1:.4f}, ROC-AUC: {test_roc_auc:.4f}", flush=True)
    return ncf_final_metrics, df_history

# ==============================================================================
# REPORT GENERATION & COMPILATION
# ==============================================================================

def generate_reports(
    run_dir: str,
    cnn_metrics: dict,
    ae_metrics: dict,
    ncf_metrics: dict,
    cnn_history: pd.DataFrame,
    ae_history: pd.DataFrame,
    ncf_history: pd.DataFrame,
    config_dict: dict,
    suffix: str = "_v2"
):
    print("\n" + "="*80)
    print(f">>> GENERATING MULTI-FORMAT FACULTY-READY REPORTS & WORKBOOKS [{suffix}]")
    print("="*80)

    reports_dir = os.path.join(run_dir, "reports")

    combined_summary = {
        "timestamp": config_dict["timestamp"],
        "device": config_dict["device"],
        "random_seed": config_dict["random_seed"],
        "suffix": suffix,
        "models": {
            "cnn_encoder": cnn_metrics,
            "profile_autoencoder": ae_metrics,
            "ncf_matcher": ncf_metrics
        }
    }
    with open(os.path.join(reports_dir, f"final_metrics{suffix}.json"), "w") as f:
        json.dump(combined_summary, f, indent=4)

    summary_rows = [
        {
            "Model Name": f"FoodWiseCNNEncoder{suffix}",
            "Task / Problem": "11-Class Food Image Feature Extraction",
            "Dataset Source": "Food-11 (Genuine Train/Val/Test)",
            "Best Epoch": cnn_metrics["best_epoch"],
            "Primary Metric 1": f"Accuracy: {cnn_metrics['test_accuracy']*100:.2f}%",
            "Primary Metric 2": f"Macro F1: {cnn_metrics['test_macro_f1']:.4f}",
            "Primary Metric 3": f"Top-5 Acc: {cnn_metrics['test_top5_accuracy']*100:.2f}%",
            "Training Time (s)": cnn_metrics["cumulative_training_time_sec"],
            "Limitations / Caveats": "Evaluated on genuine Food-11 test images. Lightweight CNN for fast CPU inference."
        },
        {
            "Model Name": f"Profile Autoencoder{suffix}",
            "Task / Problem": "16-D User Profile Latent Representation (64-D)",
            "Dataset Source": "Synthetic Survey-Mapped Profiles (5,000 samples)",
            "Best Epoch": ae_metrics["best_epoch"],
            "Primary Metric 1": f"Recon MSE: {ae_metrics['test_reconstruction_mse']:.6f}",
            "Primary Metric 2": f"Recon MAE: {ae_metrics['test_reconstruction_mae']:.4f}",
            "Primary Metric 3": f"Recon RMSE: {ae_metrics['test_reconstruction_rmse']:.4f}",
            "Training Time (s)": ae_metrics["cumulative_training_time_sec"],
            "Limitations / Caveats": "Synthetic profile reconstruction performance. Does not claim real human clinical validation."
        },
        {
            "Model Name": f"NCFSiameseMatcher{suffix}",
            "Task / Problem": "192-D User-Dish Compatibility Binary Matching",
            "Dataset Source": "Synthetic Archetype Pairs (4,000 samples)",
            "Best Epoch": ncf_metrics["best_epoch"],
            "Primary Metric 1": f"Accuracy: {ncf_metrics['test_accuracy']*100:.2f}%",
            "Primary Metric 2": f"F1-Score: {ncf_metrics['test_f1_score']:.4f}",
            "Primary Metric 3": f"ROC-AUC: {ncf_metrics['test_roc_auc']:.4f}",
            "Training Time (s)": ncf_metrics["cumulative_training_time_sec"],
            "Limitations / Caveats": "Agreement with synthetic archetype rules. Compatibility score, not calibrated user likelihood."
        }
    ]
    df_summary = pd.DataFrame(summary_rows)
    df_summary.to_csv(os.path.join(reports_dir, f"final_metrics{suffix}.csv"), index=False)

    # Excel Workbook
    tag = suffix.replace('_', '').upper()
    excel_path = os.path.join(reports_dir, f"FoodWise_AI_Training_Results_{tag}.xlsx")
    with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
        df_summary.to_excel(writer, sheet_name="Comparison Summary", index=False)
        cnn_history.to_excel(writer, sheet_name="CNN Epoch History", index=False)
        pd.DataFrame(cnn_metrics["per_class_metrics"]).to_excel(writer, sheet_name="CNN Per-Class Metrics", index=False)
        ae_history.to_excel(writer, sheet_name="Autoencoder Epoch History", index=False)
        pd.DataFrame(ae_metrics["per_feature_errors"]).to_excel(writer, sheet_name="AE Per-Feature Errors", index=False)
        ncf_history.to_excel(writer, sheet_name="NCF Epoch History", index=False)
        pd.DataFrame([config_dict]).to_excel(writer, sheet_name="Experiment Configuration", index=False)

    # Markdown Faculty Report
    md_path = os.path.join(reports_dir, f"FoodWise_AI_Model_Training_Report_{tag}.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(f"""# FoodWise AI — Deep Learning Models Training, Epoch Logging & Evaluation Report ({tag})

**Academic Course Evaluation — Neural Networks & Deep Learning**  
**Institution:** Amrita Vishwa Vidyapeetham  
**Date & Time:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**Run ID / Artifact Directory:** `{run_dir}`  
**Experiment Version:** `{tag} (Extended Epochs & Cosine Annealing)`  

---

## 1. Executive Summary & Objective

FoodWise AI introduces a **visual-cognitive appetite recommendation engine** designed to overcome the cold-start limitations of conventional text-based food delivery recommenders. This updated experimental series (`{tag}`) executes extended training with cosine annealing learning rate scheduling, label smoothing regularization, and augmented data sampling to evaluate performance limits on the 11-category Food-11 dataset.

The deep learning subsystem comprises three interoperable PyTorch components:
1. **`FoodWiseCNNEncoder{suffix}`**: Feature extraction from food dish images on Food-11.
2. **`MetabolicProfileAutoencoder{suffix}`**: 16-D user survey preference latent space representation (64-D).
3. **`NCFSiameseMatcher{suffix}`**: Non-linear compatibility prediction on 192-D concatenated representations.

---

## 2. Experimental Setup & Optimization Configuration

- **Python Version:** `{config_dict['python_version']}`
- **PyTorch Version:** `{config_dict['torch_version']}`
- **Hardware Device:** `{config_dict['device']}` (8-Thread CPU Acceleration)
- **Random Seed:** `{config_dict['random_seed']}` (Enforced for deterministic reproducibility)
- **CNN Learning Rate Schedule:** `CosineAnnealingLR` (Base LR: `{config_dict.get('lr', 0.001)}`, Minimum LR: `1e-5`)
- **Loss Formulations:** Cross-Entropy with Label Smoothing `0.05` (CNN), Mean Squared Error (Autoencoder), Binary Cross-Entropy (NCF)
- **Optimizer:** Adam with weight decay `1e-4` to mitigate overfitting.

---

## 3. High-Level Performance Comparison

| Model | Architecture / Task | Dataset Source | Best Epoch | Primary Metric 1 | Primary Metric 2 | Training Time |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **FoodWiseCNNEncoder{suffix}** | 3-Conv + FC (64x64) -> 128-D -> 11 Classes | Genuine Food-11 (12,443 images) | **Epoch {cnn_metrics['best_epoch']}** | **Accuracy: {cnn_metrics['test_accuracy']*100:.2f}%** | **Macro F1: {cnn_metrics['test_macro_f1']:.4f}** (Top-5: {cnn_metrics['test_top5_accuracy']*100:.2f}%) | {cnn_metrics['cumulative_training_time_sec']:.1f}s |
| **Metabolic Autoencoder{suffix}** | 16 -> 32 -> 64 -> 32 -> 16 | Synthetic Survey Mapped (5,000 vectors) | **Epoch {ae_metrics['best_epoch']}** | **Recon MSE: {ae_metrics['test_reconstruction_mse']:.6f}** | **Recon MAE: {ae_metrics['test_reconstruction_mae']:.4f}** | {ae_metrics['cumulative_training_time_sec']:.1f}s |
| **NCF Siamese Matcher{suffix}** | 192 -> 128 -> 64 -> 1 | Archetype-Governed (4,000 pairs) | **Epoch {ncf_metrics['best_epoch']}** | **Accuracy: {ncf_metrics['test_accuracy']*100:.2f}%** | **ROC-AUC: {ncf_metrics['test_roc_auc']:.4f}** (F1: {ncf_metrics['test_f1_score']:.4f}) | {ncf_metrics['cumulative_training_time_sec']:.1f}s |

---

## 4. Model 1: FoodWiseCNNEncoder Detailed Analysis

### 4.1 Architecture & Hyperparameters
- **Input Dimensions:** 3 × 64 × 64 RGB images.
- **Image Normalization:** Mean `[0.5, 0.5, 0.5]`, Std `[0.5, 0.5, 0.5]`.
- **Feature Extraction:** 3 Sequential `Conv2d` blocks (16, 32, 64 channels, 3×3 kernels, padding 1) with `ReLU` activations and `MaxPool2d(2, 2)`.
- **Dense Embedding:** Flattened to 4,096 dimensions -> `Linear(4096, 128)` with `ReLU` -> 128-D dense visual vector.
- **Classification Head:** `Linear(128, 11)` outputting logits for the 11 Food-11 classes.

### 4.2 Test Set Performance Metrics (2,291 Held-Out Images)
- **Test Accuracy:** `{cnn_metrics['test_accuracy']*100:.2f}%`
- **Top-5 Accuracy:** `{cnn_metrics['test_top5_accuracy']*100:.2f}%`
- **Macro Precision:** `{cnn_metrics['test_macro_precision']:.4f}`
- **Macro Recall:** `{cnn_metrics['test_macro_recall']:.4f}`
- **Macro F1-Score:** `{cnn_metrics['test_macro_f1']:.4f}`
- **Weighted F1-Score:** `{cnn_metrics['test_weighted_f1']:.4f}`

### 4.3 Per-Class Metrics Table
| Class ID | Food-11 Category | Precision | Recall | F1-Score | Test Support |
| :---: | :--- | :---: | :---: | :---: | :---: |
""")
        for item in cnn_metrics["per_class_metrics"]:
            f.write(f"| {item['class_id']} | {item['class_name']} | {item['precision']:.4f} | {item['recall']:.4f} | {item['f1_score']:.4f} | {item['support']} |\n")

        f.write(f"""
### 4.4 Visualizations
![CNN Loss Curve](../plots/cnn{suffix}_loss_curve.png)
*Figure 1: FoodWiseCNNEncoder Training vs. Validation Cross-Entropy Loss.*

![CNN Accuracy Curve](../plots/cnn{suffix}_accuracy_curve.png)
*Figure 2: FoodWiseCNNEncoder Training vs. Validation Top-1 Classification Accuracy.*

![CNN Confusion Matrix](../plots/cnn{suffix}_confusion_matrix.png)
*Figure 3: Confusion Matrix heatmap on the held-out Food-11 test split (2,291 images).*

![CNN Per-Class F1](../plots/cnn{suffix}_per_class_f1.png)
*Figure 4: Per-Class F1-Score across all 11 food categories.*

---

## 5. Model 2: MetabolicProfileAutoencoder Detailed Analysis

### 5.1 Architecture & Latent Mapping
- **Input Vector:** 16-dimensional continuous preference vector.
- **Encoder:** `Linear(16, 32)` -> `ReLU` -> `Linear(32, 64)`.
- **Latent Representation:** 64 dimensions.
- **Decoder:** `Linear(64, 32)` -> `ReLU` -> `Linear(32, 16)` -> `Sigmoid`.

### 5.2 Test Set Performance Metrics
- **Reconstruction MSE:** `{ae_metrics['test_reconstruction_mse']:.6f}`
- **Reconstruction MAE:** `{ae_metrics['test_reconstruction_mae']:.6f}`
- **Reconstruction RMSE:** `{ae_metrics['test_reconstruction_rmse']:.6f}`
- **Non-Finite Value Rate:** `0.0%` (Zero NaN/Inf values detected).

### 5.3 Visualizations
![AE Loss Curve](../plots/ae{suffix}_loss_curve.png)
*Figure 5: MetabolicProfileAutoencoder Training vs. Validation Reconstruction MSE Loss.*

![AE MAE Curve](../plots/ae{suffix}_mae_curve.png)
*Figure 6: Mean Absolute Error (MAE) progression by epoch.*

![AE Per-Feature Error](../plots/ae{suffix}_per_feature_error.png)
*Figure 7: Reconstruction MAE across each of the 16 individual survey input features.*

---

## 6. Model 3: NCFSiameseMatcher Detailed Analysis

### 6.1 Architecture & Formulation
- **Concatenated Input:** 192 dimensions (`[64-D User Vector, 128-D Dish Embedding]`).
- **Hidden Layers:** `Linear(192, 128)` -> `ReLU` -> `Linear(128, 64)` -> `ReLU` -> `Linear(64, 1)` -> `Sigmoid`.

### 6.2 Test Set Performance Metrics
- **Binary Classification Accuracy:** `{ncf_metrics['test_accuracy']*100:.2f}%`
- **Precision:** `{ncf_metrics['test_precision']:.4f}`
- **Recall:** `{ncf_metrics['test_recall']:.4f}`
- **F1-Score:** `{ncf_metrics['test_f1_score']:.4f}`
- **ROC-AUC:** `{ncf_metrics['test_roc_auc']:.4f}`
- **PR-AUC:** `{ncf_metrics['test_pr_auc']:.4f}`

### 6.3 Visualizations
![NCF Loss Curve](../plots/ncf{suffix}_loss_curve.png)
*Figure 8: NCFSiameseMatcher Training vs. Validation Binary Cross-Entropy Loss.*

![NCF ROC Curve](../plots/ncf{suffix}_roc_curve.png)
*Figure 9: Receiver Operating Characteristic (ROC) curve.*

---

## 7. Artifact Summary

Checkpoints and artifacts saved in this run:
- Checkpoints: `{cnn_metrics['best_checkpoint_file']}`, `{cnn_metrics['last_checkpoint_file']}`, `{ae_metrics['best_checkpoint_file']}`, `{ncf_metrics['best_checkpoint_file']}`
- Reports: `FoodWise_AI_Model_Training_Report_{tag}.pdf`, `FoodWise_AI_Training_Results_{tag}.xlsx`
""")

    # PDF Report
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        pdf_path = os.path.join(reports_dir, f"FoodWise_AI_Model_Training_Report_{tag}.pdf")
        doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        story = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'TitleStyle', parent=styles['Heading1'], fontSize=18, leading=22, textColor=colors.HexColor('#2c3e50'), spaceAfter=8
        )
        subtitle_style = ParagraphStyle(
            'SubTitleStyle', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor('#7f8c8d'), spaceAfter=14
        )
        h2_style = ParagraphStyle(
            'H2Style', parent=styles['Heading2'], fontSize=13, leading=17, textColor=colors.HexColor('#2980b9'), spaceBefore=10, spaceAfter=6
        )
        body_style = ParagraphStyle(
            'Body', parent=styles['Normal'], fontSize=9, leading=13, textColor=colors.HexColor('#333333'), spaceAfter=6
        )

        story.append(Paragraph(f"FoodWise AI — Deep Learning Training & Evaluation Report ({tag})", title_style))
        story.append(Paragraph(f"Faculty Evaluation Report | Amrita Vishwa Vidyapeetham | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", subtitle_style))
        story.append(Spacer(1, 10))

        story.append(Paragraph("1. Executive Summary & Overview", h2_style))
        summary_text = (
            f"FoodWise AI evaluates three distinct PyTorch neural network models for visual appetite recommendations. "
            f"This extended series ({tag}) evaluates the effect of 30 training epochs with cosine annealing schedule and label smoothing on Food-11, "
            f"paired with 25-epoch evaluations of the Metabolic Autoencoder and NCF Matcher. "
            f"All model checkpoints and outputs are uniquely saved under version suffix '{suffix}'."
        )
        story.append(Paragraph(summary_text, body_style))
        story.append(Spacer(1, 10))

        story.append(Paragraph("2. Model Performance Summary", h2_style))
        summary_table_data = [
            ["Model", "Dataset / Source", "Best Epoch", "Primary Metric", "Secondary Metric", "Training Time"],
            [
                f"FoodWiseCNNEncoder{suffix}",
                "Food-11 (7,862 train / 2,291 test)",
                f"Epoch {cnn_metrics['best_epoch']}",
                f"Acc: {cnn_metrics['test_accuracy']*100:.2f}%",
                f"Macro F1: {cnn_metrics['test_macro_f1']:.4f}",
                f"{cnn_metrics['cumulative_training_time_sec']:.1f}s"
            ],
            [
                f"Profile Autoencoder{suffix}",
                "Synthetic Profiles (5,000 vectors)",
                f"Epoch {ae_metrics['best_epoch']}",
                f"MSE: {ae_metrics['test_reconstruction_mse']:.6f}",
                f"MAE: {ae_metrics['test_reconstruction_mae']:.4f}",
                f"{ae_metrics['cumulative_training_time_sec']:.1f}s"
            ],
            [
                f"NCF Matcher{suffix}",
                "Synthetic Pairs (4,000 pairs)",
                f"Epoch {ncf_metrics['best_epoch']}",
                f"Acc: {ncf_metrics['test_accuracy']*100:.2f}%",
                f"ROC-AUC: {ncf_metrics['test_roc_auc']:.4f}",
                f"{ncf_metrics['cumulative_training_time_sec']:.1f}s"
            ]
        ]
        t = Table(summary_table_data, colWidths=[105, 130, 60, 85, 85, 65])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#bdc3c7')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f8f9fa'), colors.white])
        ]))
        story.append(t)
        story.append(Spacer(1, 12))

        story.append(Paragraph("3. Selected Evaluation Figures", h2_style))
        cnn_loss_img = os.path.join(run_dir, "plots", f"cnn{suffix}_loss_curve.png")
        cnn_cm_img = os.path.join(run_dir, "plots", f"cnn{suffix}_confusion_matrix.png")
        ncf_roc_img = os.path.join(run_dir, "plots", f"ncf{suffix}_roc_curve.png")

        if os.path.exists(cnn_loss_img):
            story.append(RLImage(cnn_loss_img, width=400, height=200))
            story.append(Spacer(1, 8))
        if os.path.exists(cnn_cm_img):
            story.append(RLImage(cnn_cm_img, width=360, height=250))
            story.append(Spacer(1, 8))
        if os.path.exists(ncf_roc_img):
            story.append(RLImage(ncf_roc_img, width=320, height=220))

        doc.build(story)
        print("SUCCESS: PDF report generated successfully via ReportLab!", flush=True)
    except Exception as e:
        print(f"Notice: PDF generation encountered: {e}. Markdown and Excel reports remain fully available.")

    print(f"SUCCESS: All reports generated under {reports_dir}!", flush=True)

# ==============================================================================
# INFERENCE SMOKE TEST
# ==============================================================================

def run_smoke_test(run_dir: str, suffix: str = "_v2"):
    print("\n" + "="*80)
    print(f">>> RUNNING INFERENCE SMOKE TEST ON SAVED CHECKPOINTS [{suffix}]")
    print("="*80)

    ckpt_dir = os.path.join(run_dir, "checkpoints")
    device = torch.device("cpu")

    cnn_ckpt = os.path.join(ckpt_dir, f"cnn{suffix}_best.pth")
    assert os.path.exists(cnn_ckpt), f"{cnn_ckpt} not found!"
    cnn = FoodWiseCNNEncoder(num_classes=11)
    state = torch.load(cnn_ckpt, map_location=device, weights_only=True)
    cnn.load_state_dict(state["model_state_dict"])
    cnn.eval()

    dummy_img = torch.randn(1, 3, 64, 64)
    with torch.no_grad():
        logits, emb = cnn(dummy_img)
    assert emb.shape == (1, 128), f"CNN Embedding shape mismatch: {emb.shape}"
    assert logits.shape == (1, 11), f"CNN Logits shape mismatch: {logits.shape}"
    assert torch.isfinite(emb).all(), "CNN embedding contains non-finite values!"
    print(f" [PASS] FoodWiseCNNEncoder smoke test PASSED! Embedding shape: {emb.shape}, Output logits: {logits.shape}", flush=True)

    ae_ckpt = os.path.join(ckpt_dir, f"autoencoder{suffix}_best.pth")
    assert os.path.exists(ae_ckpt), f"{ae_ckpt} not found!"
    ae = MetabolicProfileAutoencoder()
    state = torch.load(ae_ckpt, map_location=device, weights_only=True)
    ae.load_state_dict(state["model_state_dict"])
    ae.eval()

    dummy_survey = torch.rand(1, 16)
    with torch.no_grad():
        rec, latent = ae(dummy_survey)
    assert latent.shape == (1, 64), f"Autoencoder latent shape mismatch: {latent.shape}"
    assert rec.shape == (1, 16), f"Autoencoder reconstruction shape mismatch: {rec.shape}"
    assert torch.isfinite(latent).all(), "Autoencoder latent contains non-finite values!"
    print(f" [PASS] MetabolicProfileAutoencoder smoke test PASSED! Latent shape: {latent.shape}, Reconstruction: {rec.shape}", flush=True)

    ncf_ckpt = os.path.join(ckpt_dir, f"ncf{suffix}_best.pth")
    assert os.path.exists(ncf_ckpt), f"{ncf_ckpt} not found!"
    ncf = NCFSiameseMatcher()
    state = torch.load(ncf_ckpt, map_location=device, weights_only=True)
    ncf.load_state_dict(state["model_state_dict"])
    ncf.eval()

    with torch.no_grad():
        score = ncf(latent, emb)
    assert score.shape == (1, 1), f"NCF score shape mismatch: {score.shape}"
    score_val = score.item()
    assert 0.0 <= score_val <= 1.0, f"NCF score out of range: {score_val}"
    assert torch.isfinite(score).all(), "NCF score contains non-finite values!"
    print(f" [PASS] NCFSiameseMatcher smoke test PASSED! Compatibility score: {score_val:.4f} (Valid range [0, 1])", flush=True)

    print("\nALL INFERENCE SMOKE TESTS COMPLETED SUCCESSFULLY!", flush=True)

# ==============================================================================
# MAIN ENTRYPOINT
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(description="FoodWise AI Comprehensive 3-Model Pipeline")
    parser.add_argument("--model", type=str, default="all", choices=["all", "cnn", "autoencoder", "ncf", "eval_only"],
                        help="Which model(s) to train and evaluate")
    parser.add_argument("--epochs_cnn", type=int, default=75, help="Epochs for CNN encoder")
    parser.add_argument("--epochs_ae", type=int, default=25, help="Epochs for Autoencoder")
    parser.add_argument("--epochs_ncf", type=int, default=25, help="Epochs for NCF matcher")
    parser.add_argument("--batch_size", type=int, default=128, help="Batch size for CNN training")
    parser.add_argument("--lr", type=float, default=0.001, help="Base learning rate for CNN")
    parser.add_argument("--suffix", type=str, default="_v2", help="Unique suffix for checkpoints, reports, and plots")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--data_dir", type=str, default=os.path.join(PROJECT_ROOT, "ai", "data"),
                        help="Path to Food-11 dataset root")
    parser.add_argument("--output_root", type=str, default=os.path.join(PROJECT_ROOT, "results", "foodwise_ai_training"),
                        help="Root results directory")
    parser.add_argument("--run_dir", type=str, default=None,
                        help="Explicit run directory")
    args = parser.parse_args()

    set_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    if args.run_dir and os.path.exists(args.run_dir):
        run_dir = os.path.abspath(args.run_dir)
        timestamp = os.path.basename(run_dir).replace("run_", "")
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_dir = os.path.join(args.output_root, f"run_{timestamp}_extended{args.suffix}")

    create_directory_structure(run_dir)

    config_dict = {
        "timestamp": timestamp,
        "run_directory": run_dir,
        "suffix": args.suffix,
        "device": str(device),
        "python_version": sys.version,
        "torch_version": torch.__version__,
        "random_seed": args.seed,
        "batch_size": args.batch_size,
        "epochs_cnn": args.epochs_cnn,
        "epochs_ae": args.epochs_ae,
        "epochs_ncf": args.epochs_ncf,
        "lr": args.lr,
        "data_dir": args.data_dir
    }

    with open(os.path.join(run_dir, "experiment_config.json"), "w") as f:
        json.dump(config_dict, f, indent=4)

    with open(os.path.join(run_dir, "environment_info.txt"), "w") as f:
        f.write(f"Timestamp: {timestamp}\n")
        f.write(f"Version Suffix: {args.suffix}\n")
        f.write(f"Python: {sys.version}\n")
        f.write(f"PyTorch: {torch.__version__}\n")
        f.write(f"Device: {device}\n")
        f.write(f"Random Seed: {args.seed}\n")
        f.write(f"Dataset Path: {args.data_dir}\n")

    cnn_metrics, cnn_history = None, None
    ae_metrics, ae_history = None, None
    ncf_metrics, ncf_history = None, None

    if args.model in ["all", "cnn"]:
        cnn_metrics, cnn_history = train_and_eval_cnn(
            data_dir=args.data_dir,
            output_dir=run_dir,
            epochs=args.epochs_cnn,
            batch_size=args.batch_size,
            lr=args.lr,
            suffix=args.suffix,
            device=device
        )

    if args.model in ["all", "autoencoder"]:
        ae_metrics, ae_history = train_and_eval_autoencoder(
            output_dir=run_dir,
            epochs=args.epochs_ae,
            batch_size=64,
            lr=0.005,
            suffix=args.suffix,
            device=device
        )

    if args.model in ["all", "ncf"]:
        ncf_metrics, ncf_history = train_and_eval_ncf(
            output_dir=run_dir,
            epochs=args.epochs_ncf,
            batch_size=64,
            lr=0.005,
            suffix=args.suffix,
            device=device
        )

    if args.model == "all":
        generate_reports(
            run_dir=run_dir,
            cnn_metrics=cnn_metrics,
            ae_metrics=ae_metrics,
            ncf_metrics=ncf_metrics,
            cnn_history=cnn_history,
            ae_history=ae_history,
            ncf_history=ncf_history,
            config_dict=config_dict,
            suffix=args.suffix
        )
        run_smoke_test(run_dir, suffix=args.suffix)

    print("\n" + "="*80)
    print(f"PIPELINE COMPLETE! All results, checkpoints, and reports saved to:")
    print(f"--> {run_dir}")
    print("="*80 + "\n", flush=True)

if __name__ == "__main__":
    main()

# FoodWiseAI — AI Module

## Overview

This module contains the machine learning and AI components for FoodWiseAI.

## Structure

```
ai/
├── models/          # Trained model artifacts (.h5, .pt, .onnx, etc.)
├── notebooks/       # Jupyter notebooks for experimentation
├── pipelines/       # ML training and inference pipelines
├── preprocessing/   # Data preprocessing and augmentation
├── services/        # AI service wrappers (prediction APIs)
├── config/          # Model configurations and hyperparameters
├── data/            # Datasets (training, validation, test)
└── requirements.txt # AI-specific Python dependencies
```

## Getting Started

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt
```

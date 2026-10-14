import re

with open('ai/pipelines/train_all_models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the specific broken syntax:
content = content.replace("train_dir = os.path.join(DATASET_ROOT\n", "train_dir = os.path.join(DATASET_ROOT, \"train\")\n")

with open('ai/pipelines/train_all_models.py', 'w', encoding='utf-8') as f:
    f.write(content)

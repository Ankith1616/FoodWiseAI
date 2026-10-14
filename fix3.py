import re
with open('ai/pipelines/download_food11.py', 'r', encoding='utf-8') as f:
    content = f.read()

# I need to wrap the download block with an if statement
block_to_replace = '''    print("Downloading Food-11 dataset via Kaggle API (approx 1.1GB)...")
    os.makedirs(DATASET_ROOT, exist_ok=True)
    kaggle.api.authenticate()
    kaggle.api.dataset_download_files("trolukovich/food11-image-dataset", path=DATASET_ROOT, unzip=True)'''

new_block = '''    if not os.path.exists(os.path.join(DATASET_ROOT, "train")):
        print("Downloading Food-11 dataset via Kaggle API (approx 1.1GB)...")
        os.makedirs(DATASET_ROOT, exist_ok=True)
        kaggle.api.authenticate()
        kaggle.api.dataset_download_files("trolukovich/food11-image-dataset", path=DATASET_ROOT, unzip=True)
    else:
        print("Dataset already found! Bypassing download...")'''

content = content.replace(block_to_replace, new_block)

with open('ai/pipelines/download_food11.py', 'w', encoding='utf-8') as f:
    f.write(content)

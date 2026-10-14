import re
with open('backend/app/models/dishes.py', 'r', encoding='utf-8') as f:
    content = f.read()

content2 = re.sub(r'("id": (\d+),.*?)(generate_embedding_for_category\("[^"]+"\))', lambda m: m.group(1) + f'generate_real_cnn_embedding({m.group(2)})', content, flags=re.DOTALL)

with open('backend/app/models/dishes.py', 'w', encoding='utf-8') as f:
    f.write(content2)

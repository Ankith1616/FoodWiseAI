import re
import glob
import os

with open('backend/app/models/dishes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add column
content = content.replace('image_emoji = Column(String, nullable=False)', 'image_emoji = Column(String, nullable=False)\n    image_url = Column(String, nullable=True)')

# Assign image_url sequentially
images = sorted(os.listdir('backend/static/images/dishes'))

new_content = ''
image_idx = 0
for line in content.split('\n'):
    new_content += line + '\n'
    if '"image_emoji":' in line:
        img_name = images[image_idx % len(images)]
        new_content += f'        "image_url": "/static/images/dishes/{img_name}",\n'
        image_idx += 1

# write back without the trailing extra newline caused by split
with open('backend/app/models/dishes.py', 'w', encoding='utf-8') as f:
    f.write(new_content.rstrip() + '\n')

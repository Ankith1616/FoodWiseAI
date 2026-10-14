import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image

class FoodWiseCNNEncoder(nn.Module):
    def __init__(self, num_classes=11):
        super(FoodWiseCNNEncoder, self).__init__()
        # Lightweight CNN for CPU training speed
        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.conv3 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.fc1 = nn.Linear(64 * 8 * 8, 128)
        self.fc2 = nn.Linear(128, num_classes)
        
    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = self.pool(F.relu(self.conv3(x)))
        x = x.view(-1, 64 * 8 * 8)
        embedding = F.relu(self.fc1(x))
        logits = self.fc2(embedding)
        return logits, embedding

def extract_image_embedding(image_path, model):
    model.eval()
    transform = transforms.Compose([
        transforms.Resize((64, 64)),
        transforms.ToTensor(),
        transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
    ])
    try:
        image = Image.open(image_path).convert('RGB')
        tensor = transform(image).unsqueeze(0)
        with torch.no_grad():
            _, embedding = model(tensor)
            return embedding.squeeze().numpy().tolist()
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return [0.0] * 128

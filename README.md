# FoodWiseAI 🧠🥗
> **A Visual Appetite Recommendation Engine Powered by Convolutional Neural Networks (CNN)**

FoodWiseAI is a next-generation food recommendation system that replaces conventional text-based filtering (ratings, price, cuisine keywords) with **visual representation learning**. By analyzing visual cravings through a custom Convolutional Neural Network (CNN), the system captures a user's visual appetite profile and ranks local menus using high-dimensional vector similarity.

---

## 🌟 Core Novelty (Academic Focus)
Most food delivery apps (Zomato, Swiggy, DoorDash) recommend items using Collaborative Filtering (historical orders) or Content Filtering (tags). **FoodWiseAI introduces a visual-cognitive paradigm**:
1. **Visual Appetite Profiling**: Users interact with a gamified, Tinder-style swipe interface where they rate dishes visually (`Pass` or `Yum!`).
2. **Deep Feature Mappings**: A custom **Convolutional Neural Network (CNN)** processes dish images to extract a 128-dimensional embedding representing texture, style, and composition.
3. **Appetite Vector Aggregation**: Liked dish vectors are aggregated into a single dynamic **User Taste Profile Vector**.
4. **Euclidean Cosine Space Ranking**: Recommendations are generated in real-time by ranking the restaurant database against the user vector using Cosine Similarity.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **AI/ML Subsystem** | PyTorch, torchvision, PIL, NumPy | Convolutional Neural Network, vector math |
| **Backend API** | FastAPI, Uvicorn, SQLite | High-performance asynchronous API, seed database |
| **Mobile/Web Client** | React Native, Expo, Zustand, Axios | Cross-platform UI (iOS, Android, Web), State management |
| **Design System** | TailwindCSS, Light-Theme Accents | Swiggy/Zomato-inspired high-contrast visual layout |

---

## 📂 Project Architecture

```
FoodWiseAI/
├── ai/                      # Machine Learning Subsystem
│   ├── models/              # Custom PyTorch CNN Model Definition (encoder.py)
│   ├── services/            # Visual Similarity Vector Recommender (recommender.py)
│   └── requirements.txt     # Torch & torchvision dependencies
├── backend/                 # FastAPI Web Server
│   ├── app/
│   │   ├── api/v1/          # Recommendation routes (/taste-profile, /profiler-cards)
│   │   └── models/          # Dish database schema & seeds (dishes.py)
│   └── requirements.txt     # Python backend dependencies
└── mobile/                  # Universal Frontend (Expo / React Native Web)
    ├── src/
    │   ├── app/             # Screens (index.tsx, profiler.tsx)
    │   ├── store/           # Zustand global state (useAppStore.ts)
    │   └── services/        # Axios API client (api.ts)
```

---

## 🚀 What We Have Done (Phase 1)
* **Custom CNN Architecture**: Implemented `FoodWiseCNNEncoder` with 4 Convolutional blocks (`Conv2d`, `BatchNorm2d`, `ReLU`, `MaxPool2d`) and fully connected linear layers.
* **Smart Environment Fallback**: Programmed a deterministic fallback encoder (using SHA-256 visual signatures) to let the entire system function gracefully even without local PyTorch installations.
* **FastAPI Recommendation Engine**: Built endpoints to calculate similarity matrices and serve ranked items.
* **Tinder-Style Swiper UI**: Designed an immersive visual profiling screen that updates the user's AI taste model on-the-fly.
* **Zomato/Swiggy Light Design**: Built a responsive, multi-column light-theme feed showing visual match ratings (e.g., `✨ 98% Match Fit`) and AI justifications.

---

## 🔮 Next Phase Goals (Phase 2)
* **Transfer Learning Fine-Tuning**: Fine-tune the CNN model on the **Food-101 dataset** to improve classification accuracy and visual feature extraction.
* **Calorie & Macro Estimation**: Extend the CNN output layer to predict calorie ranges and macronutrient weights directly from dish images.
* **Hybrid Routing Engine**: Combine the CNN visual taste vector with traditional collaborative filtering models to account for historic user ordering patterns.

---

## ⚙️ How to Run the Project

### 1. Run the Backend API
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Activate your virtual environment and install requirements:
   ```bash
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Run the server with the parent directory in Python's path (so it loads the `ai` module):
   ```bash
   $env:PYTHONPATH=".."; .\venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
   ```

### 2. Run the Mobile/Web Client
1. Navigate to the `mobile` folder:
   ```bash
   cd mobile
   ```
2. Install the node dependencies:
   ```bash
   npm install
   ```
3. Run the web version:
   ```bash
   npm run web
   ```
   *(To test on a physical mobile phone, run `npx expo start` and scan the QR code using the **Expo Go** app).*

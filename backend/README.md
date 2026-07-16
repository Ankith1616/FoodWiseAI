# FoodWiseAI Backend

## Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 15+

### Setup

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env file and configure
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

### Project Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI entry point
│   ├── core/            # Config, DB, security
│   ├── models/          # SQLAlchemy models
│   ├── schemas/         # Pydantic schemas
│   ├── api/v1/          # API routes
│   ├── services/        # Business logic
│   └── utils/           # Helpers
├── alembic/             # DB migrations
├── requirements.txt
└── .env.example
```

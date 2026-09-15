"""
FoodWiseAI — User Data Models & Storage

Pydantic user schemas and a lightweight JSON-backed persistence store.
"""

import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field

USERS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "users.json")


class UserBase(BaseModel):
    email: str
    full_name: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(UserBase):
    id: str
    created_at: str
    dietary_preferences: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)


class UserInDB(UserResponse):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserStore:
    """Simple thread-safe file-backed JSON user store."""

    def __init__(self, file_path: str = USERS_FILE):
        self.file_path = file_path
        self._ensure_file()

    def _ensure_file(self):
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        if not os.path.exists(self.file_path):
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump({}, f)

    def _read_all(self) -> Dict[str, dict]:
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _write_all(self, data: Dict[str, dict]):
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_by_email(self, email: str) -> Optional[UserInDB]:
        users = self._read_all()
        email_clean = email.strip().lower()
        for user_dict in users.values():
            if user_dict.get("email", "").lower() == email_clean:
                return UserInDB(**user_dict)
        return None

    def get_by_id(self, user_id: str) -> Optional[UserInDB]:
        users = self._read_all()
        user_dict = users.get(user_id)
        if user_dict:
            return UserInDB(**user_dict)
        return None

    def create(self, user_create: UserCreate, hashed_password: str) -> UserInDB:
        users = self._read_all()
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        now_str = datetime.utcnow().isoformat()

        user_db = UserInDB(
            id=user_id,
            email=user_create.email.strip().lower(),
            full_name=user_create.full_name.strip(),
            hashed_password=hashed_password,
            created_at=now_str,
            dietary_preferences=[],
            allergies=[]
        )

        users[user_id] = user_db.model_dump()
        self._write_all(users)
        return user_db


user_store = UserStore()

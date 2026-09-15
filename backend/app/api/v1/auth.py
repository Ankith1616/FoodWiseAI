"""
FoodWiseAI — Auth API Endpoints

Sign Up, Sign In, and Current User profile routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Header, status
from typing import Optional

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.users import (
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
    user_store,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def get_current_user(authorization: Optional[str] = Header(None)) -> UserResponse:
    """Dependency to resolve current authenticated user from Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)

    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = user_store.get_by_id(payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return UserResponse(**user.model_dump())


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    """Registers a new user account."""
    if not user_in.email or "@" not in user_in.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address format",
        )

    if len(user_in.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long",
        )

    existing_user = user_store.get_by_email(user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists",
        )

    hashed_pw = hash_password(user_in.password)
    user_db = user_store.create(user_in, hashed_pw)

    user_resp = UserResponse(**user_db.model_dump())
    access_token = create_access_token(data={"sub": user_db.id, "email": user_db.email})

    return Token(access_token=access_token, token_type="bearer", user=user_resp)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Authenticates existing user credentials."""
    user = user_store.get_by_email(credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    user_resp = UserResponse(**user.model_dump())
    access_token = create_access_token(data={"sub": user.id, "email": user.email})

    return Token(access_token=access_token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserResponse)
async def me(current_user: UserResponse = Depends(get_current_user)):
    """Returns profile information for the authenticated user."""
    return current_user

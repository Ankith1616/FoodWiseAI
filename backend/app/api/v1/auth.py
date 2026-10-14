"""
FoodWiseAI — Auth API Endpoints

Sign Up, Sign In, and Current User profile routes using PostgreSQL.
"""

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
)
from app.models.dataset_models import UserAuthDB
from app.core.database import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
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

    stmt = select(UserAuthDB).where(UserAuthDB.id == payload["sub"])
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at.isoformat(),
        dietary_preferences=[],
        allergies=[]
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
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

    # Check if user exists
    stmt = select(UserAuthDB).where(UserAuthDB.email == user_in.email.strip().lower())
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists",
        )

    hashed_pw = hash_password(user_in.password)
    
    new_user = UserAuthDB(
        email=user_in.email.strip().lower(),
        full_name=user_in.full_name.strip(),
        hashed_password=hashed_pw
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    user_resp = UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        created_at=new_user.created_at.isoformat(),
        dietary_preferences=[],
        allergies=[]
    )
    
    access_token = create_access_token(data={"sub": new_user.id, "email": new_user.email})

    return Token(access_token=access_token, token_type="bearer", user=user_resp)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticates existing user credentials."""
    stmt = select(UserAuthDB).where(UserAuthDB.email == credentials.email.strip().lower())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
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

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at.isoformat(),
        dietary_preferences=[],
        allergies=[]
    )
    
    access_token = create_access_token(data={"sub": user.id, "email": user.email})

    return Token(access_token=access_token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserResponse)
async def me(current_user: UserResponse = Depends(get_current_user)):
    """Returns profile information for the authenticated user."""
    return current_user


@router.post("/survey", response_model=UserResponse)
async def update_survey(
    survey_data: dict,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Saves user survey, generates 64-D latent vector using Autoencoder, and caches it."""
    from ai.models.profile_autoencoder import encode_survey_to_vector
    from app.models.dataset_models import UserPreferenceDB
    import json
    
    latent_list = encode_survey_to_vector(survey_data)
    
    stmt = select(UserPreferenceDB).where(UserPreferenceDB.user_id == current_user.id)
    result = await db.execute(stmt)
    pref = result.scalar_one_or_none()
    
    if not pref:
        pref = UserPreferenceDB(user_id=current_user.id)
        db.add(pref)
        
    pref.latent_vector = json.dumps(latent_list)
    pref.dietary_protocols = json.dumps(survey_data.get("dietaryRestrictions", []))
    
    await db.commit()
    return current_user


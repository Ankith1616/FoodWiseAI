import json
import os
import asyncio
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.dataset_models import UserAuthDB, UserPreferenceDB

USERS_FILE = os.path.join(os.path.dirname(__file__), "data", "users.json")

async def migrate():
    print("--- Starting User Migration to PostgreSQL ---")
    
    if not os.path.exists(USERS_FILE):
        print(f"File not found: {USERS_FILE}. Nothing to migrate.")
        return

    with open(USERS_FILE, "r", encoding="utf-8") as f:
        try:
            users_data = json.load(f)
        except json.JSONDecodeError:
            print("Invalid JSON in users.json")
            return

    if not users_data:
        print("users.json is empty. Nothing to migrate.")
        return

    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    migrated_count = 0
    skipped_count = 0

    async with async_session() as session:
        for user_id, u_data in users_data.items():
            email = u_data.get("email")
            
            # Check if user already exists
            stmt = select(UserAuthDB).where((UserAuthDB.id == user_id) | (UserAuthDB.email == email))
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"Skipping {email} (id: {user_id}): Already exists in DB.")
                skipped_count += 1
                continue
                
            try:
                created_at = datetime.fromisoformat(u_data.get("created_at"))
            except:
                created_at = datetime.utcnow()
                
            new_user = UserAuthDB(
                id=user_id,
                email=email,
                full_name=u_data.get("full_name", "Unknown"),
                hashed_password=u_data.get("hashed_password"),
                created_at=created_at
            )
            
            # Create user preferences
            dietary_protocols = u_data.get("dietary_preferences", []) + u_data.get("allergies", [])
            new_pref = UserPreferenceDB(
                user_id=user_id,
                dietary_protocols=json.dumps(dietary_protocols),
                created_at=created_at
            )
            
            session.add(new_user)
            session.add(new_pref)
            migrated_count += 1
            
        await session.commit()
        
    print(f"Migration complete: {migrated_count} migrated, {skipped_count} skipped.")
    
if __name__ == "__main__":
    asyncio.run(migrate())

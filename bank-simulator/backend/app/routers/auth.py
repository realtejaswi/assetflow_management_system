from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
import uuid
from datetime import datetime

from app.database import get_db
from app.models.user import UserCreate, UserLogin, TokenResponse, UserResponse, RefreshTokenRequest, AccountCreate, AccountResponse
from app.services.auth_service import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, get_user_by_email
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _generate_account_number() -> str:
    return f"1234{uuid.uuid4().int % 10**8:08d}"


async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserCreate):
    db = get_db()
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.users.find_one({"phone": data.phone}):
        raise HTTPException(status_code=400, detail="Phone already registered")

    user_doc = {
        "full_name": data.full_name,
        "email": data.email,
        "phone": data.phone,
        "password_hash": hash_password(data.password),
        "role": data.role,
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Create default savings account
    account_doc = {
        "user_id": user_id,
        "account_number": _generate_account_number(),
        "account_type": "savings",
        "balance": 0.0,
        "nickname": "Primary Savings",
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    await db.accounts.insert_one(account_doc)

    token_data = {"sub": user_id, "email": data.email, "role": data.role}
    user_res = UserResponse(
        id=user_id, full_name=data.full_name, email=data.email,
        phone=data.phone, role=data.role, created_at=user_doc["created_at"], is_active=True
    )
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=user_res,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await get_user_by_email(data.email)
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account deactivated")

    user_id = str(user["_id"])
    token_data = {"sub": user_id, "email": user["email"], "role": user["role"]}
    user_res = UserResponse(
        id=user_id, full_name=user["full_name"], email=user["email"],
        phone=user["phone"], role=user["role"],
        created_at=user["created_at"], is_active=user["is_active"]
    )
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=user_res,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshTokenRequest):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user_id = str(user["_id"])
    token_data = {"sub": user_id, "email": user["email"], "role": user["role"]}
    user_res = UserResponse(
        id=user_id, full_name=user["full_name"], email=user["email"],
        phone=user["phone"], role=user["role"],
        created_at=user["created_at"], is_active=user["is_active"]
    )
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=user_res,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    u = current_user
    return UserResponse(
        id=str(u["_id"]), full_name=u["full_name"], email=u["email"],
        phone=u["phone"], role=u["role"], created_at=u["created_at"], is_active=u["is_active"]
    )

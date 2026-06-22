from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from enum import Enum


class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)


class UserRole(str, Enum):
    user = "user"
    admin = "admin"


class AccountType(str, Enum):
    savings = "savings"
    current = "current"


# ── User Models ───────────────────────────────────────────────

class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.user


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str
    role: UserRole
    created_at: datetime
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ── Account Models ────────────────────────────────────────────

class AccountCreate(BaseModel):
    account_type: AccountType = AccountType.savings
    initial_deposit: float = Field(0.0, ge=0)
    nickname: Optional[str] = None


class AccountResponse(BaseModel):
    id: str
    user_id: str
    account_number: str
    account_type: AccountType
    balance: float
    nickname: Optional[str]
    is_active: bool
    created_at: datetime


class BalanceResponse(BaseModel):
    account_id: str
    account_number: str
    balance: float
    updated_at: datetime

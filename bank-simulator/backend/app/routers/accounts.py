from fastapi import APIRouter, HTTPException, Depends
from typing import List
import uuid
from datetime import datetime
from bson import ObjectId

from app.database import get_db
from app.models.user import AccountCreate, AccountResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/accounts", tags=["Accounts"])


def _generate_account_number() -> str:
    return f"9876{uuid.uuid4().int % 10**8:08d}"


def _doc_to_account(doc: dict) -> AccountResponse:
    return AccountResponse(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        account_number=doc["account_number"],
        account_type=doc["account_type"],
        balance=doc["balance"],
        nickname=doc.get("nickname"),
        is_active=doc.get("is_active", True),
        created_at=doc["created_at"],
    )


@router.get("/", response_model=List[AccountResponse])
async def list_accounts(current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    cursor = db.accounts.find({"user_id": user_id, "is_active": True})
    accounts = await cursor.to_list(length=100)
    return [_doc_to_account(a) for a in accounts]


@router.post("/", response_model=AccountResponse, status_code=201)
async def create_account(data: AccountCreate, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    doc = {
        "user_id": user_id,
        "account_number": _generate_account_number(),
        "account_type": data.account_type,
        "balance": data.initial_deposit,
        "nickname": data.nickname,
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    result = await db.accounts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_account(doc)


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(account_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    account = await db.accounts.find_one({"_id": ObjectId(account_id), "user_id": user_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return _doc_to_account(account)


@router.get("/{account_id}/balance")
async def get_balance(account_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    account = await db.accounts.find_one({"_id": ObjectId(account_id), "user_id": user_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"account_id": account_id, "account_number": account["account_number"],
            "balance": account["balance"], "updated_at": datetime.utcnow()}

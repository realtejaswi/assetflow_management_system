from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timedelta

from app.database import get_db
from app.models.transaction import (
    DepositRequest, WithdrawRequest, TransferRequest,
    UPIPaymentRequest, TransactionResponse
)
from app.services.transaction_service import (
    process_deposit, process_withdrawal, process_upi
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def _doc_to_txn(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("/deposit", status_code=201)
async def deposit(data: DepositRequest, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    try:
        txn = await process_deposit(data.account_id, data.amount, user_id, data.description or "Deposit")
        return txn
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/withdraw", status_code=201)
async def withdraw(data: WithdrawRequest, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    try:
        txn = await process_withdrawal(data.account_id, data.amount, user_id, data.description or "ATM Withdrawal")
        return txn
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/transfer", status_code=201)
async def transfer(data: TransferRequest, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    to_account = await db.accounts.find_one({"account_number": data.to_account_number})
    if not to_account:
        raise HTTPException(status_code=404, detail="Recipient account not found")
    try:
        # Debit sender
        txn = await process_withdrawal(data.from_account_id, data.amount, user_id,
                                       f"Transfer to {data.to_account_number}")
        # Credit recipient
        await process_deposit(str(to_account["_id"]), data.amount,
                              to_account["user_id"], f"Transfer from account")
        return {"message": "Transfer successful", "reference_id": txn["reference_id"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upi", status_code=201)
async def upi_payment(data: UPIPaymentRequest, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    try:
        txn = await process_upi(
            data.account_id, data.upi_id, data.merchant,
            data.amount, data.category, user_id, data.description
        )
        return txn
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
async def list_transactions(
    account_id: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(50, le=200),
    skip: int = 0,
    current_user=Depends(get_current_user)
):
    db = get_db()
    user_id = str(current_user["_id"])
    query = {"user_id": user_id}
    if account_id:
        query["account_id"] = account_id
    if category:
        query["category"] = category

    cursor = db.transactions.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    txns = await cursor.to_list(length=limit)
    return [_doc_to_txn(t) for t in txns]


@router.get("/summary")
async def transaction_summary(current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$category",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"total": -1}}
    ]
    result = await db.transactions.aggregate(pipeline).to_list(length=100)
    return result


@router.get("/monthly-trend")
async def monthly_trend(months: int = Query(6, ge=1, le=12), current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    now = datetime.utcnow()
    results = []

    for i in range(months - 1, -1, -1):
        target = now - timedelta(days=30 * i)
        month_start = target.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i == 0:
            month_end = now
        else:
            next_month = month_start + timedelta(days=32)
            month_end = next_month.replace(day=1)

        pipe_income = [
            {"$match": {"user_id": user_id, "timestamp": {"$gte": month_start, "$lt": month_end}, "amount": {"$gt": 0}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        pipe_expense = [
            {"$match": {"user_id": user_id, "timestamp": {"$gte": month_start, "$lt": month_end}, "amount": {"$lt": 0}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]

        inc = await db.transactions.aggregate(pipe_income).to_list(1)
        exp = await db.transactions.aggregate(pipe_expense).to_list(1)
        income = inc[0]["total"] if inc else 0
        expense = abs(exp[0]["total"]) if exp else 0

        results.append({
            "month": target.strftime("%b"),
            "income": round(income, 2),
            "expense": round(expense, 2),
        })

    return results

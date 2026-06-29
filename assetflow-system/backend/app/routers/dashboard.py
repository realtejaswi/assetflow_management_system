from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
import httpx
from pydantic import BaseModel

from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview")
async def get_dashboard_overview(user_id: str = Query(...)):
    """Get comprehensive dashboard metrics for a user."""
    db = get_db()

    account = await db.aggregated_accounts.find_one({"user_id": user_id})
    assets_doc = await db.aggregated_assets.find_one({"user_id": user_id})

    # Current month stats
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_key = now.strftime("%Y-%m")

    # Monthly income & expense from transactions
    pipeline_income = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": month_start}, "amount": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    pipeline_expense = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": month_start}, "amount": {"$lt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]

    income_result = await db.aggregated_transactions.aggregate(pipeline_income).to_list(1)
    expense_result = await db.aggregated_transactions.aggregate(pipeline_expense).to_list(1)

    monthly_income = income_result[0]["total"] if income_result else 0
    monthly_expense = abs(expense_result[0]["total"]) if expense_result else 0
    monthly_savings = monthly_income - monthly_expense

    # Total assets
    bank_balance = account.get("last_balance", 0) if account else 0
    stock_value = assets_doc.get("total_stock_value", 0) if assets_doc else 0
    mf_value = assets_doc.get("total_mf_value", 0) if assets_doc else 0
    gold_value = assets_doc.get("total_gold_value", 0) if assets_doc else 0
    fd_value = assets_doc.get("total_fd_value", 0) if assets_doc else 0

    total_assets = bank_balance + stock_value + mf_value + gold_value + fd_value

    # Loans/liabilities
    loans = assets_doc.get("loans", []) if assets_doc else []
    total_liabilities = sum(l.get("outstanding_balance", 0) for l in loans if l.get("status") == "active")

    net_worth = total_assets - total_liabilities

    # Get financial health score
    health_score = 0
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(f"{settings.ml_service_url}/predict/health-score", json={
                "monthly_income": monthly_income,
                "monthly_expense": monthly_expense,
                "total_savings": monthly_savings,
                "total_liabilities": total_liabilities,
                "total_assets": total_assets,
                "monthly_emi": sum(l.get("emi_amount", 0) for l in loans if l.get("status") == "active"),
                "emergency_fund": bank_balance * 0.3,
            })
            if resp.status_code == 200:
                health_score = resp.json().get("score", 0)
    except Exception:
        health_score = 65  # Fallback

    return {
        "user_id": user_id,
        "current_balance": round(bank_balance, 2),
        "total_assets": round(total_assets, 2),
        "total_liabilities": round(total_liabilities, 2),
        "net_worth": round(net_worth, 2),
        "monthly_income": round(monthly_income, 2),
        "monthly_expense": round(monthly_expense, 2),
        "monthly_savings": round(monthly_savings, 2),
        "savings_rate": round((monthly_savings / monthly_income * 100) if monthly_income > 0 else 0, 1),
        "financial_health_score": round(health_score, 1),
        "asset_breakdown": {
            "bank_balance": round(bank_balance, 2),
            "stocks": round(stock_value, 2),
            "mutual_funds": round(mf_value, 2),
            "gold": round(gold_value, 2),
            "fixed_deposits": round(fd_value, 2),
        },
        "last_updated": datetime.utcnow().isoformat(),
    }


@router.get("/recent-transactions")
async def get_recent_transactions(user_id: str = Query(...), limit: int = 10):
    db = get_db()
    cursor = db.aggregated_transactions.find({"user_id": user_id}).sort("timestamp", -1).limit(limit)
    txns = await cursor.to_list(length=limit)
    for t in txns:
        t["id"] = str(t.pop("_id"))
    return txns


@router.get("/monthly-trend")
async def get_monthly_trend(user_id: str = Query(...), months: int = 6):
    """Get income vs expense trend for last N months."""
    db = get_db()
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

        inc = await db.aggregated_transactions.aggregate(pipe_income).to_list(1)
        exp = await db.aggregated_transactions.aggregate(pipe_expense).to_list(1)
        income = inc[0]["total"] if inc else 0
        expense = abs(exp[0]["total"]) if exp else 0

        results.append({
            "month": target.strftime("%b %Y"),
            "income": round(income, 2),
            "expense": round(expense, 2),
            "savings": round(income - expense, 2),
        })

    return results


class SyncData(BaseModel):
    user_id: str
    bank_balance: float
    stock_value: float
    mf_value: float
    gold_value: float
    fd_value: float

@router.post("/sync")
async def sync_dashboard_data(data: SyncData):
    """Forcefully synchronize AssetFlow data from absolute bank state."""
    db = get_db()
    
    # Update aggregated_accounts
    await db.aggregated_accounts.update_one(
        {"user_id": data.user_id},
        {"$set": {
            "last_balance": data.bank_balance,
            "last_updated": datetime.utcnow()
        }},
        upsert=True
    )
    
    # Update aggregated_assets
    await db.aggregated_assets.update_one(
        {"user_id": data.user_id},
        {"$set": {
            "total_stock_value": data.stock_value,
            "total_mf_value": data.mf_value,
            "total_gold_value": data.gold_value,
            "total_fd_value": data.fd_value,
            "last_updated": datetime.utcnow()
        }},
        upsert=True
    )
    
    return {"message": "Data synchronized successfully"}

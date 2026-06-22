from fastapi import APIRouter, Query
from datetime import datetime, timedelta
from app.database import get_db

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("/by-category")
async def expenses_by_category(user_id: str = Query(...), months: int = 1):
    """Get expense breakdown by category."""
    db = get_db()
    since = datetime.utcnow() - timedelta(days=30 * months)
    pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": since}, "amount": {"$lt": 0}}},
        {"$group": {
            "_id": "$category",
            "total": {"$sum": {"$abs": "$amount"}},
            "count": {"$sum": 1},
        }},
        {"$sort": {"total": -1}},
    ]
    result = await db.aggregated_transactions.aggregate(pipeline).to_list(20)
    return [{"category": r["_id"] or "Other", "total": round(r["total"], 2), "count": r["count"]} for r in result]


@router.get("/by-merchant")
async def expenses_by_merchant(user_id: str = Query(...), limit: int = 10):
    """Get top merchants by spending."""
    db = get_db()
    since = datetime.utcnow() - timedelta(days=90)
    pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": since}, "amount": {"$lt": 0}, "merchant": {"$ne": None}}},
        {"$group": {"_id": "$merchant", "total": {"$sum": {"$abs": "$amount"}}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
        {"$limit": limit},
    ]
    result = await db.aggregated_transactions.aggregate(pipeline).to_list(limit)
    return [{"merchant": r["_id"], "total": round(r["total"], 2), "count": r["count"]} for r in result]


@router.get("/daily")
async def daily_expenses(user_id: str = Query(...), days: int = 30):
    """Get daily expense totals."""
    db = get_db()
    since = datetime.utcnow() - timedelta(days=days)
    pipeline = [
        {"$match": {"user_id": user_id, "timestamp": {"$gte": since}, "amount": {"$lt": 0}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
            "total": {"$sum": {"$abs": "$amount"}},
        }},
        {"$sort": {"_id": 1}},
    ]
    result = await db.aggregated_transactions.aggregate(pipeline).to_list(100)
    return [{"date": r["_id"], "amount": round(r["total"], 2)} for r in result]


@router.get("/transactions")
async def list_transactions(
    user_id: str = Query(...),
    category: str = None,
    limit: int = 50,
    skip: int = 0,
):
    """Get paginated expense transactions."""
    db = get_db()
    query = {"user_id": user_id, "amount": {"$lt": 0}}
    if category:
        query["category"] = category
    cursor = db.aggregated_transactions.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    txns = await cursor.to_list(limit)
    for t in txns:
        t["id"] = str(t.pop("_id"))
    return txns

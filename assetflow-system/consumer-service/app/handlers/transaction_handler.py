import logging
from datetime import datetime
from app.database import get_db

logger = logging.getLogger(__name__)

CATEGORY_MAP = {
    "Swiggy": "Food", "Zomato": "Food", "Amazon": "Shopping",
    "Flipkart": "Shopping", "Netflix": "Entertainment", "Spotify": "Entertainment",
    "BESCOM": "Bills", "Airtel": "Bills", "Ola": "Travel", "Uber": "Travel",
    "Apollo Pharmacy": "Healthcare", "MakeMyTrip": "Travel",
}


async def handle_transaction_event(event: dict):
    """Process transaction events and store in AssetFlow DB."""
    db = get_db()
    user_id = event.get("user_id")
    if not user_id or user_id == "system":
        return

    category = event.get("category") or _infer_category(event.get("merchant", ""))

    txn_doc = {
        "user_id": user_id,
        "event_type": event.get("event_type"),
        "amount": event.get("amount", 0),
        "category": category,
        "merchant": event.get("merchant"),
        "description": event.get("description", ""),
        "account_id": event.get("account_id"),
        "timestamp": datetime.fromisoformat(event["timestamp"]) if isinstance(event.get("timestamp"), str) else datetime.utcnow(),
        "metadata": event.get("metadata", {}),
        "source": "bank_simulator",
        "processed_at": datetime.utcnow(),
    }

    await db.aggregated_transactions.insert_one(txn_doc)

    # Update user's balance snapshot
    metadata = event.get("metadata", {})
    if "balance_after" in metadata:
        await db.aggregated_accounts.update_one(
            {"user_id": user_id},
            {"$set": {
                "last_balance": metadata["balance_after"],
                "last_updated": datetime.utcnow(),
            }},
            upsert=True
        )

    # Update monthly income/expense tracking
    amount = event.get("amount", 0)
    month_key = datetime.utcnow().strftime("%Y-%m")
    if amount > 0:
        await db.aggregated_accounts.update_one(
            {"user_id": user_id},
            {"$inc": {f"monthly_income.{month_key}": amount}},
            upsert=True
        )
    else:
        await db.aggregated_accounts.update_one(
            {"user_id": user_id},
            {"$inc": {f"monthly_expense.{month_key}": abs(amount)}},
            upsert=True
        )

    logger.info(f"✅ Transaction processed for user {user_id}: {event.get('event_type')} ₹{abs(amount)}")


def _infer_category(merchant: str) -> str:
    return CATEGORY_MAP.get(merchant, "Other")

import logging
from datetime import datetime
from app.database import get_db

logger = logging.getLogger(__name__)


async def handle_investment_event(event: dict):
    """Process investment events (FD, stocks, MF, gold)."""
    db = get_db()
    user_id = event.get("user_id")
    if not user_id or user_id == "system":
        return

    event_type = event.get("event_type")
    metadata = event.get("metadata", {})
    amount = abs(event.get("amount", 0))

    if event_type in ("FD_CREATED",):
        asset_doc = {
            "type": "fd",
            "amount": amount,
            "metadata": metadata,
            "created_at": datetime.utcnow(),
        }
        await db.aggregated_assets.update_one(
            {"user_id": user_id},
            {"$push": {"fds": asset_doc},
             "$inc": {"total_fd_value": amount},
             "$set": {"last_updated": datetime.utcnow()}},
            upsert=True
        )

    elif event_type == "STOCK_PURCHASED":
        await db.aggregated_assets.update_one(
            {"user_id": user_id},
            {"$inc": {"total_stock_value": amount},
             "$set": {"last_updated": datetime.utcnow()}},
            upsert=True
        )

    elif event_type == "MF_PURCHASED":
        await db.aggregated_assets.update_one(
            {"user_id": user_id},
            {"$inc": {"total_mf_value": amount},
             "$set": {"last_updated": datetime.utcnow()}},
            upsert=True
        )

    elif event_type == "GOLD_PURCHASED":
        await db.aggregated_assets.update_one(
            {"user_id": user_id},
            {"$inc": {"total_gold_value": amount},
             "$set": {"last_updated": datetime.utcnow()}},
            upsert=True
        )

    elif event_type == "STOCK_PRICE_UPDATED":
        # Store latest prices for net worth calculation
        symbol = metadata.get("symbol")
        new_price = metadata.get("new_price")
        if symbol and new_price:
            await db.market_prices.update_one(
                {"symbol": symbol},
                {"$set": {"price": new_price, "updated_at": datetime.utcnow()}},
                upsert=True
            )

    # Record as transaction for expense tracking
    if event_type in ("FD_CREATED", "STOCK_PURCHASED", "MF_PURCHASED", "GOLD_PURCHASED"):
        txn_doc = {
            "user_id": user_id,
            "event_type": event_type,
            "amount": -amount,
            "category": "Investment",
            "description": event.get("description", "Investment"),
            "account_id": event.get("account_id"),
            "timestamp": datetime.utcnow(),
            "metadata": metadata,
            "source": "bank_simulator",
            "processed_at": datetime.utcnow(),
        }
        await db.aggregated_transactions.insert_one(txn_doc)

    logger.info(f"✅ Investment event processed: {event_type} for user {user_id}")

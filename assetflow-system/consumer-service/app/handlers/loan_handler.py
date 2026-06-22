import logging
from datetime import datetime
from app.database import get_db

logger = logging.getLogger(__name__)


async def handle_loan_event(event: dict):
    """Process loan and EMI events."""
    db = get_db()
    user_id = event.get("user_id")
    if not user_id or user_id == "system":
        return

    event_type = event.get("event_type")
    metadata = event.get("metadata", {})

    if event_type == "LOAN_CREATED":
        loan_doc = {
            "user_id": user_id,
            "loan_id": metadata.get("loan_id"),
            "loan_type": metadata.get("loan_type"),
            "principal": event.get("amount", 0),
            "interest_rate": metadata.get("interest_rate"),
            "tenure_months": metadata.get("tenure_months"),
            "emi_amount": metadata.get("emi_amount"),
            "outstanding_balance": event.get("amount", 0),
            "status": "active",
            "created_at": datetime.utcnow(),
        }
        await db.aggregated_assets.update_one(
            {"user_id": user_id},
            {"$push": {"loans": loan_doc}, "$set": {"last_updated": datetime.utcnow()}},
            upsert=True
        )
        # Update total liabilities
        await db.aggregated_accounts.update_one(
            {"user_id": user_id},
            {"$inc": {"total_liabilities": event.get("amount", 0)}},
            upsert=True
        )

    elif event_type == "EMI_DEDUCTED":
        loan_id = metadata.get("loan_id")
        outstanding = metadata.get("outstanding_balance", 0)
        # Update outstanding balance for this loan
        await db.aggregated_assets.update_one(
            {"user_id": user_id, "loans.loan_id": loan_id},
            {"$set": {
                "loans.$.outstanding_balance": outstanding,
                "last_updated": datetime.utcnow()
            }}
        )
        # Record EMI transaction
        txn_doc = {
            "user_id": user_id,
            "event_type": "EMI_DEDUCTED",
            "amount": event.get("amount", 0),
            "category": "EMI",
            "description": event.get("description", "EMI Payment"),
            "account_id": event.get("account_id"),
            "timestamp": datetime.utcnow(),
            "metadata": metadata,
            "source": "bank_simulator",
            "processed_at": datetime.utcnow(),
        }
        await db.aggregated_transactions.insert_one(txn_doc)

    logger.info(f"✅ Loan event processed: {event_type} for user {user_id}")

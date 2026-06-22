import uuid
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from bson import ObjectId
from app.database import get_db
from app.redis_client import publish_event
from app.config import settings

logger = logging.getLogger(__name__)


def _make_reference_id() -> str:
    return f"TXN{uuid.uuid4().hex[:12].upper()}"


def _serialize(doc: Dict) -> Dict:
    """Convert MongoDB doc to JSON-serializable dict."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


async def process_deposit(account_id: str, amount: float, user_id: str, description: str = "Deposit") -> Dict:
    db = get_db()
    account = await db.accounts.find_one({"_id": ObjectId(account_id)})
    if not account:
        raise ValueError("Account not found")

    new_balance = account["balance"] + amount
    txn = {
        "user_id": user_id,
        "account_id": account_id,
        "transaction_type": "deposit",
        "amount": amount,
        "balance_after": new_balance,
        "description": description,
        "category": "Other",
        "merchant": None,
        "status": "completed",
        "reference_id": _make_reference_id(),
        "timestamp": datetime.utcnow(),
    }
    result = await db.transactions.insert_one(txn)
    await db.accounts.update_one({"_id": ObjectId(account_id)}, {"$set": {"balance": new_balance}})

    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": "TRANSACTION_CREATED",
        "user_id": user_id,
        "account_id": account_id,
        "amount": amount,
        "category": "Other",
        "description": description,
        "metadata": {"transaction_type": "deposit", "balance_after": new_balance, "transaction_id": str(result.inserted_id)},
        "timestamp": datetime.utcnow().isoformat(),
        "source": "bank_simulator",
    }
    await publish_event(settings.bank_transaction_channel, event)
    return _serialize(txn)


async def process_withdrawal(account_id: str, amount: float, user_id: str, description: str = "Withdrawal") -> Dict:
    db = get_db()
    account = await db.accounts.find_one({"_id": ObjectId(account_id)})
    if not account:
        raise ValueError("Account not found")
    if account["balance"] < amount:
        raise ValueError("Insufficient balance")

    new_balance = account["balance"] - amount
    txn = {
        "user_id": user_id,
        "account_id": account_id,
        "transaction_type": "withdrawal",
        "amount": amount,
        "balance_after": new_balance,
        "description": description,
        "category": "ATM",
        "merchant": None,
        "status": "completed",
        "reference_id": _make_reference_id(),
        "timestamp": datetime.utcnow(),
    }
    result = await db.transactions.insert_one(txn)
    await db.accounts.update_one({"_id": ObjectId(account_id)}, {"$set": {"balance": new_balance}})

    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": "TRANSACTION_CREATED",
        "user_id": user_id,
        "account_id": account_id,
        "amount": -amount,
        "category": "ATM",
        "description": description,
        "metadata": {"transaction_type": "withdrawal", "balance_after": new_balance, "transaction_id": str(result.inserted_id)},
        "timestamp": datetime.utcnow().isoformat(),
        "source": "bank_simulator",
    }
    await publish_event(settings.bank_transaction_channel, event)
    return _serialize(txn)


async def process_upi(account_id: str, upi_id: str, merchant: str,
                       amount: float, category: str, user_id: str,
                       description: Optional[str] = None) -> Dict:
    db = get_db()
    account = await db.accounts.find_one({"_id": ObjectId(account_id)})
    if not account:
        raise ValueError("Account not found")
    if account["balance"] < amount:
        raise ValueError("Insufficient balance")

    new_balance = account["balance"] - amount
    desc = description or f"UPI to {merchant}"
    txn = {
        "user_id": user_id,
        "account_id": account_id,
        "transaction_type": "upi",
        "amount": amount,
        "balance_after": new_balance,
        "description": desc,
        "category": category,
        "merchant": merchant,
        "upi_id": upi_id,
        "status": "completed",
        "reference_id": _make_reference_id(),
        "timestamp": datetime.utcnow(),
    }
    result = await db.transactions.insert_one(txn)
    await db.accounts.update_one({"_id": ObjectId(account_id)}, {"$set": {"balance": new_balance}})

    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": "UPI_PAYMENT",
        "user_id": user_id,
        "account_id": account_id,
        "amount": -amount,
        "category": category,
        "merchant": merchant,
        "description": desc,
        "metadata": {"transaction_type": "upi", "upi_id": upi_id, "balance_after": new_balance, "transaction_id": str(result.inserted_id)},
        "timestamp": datetime.utcnow().isoformat(),
        "source": "bank_simulator",
    }
    await publish_event(settings.bank_transaction_channel, event)
    return _serialize(txn)

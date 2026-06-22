import uuid
import random
import logging
from datetime import datetime, timedelta
from typing import Dict
from bson import ObjectId
from app.database import get_db
from app.redis_client import publish_event
from app.config import settings
from app.models.investment import MOCK_STOCKS, MOCK_MFS

logger = logging.getLogger(__name__)

# Mock current prices (will be updated by price_updater)
STOCK_PRICES = {
    "TCS": 3800.0, "INFY": 1450.0, "RELIANCE": 2900.0,
    "HDFC": 1650.0, "WIPRO": 480.0, "ICICIBANK": 1100.0,
    "TATAMOTORS": 920.0, "SUNPHARMA": 1350.0,
}

MF_NAVS = {
    "AXIS_BLUECHIP": 48.5, "HDFC_MIDCAP": 112.3,
    "SBI_LIQUID": 3245.8, "MIRAE_ELSS": 35.7, "PARAG_FLEXI": 68.2,
}

GOLD_RATE_PER_GRAM = 7200.0  # INR per gram (24K)


async def create_fd(fd_data: Dict, user_id: str) -> Dict:
    db = get_db()
    amount = fd_data["amount"]
    rate = fd_data["interest_rate"]
    months = fd_data["tenure_months"]
    start_date = datetime.utcnow()
    maturity_date = start_date + timedelta(days=30 * months)
    # Compound interest annually
    years = months / 12
    maturity_amount = round(amount * (1 + rate / 100) ** years, 2)
    interest_earned = round(maturity_amount - amount, 2)

    doc = {
        **fd_data,
        "user_id": user_id,
        "start_date": start_date,
        "maturity_date": maturity_date,
        "maturity_amount": maturity_amount,
        "interest_earned": interest_earned,
        "status": "active",
        "created_at": datetime.utcnow(),
    }
    result = await db.fds.insert_one(doc)
    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": "FD_CREATED",
        "user_id": user_id,
        "account_id": fd_data.get("account_id"),
        "amount": amount,
        "category": "Investment",
        "description": f"FD Created - ₹{amount:,.0f} @ {rate}%",
        "metadata": {"fd_id": str(result.inserted_id), "maturity_amount": maturity_amount, "tenure_months": months},
        "timestamp": datetime.utcnow().isoformat(),
        "source": "bank_simulator",
    }
    await publish_event(settings.bank_investment_channel, event)
    doc["id"] = str(result.inserted_id)
    return doc


async def purchase_stock(symbol: str, quantity: int, account_id: str, user_id: str) -> Dict:
    db = get_db()
    if symbol not in MOCK_STOCKS:
        raise ValueError(f"Unknown stock symbol: {symbol}")
    price = STOCK_PRICES.get(symbol, 1000.0)
    total_cost = price * quantity

    account = await db.accounts.find_one({"_id": ObjectId(account_id)})
    if not account or account["balance"] < total_cost:
        raise ValueError("Insufficient balance")

    # Update or create stock holding
    existing = await db.stocks.find_one({"user_id": user_id, "symbol": symbol})
    if existing:
        new_qty = existing["quantity"] + quantity
        new_avg = ((existing["avg_purchase_price"] * existing["quantity"]) + total_cost) / new_qty
        await db.stocks.update_one(
            {"_id": existing["_id"]},
            {"$set": {"quantity": new_qty, "avg_purchase_price": round(new_avg, 2),
                      "current_price": price, "last_updated": datetime.utcnow()}}
        )
        doc_id = str(existing["_id"])
    else:
        doc = {
            "user_id": user_id, "symbol": symbol,
            "name": MOCK_STOCKS[symbol]["name"], "sector": MOCK_STOCKS[symbol]["sector"],
            "quantity": quantity, "avg_purchase_price": price, "current_price": price,
            "last_updated": datetime.utcnow(),
        }
        result = await db.stocks.insert_one(doc)
        doc_id = str(result.inserted_id)

    await db.accounts.update_one({"_id": ObjectId(account_id)}, {"$inc": {"balance": -total_cost}})

    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": "STOCK_PURCHASED",
        "user_id": user_id, "account_id": account_id,
        "amount": -total_cost,
        "category": "Investment",
        "description": f"Bought {quantity} shares of {symbol} @ ₹{price}",
        "metadata": {"symbol": symbol, "quantity": quantity, "price": price},
        "timestamp": datetime.utcnow().isoformat(),
        "source": "bank_simulator",
    }
    await publish_event(settings.bank_investment_channel, event)
    return {"id": doc_id, "symbol": symbol, "quantity": quantity, "price": price, "total_cost": total_cost}


async def purchase_mf(fund_code: str, units: float, account_id: str, user_id: str) -> Dict:
    db = get_db()
    if fund_code not in MOCK_MFS:
        raise ValueError(f"Unknown fund: {fund_code}")
    nav = MF_NAVS.get(fund_code, 100.0)
    total_cost = round(nav * units, 2)

    account = await db.accounts.find_one({"_id": ObjectId(account_id)})
    if not account or account["balance"] < total_cost:
        raise ValueError("Insufficient balance")

    existing = await db.mutual_funds.find_one({"user_id": user_id, "fund_code": fund_code})
    if existing:
        new_units = existing["units"] + units
        new_avg = ((existing["avg_nav"] * existing["units"]) + total_cost) / new_units
        await db.mutual_funds.update_one(
            {"_id": existing["_id"]},
            {"$set": {"units": round(new_units, 4), "avg_nav": round(new_avg, 4),
                      "current_nav": nav, "last_updated": datetime.utcnow()}}
        )
        doc_id = str(existing["_id"])
    else:
        doc = {
            "user_id": user_id, "fund_code": fund_code,
            "fund_name": MOCK_MFS[fund_code]["name"], "category": MOCK_MFS[fund_code]["category"],
            "units": round(units, 4), "avg_nav": nav, "current_nav": nav,
            "last_updated": datetime.utcnow(),
        }
        result = await db.mutual_funds.insert_one(doc)
        doc_id = str(result.inserted_id)

    await db.accounts.update_one({"_id": ObjectId(account_id)}, {"$inc": {"balance": -total_cost}})
    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": "MF_PURCHASED",
        "user_id": user_id, "account_id": account_id,
        "amount": -total_cost,
        "category": "Investment",
        "description": f"MF: {MOCK_MFS[fund_code]['name']} - {units} units @ ₹{nav}",
        "metadata": {"fund_code": fund_code, "units": units, "nav": nav},
        "timestamp": datetime.utcnow().isoformat(),
        "source": "bank_simulator",
    }
    await publish_event(settings.bank_investment_channel, event)
    return {"id": doc_id, "fund_code": fund_code, "units": units, "nav": nav, "total_cost": total_cost}


async def purchase_gold(grams: float, gold_type: str, account_id: str, user_id: str) -> Dict:
    db = get_db()
    rate = GOLD_RATE_PER_GRAM
    total_cost = round(grams * rate, 2)

    account = await db.accounts.find_one({"_id": ObjectId(account_id)})
    if not account or account["balance"] < total_cost:
        raise ValueError("Insufficient balance")

    doc = {
        "user_id": user_id, "grams": grams, "gold_type": gold_type,
        "purchase_price_per_gram": rate, "current_price_per_gram": rate,
        "purchased_at": datetime.utcnow(), "last_updated": datetime.utcnow(),
    }
    result = await db.gold.insert_one(doc)
    await db.accounts.update_one({"_id": ObjectId(account_id)}, {"$inc": {"balance": -total_cost}})

    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": "GOLD_PURCHASED",
        "user_id": user_id, "account_id": account_id,
        "amount": -total_cost,
        "category": "Investment",
        "description": f"Gold: {grams}g ({gold_type}) @ ₹{rate}/g",
        "metadata": {"grams": grams, "gold_type": gold_type, "rate": rate},
        "timestamp": datetime.utcnow().isoformat(),
        "source": "bank_simulator",
    }
    await publish_event(settings.bank_investment_channel, event)
    doc["id"] = str(result.inserted_id)
    return doc

import asyncio
import random
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
from bson import ObjectId

from app.database import get_db
from app.services.investment_service import STOCK_PRICES, MF_NAVS, GOLD_RATE_PER_GRAM
from app.redis_client import publish_event
from app.config import settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def update_stock_prices():
    """Simulate stock price movements (±3%)."""
    db = get_db()
    for symbol in list(STOCK_PRICES.keys()):
        change_pct = random.uniform(-0.03, 0.03)
        old_price = STOCK_PRICES[symbol]
        new_price = round(old_price * (1 + change_pct), 2)
        STOCK_PRICES[symbol] = new_price

        # Notify AssetFlow
        event = {
            "event_id": f"price-{symbol}-{int(datetime.utcnow().timestamp())}",
            "event_type": "STOCK_PRICE_UPDATED",
            "user_id": "system",
            "amount": new_price,
            "description": f"{symbol} price updated",
            "metadata": {"symbol": symbol, "old_price": old_price, "new_price": new_price, "change_pct": round(change_pct * 100, 2)},
            "timestamp": datetime.utcnow().isoformat(),
            "source": "bank_simulator",
        }
        await publish_event(settings.bank_investment_channel, event)

    logger.info("📈 Stock prices updated")


async def update_nav_prices():
    """Update mutual fund NAVs (±1.5%)."""
    for code in list(MF_NAVS.keys()):
        change = random.uniform(-0.015, 0.015)
        MF_NAVS[code] = round(MF_NAVS[code] * (1 + change), 4)
    logger.info("📊 MF NAVs updated")


async def update_gold_rate():
    """Update gold rate (±0.5%)."""
    global GOLD_RATE_PER_GRAM
    from app.services import investment_service
    change = random.uniform(-0.005, 0.005)
    investment_service.GOLD_RATE_PER_GRAM = round(investment_service.GOLD_RATE_PER_GRAM * (1 + change), 2)
    logger.info(f"🥇 Gold rate updated: ₹{investment_service.GOLD_RATE_PER_GRAM}/g")


def start_scheduler():
    scheduler.add_job(update_stock_prices, "interval", minutes=5, id="stock_prices")
    scheduler.add_job(update_nav_prices, "interval", minutes=15, id="nav_prices")
    scheduler.add_job(update_gold_rate, "interval", minutes=30, id="gold_rate")
    scheduler.start()
    logger.info("⏰ Price update scheduler started")


def stop_scheduler():
    scheduler.shutdown()

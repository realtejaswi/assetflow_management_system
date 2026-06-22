import json
import logging
import asyncio
import redis.asyncio as aioredis
from app.config import settings
from app.handlers.transaction_handler import handle_transaction_event
from app.handlers.loan_handler import handle_loan_event
from app.handlers.investment_handler import handle_investment_event

logger = logging.getLogger(__name__)

CHANNELS = [
    settings.bank_event_channel,
    settings.bank_transaction_channel,
    settings.bank_loan_channel,
    settings.bank_investment_channel,
]

TRANSACTION_EVENTS = {
    "TRANSACTION_CREATED", "SALARY_CREDITED", "UPI_PAYMENT",
    "ATM_WITHDRAWAL", "BILL_PAYMENT", "TRANSFER_CREATED"
}
LOAN_EVENTS = {"LOAN_CREATED", "EMI_DEDUCTED", "LOAN_CLOSED", "LOAN_OVERDUE"}
INVESTMENT_EVENTS = {
    "FD_CREATED", "FD_MATURED", "STOCK_PURCHASED", "STOCK_SOLD",
    "MF_PURCHASED", "MF_SOLD", "GOLD_PURCHASED", "GOLD_SOLD",
    "STOCK_PRICE_UPDATED", "NAV_UPDATED", "GOLD_RATE_UPDATED"
}


async def start_subscriber():
    """Start the Redis Pub/Sub subscriber loop."""
    logger.info(f"🔔 Subscribing to channels: {CHANNELS}")
    while True:
        try:
            client = await aioredis.from_url(
                f"redis://:{settings.redis_password}@{settings.redis_host}:{settings.redis_port}",
                encoding="utf-8",
                decode_responses=True,
            )
            pubsub = client.pubsub()
            await pubsub.subscribe(*CHANNELS)
            logger.info("✅ Subscribed to Redis channels")

            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    event = json.loads(message["data"])
                    event_type = event.get("event_type", "")
                    logger.info(f"📥 Received event: {event_type}")

                    if event_type in TRANSACTION_EVENTS:
                        await handle_transaction_event(event)
                    elif event_type in LOAN_EVENTS:
                        await handle_loan_event(event)
                    elif event_type in INVESTMENT_EVENTS:
                        await handle_investment_event(event)
                    else:
                        logger.debug(f"Unhandled event type: {event_type}")
                except json.JSONDecodeError as e:
                    logger.error(f"JSON parse error: {e}")
                except Exception as e:
                    logger.error(f"Event processing error: {e}")

        except Exception as e:
            logger.error(f"Redis connection error: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)

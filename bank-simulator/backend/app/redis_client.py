import redis.asyncio as aioredis
import json
import logging
from typing import Any, Dict
from app.config import settings

logger = logging.getLogger(__name__)

_redis_client: aioredis.Redis = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = await aioredis.from_url(
            f"redis://:{settings.redis_password}@{settings.redis_host}:{settings.redis_port}",
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def publish_event(channel: str, event: Dict[str, Any]) -> None:
    """Publish JSON event to Redis Pub/Sub."""
    try:
        client = await get_redis()
        payload = json.dumps(event, default=str)
        await client.publish(channel, payload)
        # Also publish to the main all-events channel
        if channel != settings.bank_event_channel:
            await client.publish(settings.bank_event_channel, payload)
        logger.info(f"📤 Published [{event.get('event_type')}] to {channel}")
    except Exception as e:
        logger.error(f"Redis publish error: {e}")


async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None

import redis.asyncio as aioredis
import redis as sync_redis
import os
import json
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "redis123")


def get_sync_redis() -> sync_redis.Redis:
    """Get a synchronous Redis client."""
    return sync_redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        decode_responses=True,
    )


async def get_async_redis() -> aioredis.Redis:
    """Get an async Redis client."""
    return await aioredis.from_url(
        f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}",
        encoding="utf-8",
        decode_responses=True,
    )


async def publish_event(channel: str, event: Dict[str, Any]) -> None:
    """Publish a JSON event to a Redis channel."""
    try:
        client = await get_async_redis()
        payload = json.dumps(event, default=str)
        await client.publish(channel, payload)
        await client.aclose()
        logger.info(f"Published event to {channel}: {event.get('event_type')}")
    except Exception as e:
        logger.error(f"Failed to publish event: {e}")

from fastapi import FastAPI
import asyncio
import logging
from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.subscriber import start_subscriber

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="AssetFlow Consumer Service — Redis Pub/Sub subscriber",
)

subscriber_task = None


@app.on_event("startup")
async def startup():
    await connect_to_mongo()
    global subscriber_task
    subscriber_task = asyncio.create_task(start_subscriber())
    logger.info("🚀 AssetFlow Consumer Service started")


@app.on_event("shutdown")
async def shutdown():
    global subscriber_task
    if subscriber_task:
        subscriber_task.cancel()
    await close_mongo_connection()


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "consumer-service"}


@app.get("/")
async def root():
    return {"service": settings.app_name, "version": settings.version, "status": "running"}

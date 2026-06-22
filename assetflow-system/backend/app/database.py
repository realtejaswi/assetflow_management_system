import motor.motor_asyncio
from app.config import settings

client = None
db = None


async def connect_to_mongo():
    global client, db
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.assetflow_mongo_uri)
    db = client[settings.assetflow_db_name]
    print("✅ AssetFlow Backend connected to MongoDB")


async def close_mongo_connection():
    global client
    if client:
        client.close()


def get_db():
    return db

import motor.motor_asyncio
from app.config import settings

client: motor.motor_asyncio.AsyncIOMotorClient = None
db: motor.motor_asyncio.AsyncIOMotorDatabase = None


async def connect_to_mongo():
    global client, db
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.assetflow_mongo_uri)
    db = client[settings.assetflow_db_name]
    await db.aggregated_transactions.create_index("user_id")
    await db.aggregated_transactions.create_index("timestamp")
    await db.aggregated_transactions.create_index("category")
    await db.aggregated_accounts.create_index("user_id")
    await db.aggregated_assets.create_index("user_id")
    await db.financial_scores.create_index("user_id")
    await db.recommendations.create_index("user_id")
    await db.tax_reports.create_index("user_id")
    await db.alerts.create_index("user_id")
    print("✅ AssetFlow Consumer connected to MongoDB")


async def close_mongo_connection():
    global client
    if client:
        client.close()


def get_db():
    return db

import motor.motor_asyncio
from app.config import settings

client: motor.motor_asyncio.AsyncIOMotorClient = None
db: motor.motor_asyncio.AsyncIOMotorDatabase = None


async def connect_to_mongo():
    global client, db
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.bank_mongo_uri)
    db = client[settings.bank_db_name]
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("phone", unique=True)
    await db.accounts.create_index("user_id")
    await db.accounts.create_index("account_number", unique=True)
    await db.transactions.create_index("account_id")
    await db.transactions.create_index("user_id")
    await db.transactions.create_index("timestamp")
    await db.loans.create_index("user_id")
    await db.emis.create_index("loan_id")
    await db.emis.create_index("due_date")
    await db.stocks.create_index("user_id")
    await db.mutual_funds.create_index("user_id")
    await db.gold.create_index("user_id")
    await db.fds.create_index("user_id")
    await db.events.create_index("timestamp")
    await db.events.create_index("user_id")
    print("✅ Connected to MongoDB (Bank Simulator)")


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("❌ Disconnected from MongoDB")


def get_db() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    return db

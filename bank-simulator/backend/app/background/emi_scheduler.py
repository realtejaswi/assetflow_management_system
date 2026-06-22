import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
from bson import ObjectId

from app.database import get_db
from app.services.loan_service import process_emi_payment

logger = logging.getLogger(__name__)

emi_scheduler = AsyncIOScheduler()


async def auto_deduct_emis():
    """Auto-deduct EMIs that are due today."""
    db = get_db()
    today = datetime.utcnow()
    # Find all pending EMIs due on or before today
    cursor = db.emis.find({
        "status": "pending",
        "due_date": {"$lte": today}
    })
    emis = await cursor.to_list(length=1000)
    logger.info(f"🔄 Auto EMI: Processing {len(emis)} due EMIs")

    for emi in emis:
        try:
            await process_emi_payment(emi["loan_id"], emi["user_id"])
            logger.info(f"✅ EMI paid: Loan {emi['loan_id']} EMI #{emi['emi_number']}")
        except Exception as e:
            logger.warning(f"⚠️ EMI failed for loan {emi['loan_id']}: {e}")
            # Mark as overdue
            await db.emis.update_one({"_id": emi["_id"]}, {"$set": {"status": "overdue"}})
            await db.loans.update_one({"_id": ObjectId(emi["loan_id"])}, {"$set": {"status": "overdue"}})


def start_emi_scheduler():
    emi_scheduler.add_job(auto_deduct_emis, "cron", hour=9, minute=0, id="auto_emi")
    emi_scheduler.start()
    logger.info("⏰ EMI scheduler started (runs daily at 9:00 AM)")


def stop_emi_scheduler():
    emi_scheduler.shutdown()

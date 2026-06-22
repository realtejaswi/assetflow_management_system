import uuid
import math
import logging
from datetime import datetime, timedelta
from typing import Dict, List
from bson import ObjectId
from app.database import get_db
from app.redis_client import publish_event
from app.config import settings

logger = logging.getLogger(__name__)


def calculate_emi(principal: float, annual_rate: float, tenure_months: int) -> float:
    """Calculate EMI using reducing balance method."""
    if annual_rate == 0:
        return principal / tenure_months
    r = annual_rate / (12 * 100)
    emi = principal * r * (1 + r) ** tenure_months / ((1 + r) ** tenure_months - 1)
    return round(emi, 2)


def generate_emi_schedule(principal: float, annual_rate: float, tenure_months: int,
                           start_date: datetime, loan_id: str, user_id: str) -> List[Dict]:
    """Generate full EMI amortization schedule."""
    emi = calculate_emi(principal, annual_rate, tenure_months)
    r = annual_rate / (12 * 100)
    schedule = []
    outstanding = principal

    for i in range(1, tenure_months + 1):
        interest_comp = round(outstanding * r, 2)
        principal_comp = round(emi - interest_comp, 2)
        outstanding = round(outstanding - principal_comp, 2)
        if outstanding < 0:
            outstanding = 0

        due_date = start_date + timedelta(days=30 * i)
        schedule.append({
            "loan_id": loan_id,
            "user_id": user_id,
            "emi_number": i,
            "due_date": due_date,
            "emi_amount": emi,
            "principal_component": principal_comp,
            "interest_component": interest_comp,
            "outstanding_balance": outstanding,
            "status": "pending",
            "paid_date": None,
        })
    return schedule


async def create_loan(loan_data: Dict, user_id: str) -> Dict:
    db = get_db()
    principal = loan_data["principal"]
    rate = loan_data["interest_rate"]
    tenure = loan_data["tenure_months"]
    emi = calculate_emi(principal, rate, tenure)
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=30 * tenure)

    loan_doc = {
        **loan_data,
        "user_id": user_id,
        "emi_amount": emi,
        "outstanding_balance": principal,
        "paid_amount": 0.0,
        "status": "active",
        "start_date": start_date,
        "end_date": end_date,
        "created_at": datetime.utcnow(),
    }
    result = await db.loans.insert_one(loan_doc)
    loan_id = str(result.inserted_id)

    # Generate EMI schedule
    schedule = generate_emi_schedule(principal, rate, tenure, start_date, loan_id, user_id)
    await db.emis.insert_many(schedule)

    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": "LOAN_CREATED",
        "user_id": user_id,
        "account_id": loan_data.get("account_id"),
        "amount": principal,
        "category": "EMI",
        "description": f"{loan_data['loan_type'].title()} Loan",
        "metadata": {
            "loan_id": loan_id,
            "loan_type": loan_data["loan_type"],
            "interest_rate": rate,
            "tenure_months": tenure,
            "emi_amount": emi,
        },
        "timestamp": datetime.utcnow().isoformat(),
        "source": "bank_simulator",
    }
    await publish_event(settings.bank_loan_channel, event)
    loan_doc["id"] = loan_id
    return loan_doc


async def process_emi_payment(loan_id: str, user_id: str) -> Dict:
    """Process next pending EMI payment."""
    db = get_db()
    emi = await db.emis.find_one(
        {"loan_id": loan_id, "user_id": user_id, "status": "pending"},
        sort=[("emi_number", 1)]
    )
    if not emi:
        raise ValueError("No pending EMIs found")

    loan = await db.loans.find_one({"_id": ObjectId(loan_id)})
    if not loan:
        raise ValueError("Loan not found")

    account = await db.accounts.find_one({"_id": ObjectId(loan["account_id"])})
    if not account or account["balance"] < emi["emi_amount"]:
        raise ValueError("Insufficient balance for EMI")

    new_balance = account["balance"] - emi["emi_amount"]
    new_outstanding = loan["outstanding_balance"] - emi["principal_component"]
    new_paid = loan["paid_amount"] + emi["emi_amount"]

    await db.accounts.update_one({"_id": ObjectId(loan["account_id"])}, {"$set": {"balance": new_balance}})
    await db.emis.update_one({"_id": emi["_id"]}, {"$set": {"status": "paid", "paid_date": datetime.utcnow()}})
    is_closed = new_outstanding <= 0
    await db.loans.update_one(
        {"_id": ObjectId(loan_id)},
        {"$set": {"outstanding_balance": max(0, new_outstanding), "paid_amount": new_paid,
                  "status": "closed" if is_closed else "active"}}
    )

    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": "EMI_DEDUCTED",
        "user_id": user_id,
        "account_id": loan["account_id"],
        "amount": -emi["emi_amount"],
        "category": "EMI",
        "description": f"EMI #{emi['emi_number']} for {loan['loan_type'].title()} Loan",
        "metadata": {
            "loan_id": loan_id,
            "emi_number": emi["emi_number"],
            "principal_component": emi["principal_component"],
            "interest_component": emi["interest_component"],
            "outstanding_balance": max(0, new_outstanding),
            "balance_after": new_balance,
        },
        "timestamp": datetime.utcnow().isoformat(),
        "source": "bank_simulator",
    }
    await publish_event(settings.bank_loan_channel, event)
    emi["id"] = str(emi.pop("_id"))
    return emi

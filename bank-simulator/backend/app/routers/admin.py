from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import random
import uuid
from datetime import datetime
from faker import Faker
from bson import ObjectId

from app.database import get_db
from app.services.transaction_service import process_deposit, process_upi, process_withdrawal
from app.services.loan_service import create_loan
from app.services.investment_service import create_fd
from app.routers.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])
fake = Faker("en_IN")

SAMPLE_MERCHANTS = [
    ("Swiggy", "Food"), ("Zomato", "Food"), ("Amazon", "Shopping"),
    ("Flipkart", "Shopping"), ("Netflix", "Entertainment"), ("Spotify", "Entertainment"),
    ("BESCOM", "Bills"), ("Airtel", "Bills"), ("Ola", "Travel"), ("Uber", "Travel"),
    ("Apollo Pharmacy", "Healthcare"), ("MakeMyTrip", "Travel"),
]


async def _require_admin(current_user=Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.post("/generate/salary-credit")
async def generate_salary_credit(
    account_id: str,
    amount: float = 85000.0,
    current_user=Depends(get_current_user)
):
    """Generate a salary credit event."""
    user_id = str(current_user["_id"])
    from app.redis_client import publish_event
    from app.config import settings

    txn = await process_deposit(account_id, amount, user_id, "Salary Credit - Employer")
    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": "SALARY_CREDITED",
        "user_id": user_id, "account_id": account_id,
        "amount": amount, "category": "Salary",
        "merchant": "Employer",
        "description": "Monthly Salary Credit",
        "metadata": {"transaction_id": txn.get("id", "")},
        "timestamp": datetime.utcnow().isoformat(),
        "source": "bank_simulator",
    }
    await publish_event(settings.bank_event_channel, event)
    return {"message": "Salary credited", "amount": amount, "transaction": txn}


@router.post("/generate/random-transactions")
async def generate_random_transactions(
    account_id: str,
    count: int = 10,
    current_user=Depends(get_current_user)
):
    """Generate random UPI transactions."""
    user_id = str(current_user["_id"])
    results = []
    for _ in range(count):
        merchant, category = random.choice(SAMPLE_MERCHANTS)
        amount = round(random.uniform(50, 5000), 2)
        upi_id = f"{merchant.lower().replace(' ', '')}@upi"
        try:
            txn = await process_upi(account_id, upi_id, merchant, amount, category, user_id)
            results.append({"merchant": merchant, "amount": amount, "category": category})
        except ValueError:
            pass  # Skip if insufficient balance
    return {"message": f"Generated {len(results)} transactions", "transactions": results}


@router.post("/generate/random-expenses")
async def generate_random_expenses(
    account_id: str,
    count: int = 5,
    current_user=Depends(get_current_user)
):
    """Generate random expense transactions."""
    return await generate_random_transactions(account_id=account_id, count=count, current_user=current_user)


@router.post("/generate/loan-event")
async def generate_loan_event(
    account_id: str,
    loan_type: str = "personal",
    principal: float = 500000.0,
    interest_rate: float = 12.5,
    tenure_months: int = 36,
    current_user=Depends(get_current_user)
):
    """Generate a loan creation event."""
    user_id = str(current_user["_id"])
    loan_data = {
        "loan_type": loan_type,
        "principal": principal,
        "interest_rate": interest_rate,
        "tenure_months": tenure_months,
        "account_id": account_id,
        "purpose": f"Auto-generated {loan_type} loan",
    }
    try:
        loan = await create_loan(loan_data, user_id)
        return {"message": "Loan created", "loan_id": loan.get("id")}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/generate/emi-event")
async def generate_emi_event(
    loan_id: str,
    current_user=Depends(get_current_user)
):
    """Trigger EMI payment for a loan."""
    from app.services.loan_service import process_emi_payment
    user_id = str(current_user["_id"])
    try:
        emi = await process_emi_payment(loan_id, user_id)
        return {"message": "EMI processed", "emi": emi}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/generate/investment-event")
async def generate_investment_event(
    account_id: str,
    investment_type: str = "fd",
    current_user=Depends(get_current_user)
):
    """Generate an investment event (FD, stock, MF, or gold)."""
    user_id = str(current_user["_id"])
    from app.services.investment_service import purchase_stock, purchase_mf, purchase_gold
    try:
        if investment_type == "fd":
            result = await create_fd({"account_id": account_id, "amount": 100000, "interest_rate": 7.5, "tenure_months": 12}, user_id)
        elif investment_type == "stock":
            result = await purchase_stock("TCS", 5, account_id, user_id)
        elif investment_type == "mf":
            result = await purchase_mf("AXIS_BLUECHIP", 100, account_id, user_id)
        elif investment_type == "gold":
            result = await purchase_gold(5.0, "24K", account_id, user_id)
        else:
            raise HTTPException(400, "Unknown investment type")
        return {"message": f"{investment_type.upper()} investment created", "result": result}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/stats")
async def get_stats(current_user=Depends(get_current_user)):
    """Get admin statistics."""
    db = get_db()
    stats = {
        "total_users": await db.users.count_documents({}),
        "total_accounts": await db.accounts.count_documents({}),
        "total_transactions": await db.transactions.count_documents({}),
        "total_loans": await db.loans.count_documents({}),
        "total_fds": await db.fds.count_documents({}),
        "total_events": await db.events.count_documents({}),
    }
    return stats

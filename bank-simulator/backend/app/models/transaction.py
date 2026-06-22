from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class TransactionType(str, Enum):
    deposit = "deposit"
    withdrawal = "withdrawal"
    transfer = "transfer"
    upi = "upi"
    salary = "salary"
    emi = "emi"
    bill = "bill"
    atm = "atm"


class TransactionCategory(str, Enum):
    food = "Food"
    travel = "Travel"
    shopping = "Shopping"
    bills = "Bills"
    emi = "EMI"
    investment = "Investment"
    healthcare = "Healthcare"
    entertainment = "Entertainment"
    salary = "Salary"
    transfer = "Transfer"
    atm = "ATM"
    other = "Other"


class TransactionStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    reversed = "reversed"


# ── Request Models ────────────────────────────────────────────

class DepositRequest(BaseModel):
    account_id: str
    amount: float = Field(..., gt=0)
    description: Optional[str] = "Deposit"


class WithdrawRequest(BaseModel):
    account_id: str
    amount: float = Field(..., gt=0)
    description: Optional[str] = "Withdrawal"


class TransferRequest(BaseModel):
    from_account_id: str
    to_account_number: str
    amount: float = Field(..., gt=0)
    description: Optional[str] = "Transfer"


class UPIPaymentRequest(BaseModel):
    account_id: str
    upi_id: str
    merchant: str
    amount: float = Field(..., gt=0)
    category: TransactionCategory = TransactionCategory.other
    description: Optional[str] = None


# ── Response Models ───────────────────────────────────────────

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    account_id: str
    transaction_type: TransactionType
    amount: float
    balance_after: float
    description: str
    category: TransactionCategory
    merchant: Optional[str]
    status: TransactionStatus
    reference_id: str
    timestamp: datetime

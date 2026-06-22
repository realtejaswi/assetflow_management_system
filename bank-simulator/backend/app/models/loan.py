from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class LoanType(str, Enum):
    education = "education"
    personal = "personal"
    vehicle = "vehicle"
    home = "home"


class LoanStatus(str, Enum):
    active = "active"
    closed = "closed"
    overdue = "overdue"
    pending = "pending"


class EMIStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    overdue = "overdue"


# ── Loan Models ───────────────────────────────────────────────

class LoanCreate(BaseModel):
    loan_type: LoanType
    principal: float = Field(..., gt=0)
    interest_rate: float = Field(..., gt=0, le=50)  # Annual %
    tenure_months: int = Field(..., gt=0, le=360)
    account_id: str
    purpose: Optional[str] = None


class LoanResponse(BaseModel):
    id: str
    user_id: str
    account_id: str
    loan_type: LoanType
    principal: float
    interest_rate: float
    tenure_months: int
    emi_amount: float
    outstanding_balance: float
    paid_amount: float
    status: LoanStatus
    start_date: datetime
    end_date: datetime
    purpose: Optional[str]
    created_at: datetime


class EMIScheduleItem(BaseModel):
    emi_number: int
    due_date: datetime
    emi_amount: float
    principal_component: float
    interest_component: float
    outstanding_balance: float
    status: EMIStatus
    paid_date: Optional[datetime]


class EMIResponse(BaseModel):
    id: str
    loan_id: str
    user_id: str
    emi_number: int
    due_date: datetime
    emi_amount: float
    principal_component: float
    interest_component: float
    outstanding_balance: float
    status: EMIStatus
    paid_date: Optional[datetime]

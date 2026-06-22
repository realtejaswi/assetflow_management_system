from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ── Fixed Deposit Models ──────────────────────────────────────

class FDCreate(BaseModel):
    account_id: str
    amount: float = Field(..., gt=1000)
    interest_rate: float = Field(..., gt=0, le=15)  # Annual %
    tenure_months: int = Field(..., ge=1, le=120)


class FDResponse(BaseModel):
    id: str
    user_id: str
    account_id: str
    amount: float
    interest_rate: float
    tenure_months: int
    start_date: datetime
    maturity_date: datetime
    maturity_amount: float
    interest_earned: float
    status: str  # active / matured / broken
    created_at: datetime


# ── Stock Models ──────────────────────────────────────────────

MOCK_STOCKS = {
    "TCS": {"name": "Tata Consultancy Services", "sector": "IT"},
    "INFY": {"name": "Infosys Ltd", "sector": "IT"},
    "RELIANCE": {"name": "Reliance Industries", "sector": "Energy"},
    "HDFC": {"name": "HDFC Bank", "sector": "Banking"},
    "WIPRO": {"name": "Wipro Ltd", "sector": "IT"},
    "ICICIBANK": {"name": "ICICI Bank", "sector": "Banking"},
    "TATAMOTORS": {"name": "Tata Motors", "sector": "Auto"},
    "SUNPHARMA": {"name": "Sun Pharma", "sector": "Pharma"},
}


class StockPurchase(BaseModel):
    symbol: str
    quantity: int = Field(..., gt=0)
    account_id: str


class StockResponse(BaseModel):
    id: str
    user_id: str
    symbol: str
    name: str
    sector: str
    quantity: int
    avg_purchase_price: float
    current_price: float
    current_value: float
    gain_loss: float
    gain_loss_pct: float
    last_updated: datetime


# ── Mutual Fund Models ────────────────────────────────────────

MOCK_MFS = {
    "AXIS_BLUECHIP": {"name": "Axis Bluechip Fund", "category": "Equity"},
    "HDFC_MIDCAP": {"name": "HDFC Mid-Cap Opportunities", "category": "Equity"},
    "SBI_LIQUID": {"name": "SBI Liquid Fund", "category": "Debt"},
    "MIRAE_ELSS": {"name": "Mirae Asset ELSS", "category": "ELSS"},
    "PARAG_FLEXI": {"name": "Parag Parikh Flexi Cap", "category": "Equity"},
}


class MFPurchase(BaseModel):
    fund_code: str
    units: float = Field(..., gt=0)
    account_id: str


class MFResponse(BaseModel):
    id: str
    user_id: str
    fund_code: str
    fund_name: str
    category: str
    units: float
    avg_nav: float
    current_nav: float
    current_value: float
    invested_amount: float
    gain_loss: float
    gain_loss_pct: float
    last_updated: datetime


# ── Gold Models ───────────────────────────────────────────────

class GoldPurchase(BaseModel):
    grams: float = Field(..., gt=0)
    account_id: str
    gold_type: str = "24K"  # 24K, 22K, SGB, Digital


class GoldResponse(BaseModel):
    id: str
    user_id: str
    grams: float
    gold_type: str
    purchase_price_per_gram: float
    current_price_per_gram: float
    purchase_value: float
    current_value: float
    gain_loss: float
    gain_loss_pct: float
    purchased_at: datetime
    last_updated: datetime

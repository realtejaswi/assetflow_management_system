from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from app.models.ml_models import (
    expense_categorizer, anomaly_detector,
    savings_predictor, cashflow_forecaster
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AssetFlow ML Service",
    version="1.0.0",
    description="Machine Learning predictions for AssetFlow",
)


# ── Request Models ────────────────────────────────────────────

class Transaction(BaseModel):
    amount: float
    merchant: Optional[str] = ""
    description: Optional[str] = ""
    category: Optional[str] = None
    timestamp: Optional[str] = None


class CategorizeRequest(BaseModel):
    transactions: List[Transaction]


class AnomalyRequest(BaseModel):
    transactions: List[Transaction]
    fit_on_data: bool = True


class SavingsRequest(BaseModel):
    monthly_data: List[Dict[str, Any]]  # [{month: "2024-01", income: 80000, expense: 60000, savings: 20000}]


class ForecastRequest(BaseModel):
    balance_history: List[Dict[str, Any]]  # [{date: "2024-01-01", balance: 150000}]
    days: int = 30


class HealthScoreRequest(BaseModel):
    monthly_income: float
    monthly_expense: float
    total_savings: float
    total_liabilities: float
    total_assets: float
    monthly_emi: float = 0
    emergency_fund: float = 0


# ── Endpoints ─────────────────────────────────────────────────

@app.post("/predict/categorize")
async def categorize_transactions(req: CategorizeRequest):
    """Categorize transactions by merchant/description."""
    results = []
    for txn in req.transactions:
        category = expense_categorizer.categorize(txn.merchant or "", txn.description or "")
        results.append({"merchant": txn.merchant, "predicted_category": category})
    return {"predictions": results, "model": "keyword_classifier"}


@app.post("/predict/anomalies")
async def detect_anomalies(req: AnomalyRequest):
    """Detect spending anomalies."""
    txn_list = [t.model_dump() for t in req.transactions]
    if req.fit_on_data and len(txn_list) >= 10:
        anomaly_detector.fit(txn_list)
    results = anomaly_detector.predict(txn_list)
    anomalies = [r for r in results if r.get("is_anomaly")]
    return {
        "total_transactions": len(txn_list),
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
        "model": "isolation_forest",
    }


@app.post("/predict/savings")
async def predict_savings(req: SavingsRequest):
    """Predict next month's savings."""
    # Enrich data if needed
    enriched = []
    for item in req.monthly_data:
        savings = item.get("savings") or (item.get("income", 0) - item.get("expense", 0))
        enriched.append({**item, "savings": savings})
    prediction = savings_predictor.predict_next_month(enriched)
    return {"prediction": prediction, "model": "trend_regression"}


@app.post("/predict/cashflow")
async def forecast_cashflow(req: ForecastRequest):
    """Forecast cash flow for next N days."""
    if req.days not in [30, 90, 180]:
        raise HTTPException(400, "Days must be 30, 90, or 180")
    forecast = cashflow_forecaster.forecast(req.balance_history, req.days)
    return {
        "forecast_days": req.days,
        "forecast": forecast,
        "model": "prophet_or_linear",
    }


@app.post("/predict/health-score")
async def calculate_health_score(req: HealthScoreRequest):
    """Calculate financial health score (0-100)."""
    score = 0
    breakdown = {}

    # 1. Savings Rate (20 pts) — target 20%+ of income
    savings_rate = (req.monthly_income - req.monthly_expense) / req.monthly_income if req.monthly_income > 0 else 0
    sr_score = min(20, savings_rate * 100)
    breakdown["savings_rate"] = {"score": round(sr_score, 1), "max": 20, "rate_pct": round(savings_rate * 100, 1)}

    # 2. Debt-to-Income Ratio (20 pts) — target EMI < 40% income
    dti = req.monthly_emi / req.monthly_income if req.monthly_income > 0 else 0
    dti_score = max(0, 20 - dti * 50)
    breakdown["debt_ratio"] = {"score": round(dti_score, 1), "max": 20, "dti_pct": round(dti * 100, 1)}

    # 3. Emergency Fund (15 pts) — target 6 months expenses
    months_covered = req.emergency_fund / req.monthly_expense if req.monthly_expense > 0 else 0
    ef_score = min(15, months_covered * 2.5)
    breakdown["emergency_fund"] = {"score": round(ef_score, 1), "max": 15, "months_covered": round(months_covered, 1)}

    # 4. Investment Ratio (20 pts) — target 20%+ of income
    inv_assets = req.total_assets - req.emergency_fund
    inv_ratio = inv_assets / (req.monthly_income * 12) if req.monthly_income > 0 else 0
    inv_score = min(20, inv_ratio * 10)
    breakdown["investment_ratio"] = {"score": round(inv_score, 1), "max": 20}

    # 5. Spending Stability (15 pts)
    spending_ratio = req.monthly_expense / req.monthly_income if req.monthly_income > 0 else 1
    stability_score = max(0, 15 - spending_ratio * 15) if spending_ratio <= 1 else 0
    breakdown["spending_stability"] = {"score": round(stability_score, 1), "max": 15}

    # 6. Net Worth Positive (10 pts)
    net_worth = req.total_assets - req.total_liabilities
    nw_score = 10 if net_worth > 0 else max(0, 10 + net_worth / req.total_liabilities * 5)
    breakdown["net_worth_health"] = {"score": round(nw_score, 1), "max": 10, "net_worth": round(net_worth, 2)}

    total = sr_score + dti_score + ef_score + inv_score + stability_score + nw_score
    total = round(min(100, max(0, total)), 1)

    grade = "A+" if total >= 90 else "A" if total >= 80 else "B" if total >= 70 else "C" if total >= 60 else "D" if total >= 50 else "F"

    return {
        "score": total,
        "grade": grade,
        "breakdown": breakdown,
        "recommendations": _get_score_recommendations(breakdown),
    }


def _get_score_recommendations(breakdown: dict) -> List[str]:
    recs = []
    if breakdown["savings_rate"]["score"] < 10:
        recs.append("Increase your monthly savings to at least 20% of income")
    if breakdown["debt_ratio"]["score"] < 10:
        recs.append("Your EMI burden is high — consider prepaying loans")
    if breakdown["emergency_fund"]["months_covered"] < 3:
        recs.append(f"Build emergency fund to cover 6 months of expenses")
    if breakdown["investment_ratio"]["score"] < 10:
        recs.append("Start SIPs in mutual funds to grow your wealth")
    return recs


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ml-service"}


@app.get("/")
async def root():
    return {"service": "AssetFlow ML Service", "version": "1.0.0"}

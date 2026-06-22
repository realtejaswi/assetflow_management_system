import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class ExpenseCategorizer:
    """
    Simple rule-based + keyword matching categorizer.
    In production, replace with trained TF-IDF + Random Forest.
    """
    CATEGORY_KEYWORDS = {
        "Food": ["swiggy", "zomato", "mcdonalds", "kfc", "pizza", "dominos", "restaurant",
                 "cafe", "food", "burger", "biryani", "lunch", "dinner", "breakfast"],
        "Travel": ["ola", "uber", "rapido", "irctc", "train", "bus", "flight", "taxi",
                   "metro", "fuel", "petrol", "makemytrip", "goibibo", "travel"],
        "Shopping": ["amazon", "flipkart", "myntra", "ajio", "reliance", "dmart",
                     "big bazaar", "mall", "shop", "store", "market"],
        "Bills": ["electricity", "bescom", "tneb", "water", "gas", "airtel", "jio",
                  "vodafone", "bsnl", "broadband", "wifi", "internet", "bill", "recharge"],
        "Healthcare": ["apollo", "pharmacy", "hospital", "clinic", "doctor", "medicine",
                       "med", "health", "diagnostic", "lab"],
        "Entertainment": ["netflix", "prime", "hotstar", "spotify", "youtube", "cinema",
                          "movie", "pvr", "inox", "concert", "game", "entertainment"],
        "Investment": ["fd", "mutual fund", "sip", "stocks", "gold", "nps", "ppf", "investment"],
        "EMI": ["emi", "loan", "equated", "monthly installment"],
    }

    def categorize(self, merchant: str, description: str = "") -> str:
        text = f"{merchant} {description}".lower()
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                return category
        return "Other"

    def categorize_batch(self, transactions: List[Dict]) -> List[str]:
        return [
            self.categorize(t.get("merchant", ""), t.get("description", ""))
            for t in transactions
        ]


class AnomalyDetector:
    """Isolation Forest based anomaly detector for spending patterns."""

    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42, n_estimators=100)
        self.scaler = StandardScaler()
        self._fitted = False

    def fit(self, transactions: List[Dict]) -> None:
        if len(transactions) < 10:
            logger.warning("Not enough data to fit anomaly detector (need >= 10 transactions)")
            return
        df = pd.DataFrame(transactions)
        features = self._extract_features(df)
        scaled = self.scaler.fit_transform(features)
        self.model.fit(scaled)
        self._fitted = True

    def predict(self, transactions: List[Dict]) -> List[Dict]:
        if not self._fitted or len(transactions) < 5:
            # Rule-based fallback: flag transactions > 3 std devs from mean
            amounts = [abs(t.get("amount", 0)) for t in transactions]
            if not amounts:
                return []
            mean_amt = np.mean(amounts)
            std_amt = np.std(amounts) if np.std(amounts) > 0 else 1
            results = []
            for t in transactions:
                amt = abs(t.get("amount", 0))
                score = (amt - mean_amt) / std_amt
                results.append({
                    **t,
                    "anomaly_score": float(score),
                    "is_anomaly": bool(score > 2.5),
                    "reason": "Large transaction" if score > 2.5 else "Normal"
                })
            return results

        df = pd.DataFrame(transactions)
        features = self._extract_features(df)
        scaled = self.scaler.transform(features)
        scores = self.model.decision_function(scaled)
        predictions = self.model.predict(scaled)

        results = []
        for i, t in enumerate(transactions):
            results.append({
                **t,
                "anomaly_score": float(-scores[i]),
                "is_anomaly": predictions[i] == -1,
                "reason": "Anomalous spending pattern detected" if predictions[i] == -1 else "Normal"
            })
        return results

    def _extract_features(self, df: pd.DataFrame) -> np.ndarray:
        features = pd.DataFrame()
        features["amount"] = df.get("amount", pd.Series([0] * len(df))).abs()
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
            features["hour"] = df["timestamp"].dt.hour.fillna(12)
            features["day_of_week"] = df["timestamp"].dt.dayofweek.fillna(1)
        else:
            features["hour"] = 12
            features["day_of_week"] = 1
        return features.fillna(0).values


class SavingsPredictor:
    """Simple savings prediction using rolling average and trend."""

    def predict_next_month(self, monthly_data: List[Dict]) -> Dict:
        if not monthly_data:
            return {"predicted_savings": 0, "confidence": 0, "trend": "insufficient_data"}

        savings_values = [d.get("savings", 0) for d in monthly_data]
        if len(savings_values) < 2:
            return {"predicted_savings": savings_values[0] if savings_values else 0,
                    "confidence": 0.4, "trend": "stable"}

        # Calculate trend
        recent = savings_values[-3:] if len(savings_values) >= 3 else savings_values
        avg = np.mean(recent)
        trend_slope = np.polyfit(range(len(savings_values)), savings_values, 1)[0]

        predicted = avg + trend_slope
        trend = "increasing" if trend_slope > 500 else "decreasing" if trend_slope < -500 else "stable"
        confidence = min(0.9, 0.5 + len(savings_values) * 0.05)

        return {
            "predicted_savings": round(max(0, predicted), 2),
            "confidence": round(confidence, 2),
            "trend": trend,
            "average_savings": round(avg, 2),
            "trend_slope": round(trend_slope, 2),
        }


class CashFlowForecaster:
    """Cash flow forecaster using Prophet or linear extrapolation."""

    def forecast(self, balance_history: List[Dict], days: int = 30) -> List[Dict]:
        if len(balance_history) < 3:
            # Simple linear extrapolation
            if not balance_history:
                return []
            last_balance = balance_history[-1].get("balance", 0)
            return [
                {"day": i + 1, "predicted_balance": last_balance, "lower": last_balance * 0.9,
                 "upper": last_balance * 1.1}
                for i in range(days)
            ]

        try:
            from prophet import Prophet
            df = pd.DataFrame(balance_history)
            df["ds"] = pd.to_datetime(df.get("date", pd.date_range(end="today", periods=len(balance_history))))
            df["y"] = df.get("balance", 0)
            df = df[["ds", "y"]].dropna()

            model = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=False)
            model.fit(df)
            future = model.make_future_dataframe(periods=days)
            forecast = model.predict(future)
            tail = forecast.tail(days)
            return [
                {"day": i + 1, "date": str(row["ds"].date()),
                 "predicted_balance": round(row["yhat"], 2),
                 "lower": round(row["yhat_lower"], 2),
                 "upper": round(row["yhat_upper"], 2)}
                for i, (_, row) in enumerate(tail.iterrows())
            ]
        except Exception as e:
            logger.warning(f"Prophet failed, using linear extrapolation: {e}")
            last = balance_history[-1].get("balance", 0)
            prev = balance_history[-2].get("balance", last)
            daily_change = (last - prev) / 30
            return [
                {"day": i + 1, "predicted_balance": round(last + daily_change * i, 2),
                 "lower": round((last + daily_change * i) * 0.9, 2),
                 "upper": round((last + daily_change * i) * 1.1, 2)}
                for i in range(days)
            ]


# Singleton instances
expense_categorizer = ExpenseCategorizer()
anomaly_detector = AnomalyDetector()
savings_predictor = SavingsPredictor()
cashflow_forecaster = CashFlowForecaster()

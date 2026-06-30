import sys
sys.path.append(r"c:\storage\Projects\final2\assetflow-system\ml-service")
from app.models.ml_models import AnomalyDetector
import traceback
import pymongo
import datetime

# 1. Connect to DB
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["bank_simulator"]
user = db.users.find_one({"email": "test2@tmail.com"})
if not user:
    print("User not found!")
    exit(1)

# 2. Get Transactions
txns = list(db.transactions.find({"user_id": str(user["_id"])}).sort("timestamp", -1).limit(100))
print(f"Found {len(txns)} transactions")

if len(txns) > 0:
    # 3. Simulate Frontend Mapping
    mapped_txns = []
    for t in txns:
        mapped_txns.append({
            "amount": float(t.get("amount", 0) or 0),
            "merchant": t.get("merchant", "") or "",
            "description": t.get("description", "") or "",
            "category": t.get("category", "Other") or "Other",
            "timestamp": t.get("timestamp").isoformat() + "Z" if t.get("timestamp") else datetime.datetime.utcnow().isoformat() + "Z"
        })
    
    print("Testing anomalies locally...")
    detector = AnomalyDetector()
    try:
        detector.fit(mapped_txns)
        print("Fit success!")
        res = detector.predict(mapped_txns)
        print("Predict success!", res)
    except Exception as e:
        traceback.print_exc()

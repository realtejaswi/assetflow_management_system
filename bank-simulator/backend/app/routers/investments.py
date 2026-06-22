from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.investment import FDCreate, StockPurchase, MFPurchase, GoldPurchase, MOCK_STOCKS, MOCK_MFS
from app.services.investment_service import (
    create_fd, purchase_stock, purchase_mf, purchase_gold,
    STOCK_PRICES, MF_NAVS, GOLD_RATE_PER_GRAM
)
from app.routers.auth import get_current_user
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/investments", tags=["Investments"])


@router.get("/market/stocks")
async def get_stock_market():
    """Get current stock prices."""
    return [
        {"symbol": sym, "name": MOCK_STOCKS[sym]["name"],
         "sector": MOCK_STOCKS[sym]["sector"], "price": STOCK_PRICES.get(sym, 0)}
        for sym in MOCK_STOCKS
    ]


@router.get("/market/mutual-funds")
async def get_mf_market():
    return [
        {"fund_code": code, "name": MOCK_MFS[code]["name"],
         "category": MOCK_MFS[code]["category"], "nav": MF_NAVS.get(code, 0)}
        for code in MOCK_MFS
    ]


@router.get("/market/gold")
async def get_gold_rate():
    return {"rate_per_gram_24k": GOLD_RATE_PER_GRAM, "updated_at": datetime.utcnow()}


# ── Fixed Deposits ────────────────────────────────────────────

@router.post("/fds", status_code=201)
async def create_fixed_deposit(data: FDCreate, current_user=Depends(get_current_user)):
    try:
        return await create_fd(data.model_dump(), str(current_user["_id"]))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/fds")
async def list_fds(current_user=Depends(get_current_user)):
    db = get_db()
    cursor = db.fds.find({"user_id": str(current_user["_id"])})
    fds = await cursor.to_list(100)
    for f in fds:
        f["id"] = str(f.pop("_id"))
    return fds


# ── Stocks ────────────────────────────────────────────────────

@router.post("/stocks", status_code=201)
async def buy_stock(data: StockPurchase, current_user=Depends(get_current_user)):
    try:
        return await purchase_stock(data.symbol, data.quantity, data.account_id, str(current_user["_id"]))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/stocks")
async def list_stocks(current_user=Depends(get_current_user)):
    db = get_db()
    cursor = db.stocks.find({"user_id": str(current_user["_id"])})
    stocks = await cursor.to_list(100)
    for s in stocks:
        s["id"] = str(s.pop("_id"))
        current = STOCK_PRICES.get(s["symbol"], s["avg_purchase_price"])
        s["current_price"] = current
        s["current_value"] = round(current * s["quantity"], 2)
        invested = s["avg_purchase_price"] * s["quantity"]
        s["gain_loss"] = round(s["current_value"] - invested, 2)
        s["gain_loss_pct"] = round((s["gain_loss"] / invested) * 100, 2) if invested > 0 else 0
    return stocks


# ── Mutual Funds ──────────────────────────────────────────────

@router.post("/mutual-funds", status_code=201)
async def buy_mf(data: MFPurchase, current_user=Depends(get_current_user)):
    try:
        return await purchase_mf(data.fund_code, data.units, data.account_id, str(current_user["_id"]))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/mutual-funds")
async def list_mfs(current_user=Depends(get_current_user)):
    db = get_db()
    cursor = db.mutual_funds.find({"user_id": str(current_user["_id"])})
    mfs = await cursor.to_list(100)
    for m in mfs:
        m["id"] = str(m.pop("_id"))
        nav = MF_NAVS.get(m["fund_code"], m["avg_nav"])
        m["current_nav"] = nav
        m["current_value"] = round(nav * m["units"], 2)
        m["invested_amount"] = round(m["avg_nav"] * m["units"], 2)
        m["gain_loss"] = round(m["current_value"] - m["invested_amount"], 2)
        m["gain_loss_pct"] = round((m["gain_loss"] / m["invested_amount"]) * 100, 2) if m["invested_amount"] > 0 else 0
    return mfs


# ── Gold ──────────────────────────────────────────────────────

@router.post("/gold", status_code=201)
async def buy_gold(data: GoldPurchase, current_user=Depends(get_current_user)):
    try:
        return await purchase_gold(data.grams, data.gold_type, data.account_id, str(current_user["_id"]))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/gold")
async def list_gold(current_user=Depends(get_current_user)):
    db = get_db()
    cursor = db.gold.find({"user_id": str(current_user["_id"])})
    holdings = await cursor.to_list(100)
    for g in holdings:
        g["id"] = str(g.pop("_id"))
        g["current_price_per_gram"] = GOLD_RATE_PER_GRAM
        g["current_value"] = round(g["grams"] * GOLD_RATE_PER_GRAM, 2)
        g["purchase_value"] = round(g["grams"] * g["purchase_price_per_gram"], 2)
        g["gain_loss"] = round(g["current_value"] - g["purchase_value"], 2)
        g["gain_loss_pct"] = round((g["gain_loss"] / g["purchase_value"]) * 100, 2) if g["purchase_value"] > 0 else 0
    return holdings


@router.get("/summary")
async def investment_summary(current_user=Depends(get_current_user)):
    """Get investment portfolio summary."""
    db = get_db()
    user_id = str(current_user["_id"])

    stocks = await db.stocks.find({"user_id": user_id}).to_list(100)
    mfs = await db.mutual_funds.find({"user_id": user_id}).to_list(100)
    gold = await db.gold.find({"user_id": user_id}).to_list(100)
    fds = await db.fds.find({"user_id": user_id, "status": "active"}).to_list(100)

    stocks_value = sum(STOCK_PRICES.get(s["symbol"], s["avg_purchase_price"]) * s["quantity"] for s in stocks)
    mf_value = sum(MF_NAVS.get(m["fund_code"], m["avg_nav"]) * m["units"] for m in mfs)
    gold_value = sum(g["grams"] * GOLD_RATE_PER_GRAM for g in gold)
    fd_value = sum(f["amount"] for f in fds)

    return {
        "total_stocks_value": round(stocks_value, 2),
        "total_mf_value": round(mf_value, 2),
        "total_gold_value": round(gold_value, 2),
        "total_fd_value": round(fd_value, 2),
        "total_investment_value": round(stocks_value + mf_value + gold_value + fd_value, 2),
    }

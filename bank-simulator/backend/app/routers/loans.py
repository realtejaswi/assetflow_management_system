from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId

from app.database import get_db
from app.models.loan import LoanCreate, LoanResponse, EMIResponse
from app.services.loan_service import create_loan, process_emi_payment
from app.routers.auth import get_current_user

router = APIRouter(prefix="/loans", tags=["Loans"])


def _sanitize(doc: dict) -> dict:
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, dict):
            out[k] = _sanitize(v)
        elif isinstance(v, list):
            out[k] = [_sanitize(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        else:
            out[k] = v
    return out


def _doc_to_loan(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return _sanitize(doc)


@router.post("/", status_code=201)
async def apply_loan(data: LoanCreate, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    try:
        loan = await create_loan(data.model_dump(), user_id)
        return loan
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
async def list_loans(current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    cursor = db.loans.find({"user_id": user_id}).sort("created_at", -1)
    loans = await cursor.to_list(length=100)
    return [_doc_to_loan(l) for l in loans]


@router.get("/{loan_id}")
async def get_loan(loan_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    loan = await db.loans.find_one({"_id": ObjectId(loan_id), "user_id": user_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return _doc_to_loan(loan)


@router.get("/{loan_id}/schedule")
async def get_emi_schedule(loan_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    cursor = db.emis.find({"loan_id": loan_id, "user_id": user_id}).sort("emi_number", 1)
    emis = await cursor.to_list(length=500)
    for e in emis:
        e["id"] = str(e.pop("_id"))
    return emis


@router.post("/{loan_id}/pay-emi", status_code=200)
async def pay_emi(loan_id: str, current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    try:
        emi = await process_emi_payment(loan_id, user_id)
        return {"message": "EMI paid successfully", "emi": emi}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

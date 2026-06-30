from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging

from app.ollama_client import generate_response, check_ollama_health
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AssetFlow AI Advisor Service",
    version="1.0.0",
    description="AI-powered financial advisor using Ollama (phi3)",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are AssetFlow AI, an expert Indian certified financial planner (CFP).
You help users with personal finance, investments, tax planning, and budgeting.
Always:
- Use ₹ (Indian Rupees) for currency
- Reference Indian financial instruments (PPF, NPS, ELSS, FDs, etc.)
- Reference Indian tax laws (Section 80C, 80D, Old/New regime)
- Be concise, practical, and actionable
- Use bullet points and headers for clarity
- Give specific numbers when possible"""


class RecommendationRequest(BaseModel):
    user_id: str
    financial_profile: Dict[str, Any]
    recommendation_type: str = "general"  # general, budget, debt, tax, portfolio, emergency


class ChatRequest(BaseModel):
    user_id: str
    message: str
    context: Optional[Dict[str, Any]] = None
    conversation_history: Optional[List[Dict[str, str]]] = None


class QuickAdviceRequest(BaseModel):
    topic: str
    user_data: Optional[Dict[str, Any]] = None


def _build_financial_context(profile: Dict) -> str:
    income = profile.get("monthly_income", 0)
    expense = profile.get("monthly_expense", 0)
    savings = income - expense
    net_worth = profile.get("net_worth", 0)
    liabilities = profile.get("total_liabilities", 0)
    health_score = profile.get("health_score", 0)

    return f"""User Financial Profile:
- Monthly Income: ₹{income:,.0f}
- Monthly Expense: ₹{expense:,.0f}
- Monthly Savings: ₹{savings:,.0f} ({(savings/income*100 if income>0 else 0):.1f}% of income)
- Net Worth: ₹{net_worth:,.0f}
- Total Liabilities: ₹{liabilities:,.0f}
- Financial Health Score: {health_score}/100
- Top Expense Categories: {profile.get("top_categories", "Unknown")}"""


@app.post("/recommend")
async def get_recommendation(req: RecommendationRequest):
    """Generate AI financial recommendation."""
    context = _build_financial_context(req.financial_profile)

    prompts = {
        "general": f"{context}\n\nProvide comprehensive financial advice and top 5 action items.",
        "budget": f"{context}\n\nCreate a detailed monthly budget plan and identify areas to reduce spending.",
        "debt": f"{context}\n\nDesign a debt reduction strategy. Monthly EMI: ₹{req.financial_profile.get('monthly_emi', 0):,.0f}. Suggest payoff timeline.",
        "tax": f"{context}\n\nSuggest tax-saving strategies for FY 2024-25. Annual income: ₹{req.financial_profile.get('monthly_income', 0)*12:,.0f}. Compare Old vs New regime.",
        "portfolio": f"{context}\n\nRecommend an investment portfolio allocation based on this profile. Include specific fund recommendations.",
        "emergency": f"{context}\n\nCurrent emergency fund: ₹{req.financial_profile.get('emergency_fund', 0):,.0f}. Provide strategy to build a 6-month emergency fund.",
    }

    prompt = prompts.get(req.recommendation_type, prompts["general"])
    response = await generate_response(prompt, SYSTEM_PROMPT)

    return {
        "user_id": req.user_id,
        "recommendation_type": req.recommendation_type,
        "advice": response,
        "model": "phi3" if response else "mock",
    }


@app.post("/chat")
async def chat_with_advisor(req: ChatRequest):
    """Conversational AI financial advisor."""
    context_str = ""
    if req.context:
        context_str = f"\n\nUser Context: {_build_financial_context(req.context)}"

    history_str = ""
    if req.conversation_history:
        history_str = "\n\nConversation History:\n" + "\n".join(
            [f"{h['role'].upper()}: {h['content']}" for h in req.conversation_history[-5:]]
        )

    full_prompt = f"{history_str}{context_str}\n\nUser Question: {req.message}\n\nProvide a helpful, specific, actionable response:"
    response = await generate_response(full_prompt, SYSTEM_PROMPT)

    return {
        "user_id": req.user_id,
        "response": response,
        "model": "ollama/phi3",
    }


@app.post("/quick-advice")
async def quick_advice(req: QuickAdviceRequest):
    """Get quick advice on a specific financial topic."""
    topic_prompts = {
        "sip": "Explain SIP (Systematic Investment Plan) and recommend how to start with ₹5,000/month for a 5-year goal.",
        "fd": "Compare Fixed Deposits vs Debt Mutual Funds for a 1-year horizon in India.",
        "term_insurance": "Explain term insurance and recommend coverage amount calculation for an Indian professional.",
        "ppf": "Explain PPF benefits, contribution limits, and when to choose it over ELSS.",
        "nps": "Explain National Pension System (NPS) tax benefits under Section 80CCD.",
    }

    prompt = topic_prompts.get(req.topic.lower(), f"Explain '{req.topic}' in the context of Indian personal finance.")
    if req.user_data:
        prompt += f"\n\nUser data: {req.user_data}"

    response = await generate_response(prompt, SYSTEM_PROMPT)
    return {"topic": req.topic, "advice": response}


@app.get("/status")
async def ollama_status():
    """Check Ollama availability."""
    return await check_ollama_health()


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-service"}


@app.get("/")
async def root():
    return {"service": "AssetFlow AI Advisor", "version": "1.0.0", "model": "phi3"}

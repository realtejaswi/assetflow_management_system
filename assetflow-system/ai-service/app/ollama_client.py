import httpx
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi3")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", 120))

# Mock responses when Ollama is unavailable
MOCK_RESPONSES = {
    "financial_advice": """Based on your financial profile, here are my key recommendations:

1. **Emergency Fund**: Ensure you have 6 months of expenses saved in a liquid account before investing aggressively.

2. **Debt Management**: If your EMI payments exceed 40% of your income, prioritize debt reduction. Consider making prepayments on high-interest personal loans first.

3. **Investment Strategy**: Follow the 50-30-20 rule — 50% needs, 30% wants, 20% savings & investments. For Indian investors, a mix of ELSS funds (tax-saving), index funds, and PPF is recommended.

4. **Tax Optimization**: Maximize Section 80C (₹1.5L limit) through ELSS, PPF, or home loan principal. Evaluate Old vs New tax regime annually.

5. **SIP Discipline**: Start a monthly SIP — even ₹2,000/month in a diversified fund can grow to ₹12+ lakhs in 15 years at 12% CAGR.

**Bottom line**: Build the emergency fund first, then eliminate high-cost debt, then invest consistently.""",

    "budget_recommendation": """Here's a personalized budget recommendation:

**Monthly Budget Allocation (50-30-20 Framework):**
- Essentials (50%): Rent, utilities, groceries, transportation
- Wants (30%): Dining out, entertainment, shopping
- Savings & Investments (20%): SIPs, FD, emergency fund

**Immediate Actions:**
1. Track all spending for 30 days to identify leaks
2. Cancel unused subscriptions (check OTT, gym memberships)
3. Set up auto-debit for SIPs on salary day
4. Review and reduce grocery/food delivery spending""",

    "debt_reduction": """**Debt Reduction Strategy (Avalanche Method):**

1. List all debts by interest rate (highest first)
2. Pay minimums on all debts
3. Put all extra money toward the highest-rate debt
4. Personal loans (14-24%) > Credit cards (36%+) > Vehicle loans (8-12%) > Home loans (7-9%)

**Quick Wins:**
- Avoid new credit card debt
- Consider balance transfer to lower-rate cards
- Make bi-weekly payments instead of monthly to reduce interest
- Negotiate with lenders for lower rates if you have a good credit history""",

    "tax_saving": """**Tax Saving Opportunities for FY 2024-25:**

**Section 80C (₹1.5 lakh limit):**
- ELSS Mutual Funds (3-year lock-in, market-linked returns ~12%)
- PPF (15-year lock-in, ~7.1% tax-free)
- Home Loan Principal repayment
- Life Insurance Premium

**Additional Deductions:**
- Section 80D: Health insurance premium (₹25,000 self + ₹25,000 parents)
- Section 80CCD(1B): NPS additional ₹50,000 deduction
- Section 24(b): Home Loan interest up to ₹2 lakh
- HRA: If renting, claim House Rent Allowance

**Recommendation**: Compare Old vs New regime every year — use our Tax Dashboard for precise calculation.""",
}


async def generate_response(prompt: str, system_prompt: str = "") -> str:
    """Generate response using Ollama, with mock fallback."""
    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "system": system_prompt or "You are AssetFlow AI, an expert Indian financial advisor. Provide clear, actionable, India-specific financial advice. Use ₹ for currency. Be concise and practical.",
                "stream": False,
                "options": {"temperature": 0.7, "top_p": 0.9, "num_predict": 500},
            }
            response = await client.post(f"{OLLAMA_URL}/api/generate", json=payload)
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "")
    except Exception as e:
        logger.warning(f"Ollama unavailable ({e}), using mock response")

    # Fallback: return relevant mock response
    prompt_lower = prompt.lower()
    if "budget" in prompt_lower:
        return MOCK_RESPONSES["budget_recommendation"]
    elif "debt" in prompt_lower or "loan" in prompt_lower or "emi" in prompt_lower:
        return MOCK_RESPONSES["debt_reduction"]
    elif "tax" in prompt_lower:
        return MOCK_RESPONSES["tax_saving"]
    else:
        return MOCK_RESPONSES["financial_advice"]


async def check_ollama_health() -> dict:
    """Check if Ollama is running and model is available."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            if response.status_code == 200:
                tags = response.json()
                models = [m["name"] for m in tags.get("models", [])]
                return {
                    "ollama_running": True,
                    "model_available": any(OLLAMA_MODEL in m for m in models),
                    "available_models": models,
                }
    except Exception:
        pass
    return {"ollama_running": False, "model_available": False, "available_models": []}

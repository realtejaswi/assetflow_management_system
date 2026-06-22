from typing import Dict, List, Optional
from pydantic import BaseModel


# ── FY 2024-25 Tax Slabs ──────────────────────────────────────

OLD_REGIME_SLABS = [
    (250000, 0.0),
    (500000, 0.05),
    (1000000, 0.20),
    (float("inf"), 0.30),
]

NEW_REGIME_SLABS = [
    (300000, 0.0),
    (600000, 0.05),
    (900000, 0.10),
    (1200000, 0.15),
    (1500000, 0.20),
    (float("inf"), 0.30),
]

STANDARD_DEDUCTION = 50000  # Old regime
NEW_REGIME_STANDARD_DEDUCTION = 75000  # New regime FY 2024-25

# Surcharge thresholds
SURCHARGE_RATES = [
    (5000000, 0.10),
    (10000000, 0.15),
    (20000000, 0.25),
    (50000000, 0.25),
    (float("inf"), 0.37),
]


class Deductions(BaseModel):
    section_80c: float = 0        # Max 1,50,000
    section_80d: float = 0        # Max 25,000 (self) + 25,000 (parents)
    section_80d_parents_senior: bool = False  # If parents are senior citizens, max 50,000
    nps_80ccd_1b: float = 0       # Max 50,000
    hra: float = 0
    home_loan_interest_24b: float = 0  # Max 2,00,000
    home_loan_principal_80c: float = 0  # Included in 80C
    other_deductions: float = 0


class TaxInput(BaseModel):
    annual_income: float
    deductions: Deductions = Deductions()
    financial_year: str = "2024-25"
    age: int = 30  # Age affects basic exemption for old regime


def _calculate_tax_on_slabs(taxable_income: float, slabs: List) -> float:
    tax = 0.0
    prev_limit = 0
    for limit, rate in slabs:
        if taxable_income <= prev_limit:
            break
        slab_income = min(taxable_income, limit) - prev_limit
        tax += slab_income * rate
        prev_limit = limit
        if taxable_income <= limit:
            break
    return tax


def _add_cess(tax: float) -> float:
    """Add 4% Health & Education Cess."""
    return tax * 1.04


def _add_surcharge(tax: float, income: float) -> float:
    """Add surcharge based on income."""
    for threshold, rate in SURCHARGE_RATES:
        if income <= threshold:
            return tax * (1 + rate)
    return tax * 1.37


def _apply_87a_rebate(tax: float, taxable_income: float, regime: str) -> float:
    """Section 87A rebate: Full tax rebate if income ≤ 7L (new) or 5L (old)."""
    if regime == "new" and taxable_income <= 700000:
        return 0
    elif regime == "old" and taxable_income <= 500000:
        return 0
    return tax


def calculate_old_regime_tax(data: TaxInput) -> Dict:
    d = data.deductions
    gross = data.annual_income

    # Standard deduction
    gross_after_sd = max(0, gross - STANDARD_DEDUCTION)

    # 80C (max 1.5L)
    deduction_80c = min(d.section_80c + d.home_loan_principal_80c, 150000)

    # 80D (max 25K self + 25K/50K parents)
    parent_max = 50000 if d.section_80d_parents_senior else 25000
    deduction_80d = min(d.section_80d, 25000) + min(0, parent_max)  # simplified

    # NPS 80CCD(1B) max 50K
    deduction_nps = min(d.nps_80ccd_1b, 50000)

    # Home loan interest 24(b) max 2L
    deduction_hl_interest = min(d.home_loan_interest_24b, 200000)

    total_deductions = deduction_80c + deduction_80d + deduction_nps + deduction_hl_interest + d.hra + d.other_deductions
    taxable = max(0, gross_after_sd - total_deductions)

    raw_tax = _calculate_tax_on_slabs(taxable, OLD_REGIME_SLABS)
    raw_tax = _apply_87a_rebate(raw_tax, taxable, "old")
    final_tax = _add_cess(raw_tax)

    return {
        "regime": "old",
        "gross_income": gross,
        "standard_deduction": STANDARD_DEDUCTION,
        "total_deductions": round(total_deductions, 2),
        "taxable_income": round(taxable, 2),
        "tax_before_cess": round(raw_tax, 2),
        "cess_4pct": round(final_tax - raw_tax, 2),
        "total_tax": round(final_tax, 2),
        "effective_rate": round((final_tax / gross * 100) if gross > 0 else 0, 2),
        "monthly_tax": round(final_tax / 12, 2),
        "deduction_breakdown": {
            "80C": round(deduction_80c, 2),
            "80D": round(deduction_80d, 2),
            "NPS_80CCD_1B": round(deduction_nps, 2),
            "Home_Loan_Interest_24B": round(deduction_hl_interest, 2),
            "HRA": round(d.hra, 2),
            "Other": round(d.other_deductions, 2),
        }
    }


def calculate_new_regime_tax(data: TaxInput) -> Dict:
    gross = data.annual_income

    # New regime: very limited deductions
    taxable = max(0, gross - NEW_REGIME_STANDARD_DEDUCTION)

    raw_tax = _calculate_tax_on_slabs(taxable, NEW_REGIME_SLABS)
    raw_tax = _apply_87a_rebate(raw_tax, taxable, "new")
    final_tax = _add_cess(raw_tax)

    return {
        "regime": "new",
        "gross_income": gross,
        "standard_deduction": NEW_REGIME_STANDARD_DEDUCTION,
        "total_deductions": NEW_REGIME_STANDARD_DEDUCTION,
        "taxable_income": round(taxable, 2),
        "tax_before_cess": round(raw_tax, 2),
        "cess_4pct": round(final_tax - raw_tax, 2),
        "total_tax": round(final_tax, 2),
        "effective_rate": round((final_tax / gross * 100) if gross > 0 else 0, 2),
        "monthly_tax": round(final_tax / 12, 2),
    }


def compare_regimes(data: TaxInput) -> Dict:
    old = calculate_old_regime_tax(data)
    new = calculate_new_regime_tax(data)
    savings = old["total_tax"] - new["total_tax"]
    recommended = "new" if savings < 0 else "old"

    return {
        "old_regime": old,
        "new_regime": new,
        "tax_difference": round(abs(savings), 2),
        "recommended_regime": recommended,
        "savings_with_recommended": round(abs(savings), 2),
        "reason": (
            f"New regime saves ₹{abs(savings):,.0f} annually"
            if savings < 0
            else f"Old regime saves ₹{savings:,.0f} annually with deductions"
        ),
        "tax_saving_opportunities": _get_tax_opportunities(data, old, new),
    }


def _get_tax_opportunities(data: TaxInput, old: Dict, new: Dict) -> List[str]:
    opportunities = []
    d = data.deductions
    if d.section_80c < 150000:
        gap = 150000 - d.section_80c
        opportunities.append(f"Invest ₹{gap:,.0f} more in 80C (ELSS/PPF) to maximize deduction")
    if d.nps_80ccd_1b < 50000:
        opportunities.append(f"Contribute ₹{50000 - d.nps_80ccd_1b:,.0f} more to NPS for extra 80CCD(1B) deduction")
    if d.section_80d < 25000:
        opportunities.append(f"Buy health insurance for ₹25,000 deduction under Section 80D")
    if d.home_loan_interest_24b == 0:
        opportunities.append("Home loan interest up to ₹2 lakh is deductible under Section 24(b)")
    return opportunities

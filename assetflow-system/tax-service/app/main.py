from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import io
import logging
from datetime import datetime

from app.engine.tax_engine import TaxInput, Deductions, compare_regimes, calculate_old_regime_tax, calculate_new_regime_tax

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="AssetFlow Tax Service", version="1.0.0", description="Indian Tax Calculation Engine FY 2024-25")


class TaxCalculateRequest(BaseModel):
    annual_income: float
    age: int = 30
    section_80c: float = 0
    section_80d: float = 0
    section_80d_parents_senior: bool = False
    nps_80ccd_1b: float = 0
    hra: float = 0
    home_loan_interest: float = 0
    home_loan_principal: float = 0
    other_deductions: float = 0


def _build_tax_input(req: TaxCalculateRequest) -> TaxInput:
    return TaxInput(
        annual_income=req.annual_income,
        age=req.age,
        deductions=Deductions(
            section_80c=req.section_80c,
            section_80d=req.section_80d,
            section_80d_parents_senior=req.section_80d_parents_senior,
            nps_80ccd_1b=req.nps_80ccd_1b,
            hra=req.hra,
            home_loan_interest_24b=req.home_loan_interest,
            home_loan_principal_80c=req.home_loan_principal,
            other_deductions=req.other_deductions,
        )
    )


@app.post("/calculate/old-regime")
async def calculate_old(req: TaxCalculateRequest):
    """Calculate tax under Old Regime with all deductions."""
    return calculate_old_regime_tax(_build_tax_input(req))


@app.post("/calculate/new-regime")
async def calculate_new(req: TaxCalculateRequest):
    """Calculate tax under New Regime (limited deductions)."""
    return calculate_new_regime_tax(_build_tax_input(req))


@app.post("/compare")
async def compare(req: TaxCalculateRequest):
    """Compare Old vs New regime and recommend the better one."""
    return compare_regimes(_build_tax_input(req))


@app.post("/report/pdf")
async def generate_pdf_report(req: TaxCalculateRequest):
    """Generate downloadable PDF tax report."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.colors import HexColor, black, white
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.units import cm

        comparison = compare_regimes(_build_tax_input(req))
        old = comparison["old_regime"]
        new = comparison["new_regime"]

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = ParagraphStyle("title", parent=styles["Title"],
                                     fontSize=20, textColor=HexColor("#1a237e"), spaceAfter=10)
        story.append(Paragraph("AssetFlow Tax Report", title_style))
        story.append(Paragraph(f"Financial Year: 2024-25 | Generated: {datetime.now().strftime('%d %b %Y')}", styles["Normal"]))
        story.append(Spacer(1, 0.5*cm))

        # Summary
        story.append(Paragraph("Tax Summary Comparison", styles["Heading2"]))
        summary_data = [
            ["Parameter", "Old Regime (₹)", "New Regime (₹)"],
            ["Gross Income", f"{req.annual_income:,.0f}", f"{req.annual_income:,.0f}"],
            ["Total Deductions", f"{old['total_deductions']:,.0f}", f"{new['total_deductions']:,.0f}"],
            ["Taxable Income", f"{old['taxable_income']:,.0f}", f"{new['taxable_income']:,.0f}"],
            ["Tax Payable", f"{old['tax_before_cess']:,.0f}", f"{new['tax_before_cess']:,.0f}"],
            ["Cess (4%)", f"{old['cess_4pct']:,.0f}", f"{new['cess_4pct']:,.0f}"],
            ["TOTAL TAX", f"{old['total_tax']:,.0f}", f"{new['total_tax']:,.0f}"],
            ["Effective Rate", f"{old['effective_rate']}%", f"{new['effective_rate']}%"],
            ["Monthly Tax", f"{old['monthly_tax']:,.0f}", f"{new['monthly_tax']:,.0f}"],
        ]
        table = Table(summary_data, colWidths=[6*cm, 5*cm, 5*cm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a237e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#f5f5f5"), white]),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(table)
        story.append(Spacer(1, 0.5*cm))

        # Recommendation
        rec_style = ParagraphStyle("rec", parent=styles["Normal"],
                                   backColor=HexColor("#e8f5e9"), borderPadding=8)
        rec = comparison["recommended_regime"].upper()
        story.append(Paragraph(f"<b>✅ Recommended: {rec} REGIME</b>", styles["Heading3"]))
        story.append(Paragraph(comparison["reason"], styles["Normal"]))
        story.append(Spacer(1, 0.5*cm))

        # Tax Saving Opportunities
        if comparison["tax_saving_opportunities"]:
            story.append(Paragraph("Tax Saving Opportunities", styles["Heading2"]))
            for opp in comparison["tax_saving_opportunities"]:
                story.append(Paragraph(f"• {opp}", styles["Normal"]))

        doc.build(story)
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=tax_report_FY2024-25.pdf"}
        )
    except ImportError:
        raise HTTPException(500, "ReportLab not installed")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "tax-service"}


@app.get("/")
async def root():
    return {"service": "AssetFlow Tax Service", "fy": "2024-25"}

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from .ml_engine import build_ai_recommendation, build_ml_assessment
    from .intelligence import (
        analyze_behavioral_risk,
        build_department_spending_alert,
        build_portfolio_analytics,
        detect_duplicate_invoice,
        get_claim_history,
        infer_department,
        register_claim,
        score_vendor_risk,
        track_compliance_score,
    )
    from .policy_rules import (
        CATEGORY_LIMITS,
        GST_RATE_TABLE,
        detect_policy_violations,
        validate_gst,
    )
    from .risk_engine import build_risk_profile
except ImportError:
    from ml_engine import build_ai_recommendation, build_ml_assessment
    from intelligence import (
        analyze_behavioral_risk,
        build_department_spending_alert,
        build_portfolio_analytics,
        detect_duplicate_invoice,
        get_claim_history,
        infer_department,
        register_claim,
        score_vendor_risk,
        track_compliance_score,
    )
    from policy_rules import (
        CATEGORY_LIMITS,
        GST_RATE_TABLE,
        detect_policy_violations,
        validate_gst,
    )
    from risk_engine import build_risk_profile


app = FastAPI(
    title="FinSight Reimbursement API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

company_policy = {
    "limits": CATEGORY_LIMITS.copy(),
    "gst_rates": GST_RATE_TABLE.copy(),
    "risk_thresholds": {
        "high": 70,
        "medium": 40,
    },
}


class ClaimRequest(BaseModel):
    employee: str
    category: str
    amount: float
    gst: float
    vendor: str
    department: str | None = None


@app.get("/")
def read_root():
    return {"message": "FinSight backend running"}


@app.get("/policy")
def get_policy():
    return company_policy


@app.post("/policy/update")
def update_policy(new_policy: dict):
    global company_policy

    for key in new_policy:
        if key in company_policy:
            company_policy[key].update(new_policy[key])

    return {"status": "updated", "policy": company_policy}


@app.get("/claims")
def get_all_claims():
    return {
        "status": "OK",
        "claims": get_claim_history(),
    }


@app.get("/dashboard/analytics")
def get_dashboard_analytics():
    history = get_claim_history()
    return {
        "status": "OK",
        "dashboard": build_portfolio_analytics(history),
    }


@app.post("/claims/submit")
def submit_claim(claim: ClaimRequest):
    claim_data = claim.model_dump() if hasattr(claim, "model_dump") else claim.dict()
    claim_data["category"] = claim_data["category"].strip().lower()
    claim_data["department"] = infer_department(
        claim_data["employee"], claim_data.get("department")
    )

    history = get_claim_history()
    gst_result = validate_gst(
        claim_data["category"],
        claim_data["amount"],
        claim_data["gst"],
    )
    policy_violations = detect_policy_violations(claim_data)
    duplicate_result = detect_duplicate_invoice(claim_data, history)
    behavioral_risk = analyze_behavioral_risk(claim_data, history)
    vendor_risk = score_vendor_risk(claim_data, history)
    department_alert = build_department_spending_alert(claim_data, history)
    compliance_score = track_compliance_score(
        policy_violations,
        gst_result["issues"],
        duplicate_result,
        behavioral_risk,
        vendor_risk,
    )

    ml_assessment = build_ml_assessment(
        claim_data,
        history,
        gst_result["issues"],
        policy_violations,
        duplicate_result,
        vendor_risk,
        behavioral_risk,
        risk_score=0,
    )

    risk_profile = build_risk_profile(
        claim_data,
        policy_violations,
        gst_result["issues"],
        duplicate_result,
        behavioral_risk,
        vendor_risk,
        department_alert,
        ml_assessment["anomaly_score"],
        ml_assessment["fraud_probability"],
    )
    ml_assessment["ai_recommendation"] = build_ai_recommendation(
        risk_score=risk_profile["score"],
        anomaly_score=ml_assessment["anomaly_score"],
        fraud_probability=ml_assessment["fraud_probability"],
        explanation=ml_assessment["explanation"],
    )

    total_exposure = round(claim_data["amount"] + claim_data["gst"], 2)

    status = "CLEAR"
    if risk_profile["level"] == "HIGH" or duplicate_result["is_duplicate"]:
        status = "FLAGGED"
    elif policy_violations or not gst_result["valid"]:
        status = "REVIEW"

    if ml_assessment["ai_recommendation"]["decision"] == "FLAG":
        status = "FLAGGED"
    elif ml_assessment["ai_recommendation"]["decision"] == "REVIEW" and status == "CLEAR":
        status = "REVIEW"

    stored_claim = register_claim(
        {
            **claim_data,
            "status": status,
            "risk_level": risk_profile["level"],
            "risk_score": risk_profile["score"],
            "compliance_score": compliance_score["score"],
            "anomaly_score": ml_assessment["anomaly_score"],
            "fraud_probability": ml_assessment["fraud_probability"],
            "ai_recommendation": ml_assessment["ai_recommendation"]["decision"],
        }
    )

    return {
        "status": status,
        "claim_id": stored_claim["id"],
        "anomaly_score": ml_assessment["anomaly_score"],
        "fraud_probability": ml_assessment["fraud_probability"],
        "ai_recommendation": ml_assessment["ai_recommendation"],
        "explanation": ml_assessment["explanation"],
        "claim": {
            **claim_data,
            "total_exposure": total_exposure,
        },
        "assessment": {
            "gst": gst_result,
            "policy_violations": policy_violations,
            "duplicate_invoice": duplicate_result,
            "behavioral_risk": behavioral_risk,
            "vendor_risk": vendor_risk,
            "department_alert": department_alert,
            "compliance_score": compliance_score,
            "ml_intelligence": ml_assessment,
            "risk": risk_profile,
        },
    }

from __future__ import annotations

import importlib.util
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

try:
    from .billing_engine import analyze_billing_invoice
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
        set_admin_decision,
        track_compliance_score,
    )
    from .policy_rules import (
        detect_policy_violations,
        validate_gst,
    )
    from .policy_store import get_policy, update_policy, get_policy_store
    from .ocr_engine import extract_text, parse_receipt
    from .risk_engine import build_risk_profile
except ImportError:
    from billing_engine import analyze_billing_invoice
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
        set_admin_decision,
        track_compliance_score,
    )
    from policy_rules import (
        detect_policy_violations,
        validate_gst,
    )
    from policy_store import get_policy, update_policy, get_policy_store
    from ocr_engine import extract_text, parse_receipt
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

multipart_available = importlib.util.find_spec("multipart") is not None
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

OCR_DEFAULTS = {
    "vendor": "Unknown Vendor",
    "amount": 0.0,
    "gst": 0.0,
    "category": "travel",
}

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
ADMIN_TOKEN = "admin-secret-token"


class ClaimRequest(BaseModel):
    employee: str
    category: str
    amount: float
    gst: float
    vendor: str
    department: str | None = None
    is_inter_state: bool = False


class BillingRequest(BaseModel):
    vendor: str
    amount: float
    gst: float
    date: str
    category: str
    department: str | None = None
    invoice_total: float | None = None
    is_inter_state: bool = False


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminDecisionRequest(BaseModel):
    decision: str
    reason: str


@app.get("/")
def read_root():
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    return {"message": "FinSight backend running"}


@app.get("/policy")
def get_policy_endpoint():
    """Get the current policy configuration from the dynamic policy store."""
    return get_policy()


@app.post("/policy/update")
def update_policy_endpoint(new_policy: dict):
    """Update the policy configuration in the dynamic policy store.
    
    Changes are immediately reflected in:
    - GST validation (rates, tolerance)
    - Policy violation checks (category limits, restricted vendors)
    - Risk scoring (thresholds)
    
    No server restart required.
    """
    updated = update_policy(new_policy)
    return {"status": "updated", "policy": updated, "message": "Policy updated successfully. Changes are now active."}


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
        claim_data.get("is_inter_state", False),
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

    system_status = "CLEAR"
    if risk_profile["level"] == "HIGH" or duplicate_result["is_duplicate"]:
        system_status = "FLAGGED"
    elif policy_violations or not gst_result["valid"]:
        system_status = "REVIEW"

    if ml_assessment["ai_recommendation"]["decision"] == "FLAG":
        system_status = "FLAGGED"
    elif (
        ml_assessment["ai_recommendation"]["decision"] == "REVIEW"
        and system_status == "CLEAR"
    ):
        system_status = "REVIEW"

    stored_claim = register_claim(
        {
            **claim_data,
            "status": "SUBMITTED",
            "system_status": system_status,
            "admin_status": None,
            "admin_reason": "",
            "admin_timestamp": None,
            "admin_user": "",
            "risk_level": risk_profile["level"],
            "risk_score": risk_profile["score"],
            "compliance_score": compliance_score["score"],
            "anomaly_score": ml_assessment["anomaly_score"],
            "fraud_probability": ml_assessment["fraud_probability"],
            "ai_recommendation": ml_assessment["ai_recommendation"]["decision"],
        }
    )

    return {
        "status": "SUBMITTED",
        "system_status": system_status,
        "admin_status": None,
        "claim_id": stored_claim["id"],
        "anomaly_score": ml_assessment["anomaly_score"],
        "fraud_probability": ml_assessment["fraud_probability"],
        "ai_recommendation": ml_assessment["ai_recommendation"],
        "explanation": ml_assessment["explanation"],
        "claim": {
            **claim_data,
            "total_exposure": total_exposure,
            "status": "SUBMITTED",
            "system_status": system_status,
            "admin_status": None,
            "admin_reason": "",
            "admin_timestamp": None,
            "admin_user": "",
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


def verify_admin(authorization: str | None = Header(default=None)) -> None:
    token = ""
    if authorization:
        token = authorization.removeprefix("Bearer ").strip()

    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Admin authorization required")


@app.post("/admin/login")
def admin_login(credentials: AdminLoginRequest):
    if (
        credentials.username != ADMIN_USERNAME
        or credentials.password != ADMIN_PASSWORD
    ):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    return {"token": ADMIN_TOKEN}


@app.get("/admin/claims")
def get_admin_claims(_: None = Depends(verify_admin)):
    return {
        "status": "OK",
        "claims": get_claim_history(),
    }


@app.get("/admin/policy")
def admin_get_policy_endpoint(_: None = Depends(verify_admin)):
    """Admin endpoint to get current policy configuration with authentication."""
    return get_policy()


@app.post("/admin/policy/update")
def admin_update_policy_endpoint(new_policy: dict, _: None = Depends(verify_admin)):
    """Admin endpoint to update policy configuration with authentication.
    
    This is the recommended endpoint for production use as it requires
    admin authentication.
    """
    updated = update_policy(new_policy)
    return {"status": "updated", "policy": updated, "message": "Policy updated successfully. Changes are now active."}


@app.post("/admin/decision/{claim_id}")
def decide_claim(claim_id: str, request: AdminDecisionRequest, _: None = Depends(verify_admin)):
    decision = request.decision.strip().upper()
    reason = request.reason.strip()
    if decision not in {"APPROVED", "REJECTED", "FLAGGED"}:
        raise HTTPException(
            status_code=400,
            detail="Decision must be APPROVED, REJECTED, or FLAGGED",
        )

    if not reason:
        raise HTTPException(status_code=400, detail="Decision reason is required")

    updated_claim = set_admin_decision(
        claim_id,
        decision,
        reason,
        datetime.now(timezone.utc).isoformat(),
        "admin",
    )
    if updated_claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")

    return {"status": "OK", "claim": updated_claim}


def _safe_ocr_payload(
    raw_text: str = "",
    parsed: dict | None = None,
    message: str | None = None,
    success: bool = True,
):
    parsed = parsed or {}
    vendor = str(parsed.get("vendor") or OCR_DEFAULTS["vendor"]).strip()
    if vendor.lower() == OCR_DEFAULTS["vendor"].lower():
        vendor = OCR_DEFAULTS["vendor"]

    safe_parsed = {
        "vendor": vendor,
        "amount": _safe_float(parsed.get("amount"), OCR_DEFAULTS["amount"]),
        "gst": _safe_float(parsed.get("gst"), OCR_DEFAULTS["gst"]),
        "category": str(parsed.get("category") or OCR_DEFAULTS["category"]).strip().lower()
        or OCR_DEFAULTS["category"],
    }

    response = {
        "success": success,
        "raw_text": raw_text or "",
        "parsed": safe_parsed,
    }
    if message:
        response["message"] = message
    return response


def _safe_float(value, fallback: float) -> float:
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return fallback


if multipart_available:
    from fastapi import File

    @app.post("/ocr/extract")
    async def extract_receipt_data(file: UploadFile = File(...)):
        # OCR is extraction-only; claim analysis stays in /claims/submit.
        if not file.content_type or not file.content_type.startswith("image/"):
            return _safe_ocr_payload(
                message="Please upload an image file.",
                success=False,
            )

        image_bytes = await file.read()
        if not image_bytes:
            return _safe_ocr_payload(
                message="Uploaded file is empty.",
                success=False,
            )

        try:
            raw_text = extract_text(image_bytes)
            parsed = parse_receipt(raw_text)
        except Exception:
            return _safe_ocr_payload(
                message="OCR extraction failed; defaults were applied.",
                success=False,
            )

        return _safe_ocr_payload(raw_text=raw_text, parsed=parsed)
else:

    @app.post("/ocr/extract")
    async def extract_receipt_data_unavailable():
        return _safe_ocr_payload(
            message="OCR upload support is unavailable until python-multipart is installed.",
            success=False,
        )


@app.post("/billing/analyze")
def analyze_billing(request: BillingRequest):
    billing_data = request.model_dump() if hasattr(request, "model_dump") else request.dict()
    billing_data["category"] = billing_data["category"].strip().lower()
    history = get_claim_history()
    return analyze_billing_invoice(billing_data, history)


@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    index_file = FRONTEND_DIST / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Not found")

    requested_file = (FRONTEND_DIST / full_path).resolve()
    frontend_root = FRONTEND_DIST.resolve()

    try:
        requested_file.relative_to(frontend_root)
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found") from None

    if requested_file.is_file():
        return FileResponse(requested_file)

    return FileResponse(index_file)

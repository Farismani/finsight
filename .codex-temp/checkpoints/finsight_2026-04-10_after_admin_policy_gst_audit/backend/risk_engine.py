from __future__ import annotations

from typing import Any


def calculate_risk_score(
    claim: dict[str, Any],
    violations: list[str],
    gst_issues: list[str],
    duplicate_result: dict[str, Any] | None = None,
    behavioral_risk: dict[str, Any] | None = None,
    vendor_risk: dict[str, Any] | None = None,
    department_alert: dict[str, Any] | None = None,
    anomaly_score: float | None = None,
    fraud_probability: float | None = None,
) -> int:
    """Produce a simple 0-100 risk score for a reimbursement claim."""
    score = 5

    amount = float(claim["amount"])
    gst = float(claim["gst"])
    category = str(claim["category"]).strip().lower()
    vendor = str(claim["vendor"]).strip().lower()

    if amount >= 3000:
        score += 20
    elif amount >= 1000:
        score += 10

    if gst > 0 and amount > 0:
        gst_ratio = gst / amount
        if gst_ratio >= 0.15:
            score += 15
        elif gst_ratio >= 0.1:
            score += 8

    if category in {"travel", "medical"}:
        score += 10

    if any("restricted" in violation.lower() for violation in violations):
        score += 25

    if "unknown" in vendor:
        score += 10

    score += len(violations) * 12
    score += len(gst_issues) * 10

    if duplicate_result and duplicate_result.get("is_duplicate"):
        score += 25

    if behavioral_risk:
        score += round(behavioral_risk["score"] * 0.18)

    if vendor_risk:
        score += round(vendor_risk["score"] * 0.15)

    if department_alert and department_alert.get("level") == "HIGH":
        score += 12
    elif department_alert and department_alert.get("level") == "MEDIUM":
        score += 6

    if anomaly_score is not None:
        score += round(anomaly_score * 18)

    if fraud_probability is not None:
        score += round(fraud_probability * 24)

    return max(0, min(100, score))


def get_risk_level(score: int) -> str:
    """Map the numeric score to a discrete risk band."""
    if score >= 70:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def build_risk_profile(
    claim: dict[str, Any],
    violations: list[str],
    gst_issues: list[str],
    duplicate_result: dict[str, Any] | None = None,
    behavioral_risk: dict[str, Any] | None = None,
    vendor_risk: dict[str, Any] | None = None,
    department_alert: dict[str, Any] | None = None,
    anomaly_score: float | None = None,
    fraud_probability: float | None = None,
) -> dict[str, Any]:
    """Return a dashboard-friendly risk summary."""
    score = calculate_risk_score(
        claim,
        violations,
        gst_issues,
        duplicate_result,
        behavioral_risk,
        vendor_risk,
        department_alert,
        anomaly_score,
        fraud_probability,
    )
    level = get_risk_level(score)

    if score >= 70:
        label = "Escalate for immediate finance review"
    elif score >= 40:
        label = "Needs manager validation"
    else:
        label = "Safe for standard processing"

    return {
        "score": score,
        "level": level,
        "label": label,
        "drivers": {
            "policy_violation_count": len(violations),
            "gst_issue_count": len(gst_issues),
            "high_amount": float(claim["amount"]) >= 3000,
            "duplicate_invoice": bool(duplicate_result and duplicate_result.get("is_duplicate")),
            "behavioral_risk_level": behavioral_risk["level"] if behavioral_risk else "LOW",
            "vendor_risk_level": vendor_risk["level"] if vendor_risk else "LOW",
            "department_alert_level": department_alert["level"] if department_alert else "LOW",
            "anomaly_score": round(anomaly_score, 4) if anomaly_score is not None else None,
            "fraud_probability": round(fraud_probability, 4) if fraud_probability is not None else None,
            "sensitive_category": str(claim["category"]).strip().lower()
            in {"travel", "medical"},
        },
    }

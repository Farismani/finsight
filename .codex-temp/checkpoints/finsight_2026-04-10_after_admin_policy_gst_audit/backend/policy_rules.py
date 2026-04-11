from __future__ import annotations

from typing import Any


CATEGORY_LIMITS = {
    "travel": 5000.0,
    "meals": 500.0,
    "accommodation": 2500.0,
    "office_supplies": 800.0,
    "training": 3000.0,
    "medical": 1500.0,
}

RESTRICTED_VENDORS = {
    "cash reimbursement",
    "personal transfer",
    "unknown vendor",
}

HIGH_RISK_CATEGORIES = {"travel", "medical"}
DEFAULT_GST_RATE = 0.18
GST_RATES = {
    "travel": 0.05,
    "food": 0.05,
    "office": 0.18,
}
GST_CATEGORY_ALIASES = {
    "meals": "food",
    "office_supplies": "office",
}
GST_RATE_TABLE = {
    **GST_RATES,
    "meals": GST_RATES["food"],
    "office_supplies": GST_RATES["office"],
    "accommodation": 0.12,
    "training": 0.18,
    "medical": 0.0,
}
GST_TOLERANCE_AMOUNT = 5.0
GST_TOLERANCE_PERCENT = 0.02


def get_gst_rate(category: str) -> float:
    """Return the expected GST rate for a reimbursement category."""
    normalized_category = category.strip().lower()
    gst_category = GST_CATEGORY_ALIASES.get(normalized_category, normalized_category)
    return GST_RATES.get(gst_category, GST_RATE_TABLE.get(normalized_category, DEFAULT_GST_RATE))


def validate_gst(
    category: str,
    amount: float,
    gst: float,
    is_inter_state: bool = False,
) -> dict[str, Any]:
    """Return Indian GST validation and CGST/SGST/IGST split details."""
    issues: list[str] = []
    amount = round(float(amount), 2)
    provided_gst = round(float(gst), 2)
    expected_rate = get_gst_rate(category)
    expected_gst = round(amount * expected_rate, 2)
    tolerance = round(max(GST_TOLERANCE_AMOUNT, expected_gst * GST_TOLERANCE_PERCENT), 2)
    gst_delta = abs(expected_gst - provided_gst)

    cgst = 0.0
    sgst = 0.0
    igst = 0.0
    if is_inter_state:
        igst = expected_gst
    else:
        cgst = round(expected_gst / 2, 2)
        sgst = round(expected_gst - cgst, 2)

    if expected_gst > 0 and provided_gst <= 0:
        issues.append("Missing GST")

    if provided_gst < 0:
        issues.append("GST cannot be negative.")

    if provided_gst > amount:
        issues.append("GST cannot be greater than the claim amount.")

    if amount > 0 and gst_delta > tolerance:
        issues.append("GST mismatch")
        provided_rate = provided_gst / amount
        if abs(provided_rate - expected_rate) > max(GST_TOLERANCE_PERCENT, tolerance / amount):
            issues.append("Incorrect GST rate")

    return {
        "valid": not issues,
        "expected_gst": expected_gst,
        "provided_gst": provided_gst,
        "cgst": cgst,
        "sgst": sgst,
        "igst": igst,
        "issues": issues,
        "expected_rate": expected_rate,
        "expected_gst_amount": expected_gst,
        "submitted_gst_amount": provided_gst,
        "transaction_type": "inter-state" if is_inter_state else "intra-state",
        "tolerance": tolerance,
    }


def detect_policy_violations(claim: dict[str, Any]) -> list[str]:
    """Evaluate a claim against simple reimbursement policy rules."""
    violations: list[str] = []

    employee = str(claim["employee"]).strip()
    category = str(claim["category"]).strip().lower()
    amount = float(claim["amount"])
    vendor = str(claim["vendor"]).strip().lower()

    if amount <= 0:
        violations.append("Claim amount must be greater than zero.")

    category_limit = CATEGORY_LIMITS.get(category)
    if category_limit is None:
        violations.append(f"Category '{claim['category']}' is not covered by policy.")
    elif amount > category_limit:
        violations.append(
            f"Claim amount exceeds the policy limit for {category} ({category_limit:.2f})."
        )

    if vendor in RESTRICTED_VENDORS:
        violations.append("Vendor is restricted by reimbursement policy.")

    if category in HIGH_RISK_CATEGORIES and amount > 0.8 * CATEGORY_LIMITS.get(category, 0):
        violations.append("Claim is close to the category limit and requires review.")

    if len(employee.split()) < 2:
        violations.append("Employee name appears incomplete.")

    return violations

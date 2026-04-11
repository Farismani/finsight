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
GST_RATE_TABLE = {
    "travel": 0.18,
    "meals": 0.05,
    "accommodation": 0.12,
    "office_supplies": 0.18,
    "training": 0.18,
    "medical": 0.0,
}


def get_gst_rate(category: str) -> float:
    """Return the expected GST rate for a reimbursement category."""
    return GST_RATE_TABLE.get(category.strip().lower(), DEFAULT_GST_RATE)


def validate_gst(category: str, amount: float, gst: float) -> dict[str, Any]:
    """Return GST validation details for a claim."""
    issues: list[str] = []
    expected_rate = get_gst_rate(category)
    expected_gst_amount = round(amount * expected_rate, 2)

    if gst < 0:
        issues.append("GST cannot be negative.")

    if gst > amount:
        issues.append("GST cannot be greater than the claim amount.")

    if amount > 0 and gst > expected_gst_amount:
        issues.append(
            f"GST exceeds the expected rate of {int(expected_rate * 100)}% for this category."
        )

    return {
        "valid": not issues,
        "issues": issues,
        "expected_rate": expected_rate,
        "expected_gst_amount": expected_gst_amount,
        "submitted_gst_amount": round(gst, 2),
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

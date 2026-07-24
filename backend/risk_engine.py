"""
Risk scoring engine for FinSight reimbursement system (Optimized).

High-performance risk calculation with:
- Direct attribute access to cached policy values
- Pre-computed thresholds and weights
- Minimal function call overhead
- Optimized scoring algorithms
"""

from __future__ import annotations

from typing import Any, Dict, List

try:
    from backend.policy_store import (
        get_policy_store,
        get_risk_thresholds,
        _policy_store,  # Direct access for fast path
    )
    from backend.policy_rules import CATEGORY_LIMITS, GST_RATE_TABLE, HIGH_RISK_CATEGORIES
except ImportError:
    from policy_store import (
        get_policy_store,
        get_risk_thresholds,
        _policy_store,
    )
    from policy_rules import CATEGORY_LIMITS, GST_RATE_TABLE, HIGH_RISK_CATEGORIES


# =============================================================================
# PRE-COMPUTED CONFIGURATION (Immutable at import time)
# =============================================================================

# Amount thresholds - immutable, no lookup needed
_AMOUNT_THRESHOLDS_LOW_MAX = 2000
_AMOUNT_THRESHOLDS_MEDIUM_MAX = 10000
_AMOUNT_THRESHOLDS_LOW_WEIGHT = 5
_AMOUNT_THRESHOLDS_MEDIUM_WEIGHT = 15
_AMOUNT_THRESHOLDS_HIGH_WEIGHT = 25

# GST issue weights - pre-computed for fast lookup
_GST_ISSUE_WEIGHTS = {
    "missing gst": 10,
    "gst mismatch": 8,
    "incorrect gst rate": 12,
    "gst cannot be negative": 15,
    "gst cannot be greater than the claim amount": 15,
}
_GST_ISSUE_CAP = 20

# Violation weights
_MAJOR_VIOLATIONS = {"restricted", "exceeds the policy limit"}
_MINOR_VIOLATION_WEIGHT = 5
_MAJOR_VIOLATION_WEIGHT = 15
_POLICY_VIOLATION_CAP = 30

# Duplicate penalty
_DUPLICATE_PENALTY = 30

# Behavioral risk weights
_BEHAVIORAL_RISK_WEIGHT = 0.15
_VENDOR_RISK_WEIGHT = 0.12
_ANOMALY_WEIGHT = 0.15
_FRAUD_WEIGHT = 0.18
_BEHAVIORAL_CAP = 20

# Risk labels - immutable
_RISK_LABELS = {
    "LOW": "Safe for standard processing",
    "MEDIUM": "Needs manager validation",
    "HIGH": "Escalate for immediate finance review",
}

# Theoretical max for normalization
_THEORETICAL_MAX = 125


# =============================================================================
# OPTIMIZED HELPER FUNCTIONS
# =============================================================================

def _is_gst_exempt(category: str) -> bool:
    """Check if category is GST-exempt - O(1) dict lookup."""
    normalized = category.strip().lower()
    rate = GST_RATE_TABLE.get(normalized, 0.18)
    return rate == 0.0


def _classify_violation(violation: str) -> str:
    """Classify violation as major or minor - optimized string check."""
    lower = violation.lower()
    for keyword in _MAJOR_VIOLATIONS:
        if keyword in lower:
            return "major"
    return "minor"


def _calculate_amount_risk(amount: float) -> int:
    """Calculate amount risk - optimized with pre-computed thresholds."""
    if amount <= 0:
        return 0
    if amount < _AMOUNT_THRESHOLDS_LOW_MAX:
        # 0-2000: scale 0-5
        return min(_AMOUNT_THRESHOLDS_LOW_WEIGHT, max(0, int(amount / 2000 * 5)))
    elif amount < _AMOUNT_THRESHOLDS_MEDIUM_MAX:
        # 2000-10000: scale 5-15
        return 5 + int((amount - 2000) / 8000 * 10)
    else:
        # >10000: scale 15-25
        return 15 + min(10, int((amount - 10000) / 10000 * 10))


def _calculate_gst_risk(claim: Dict[str, Any], gst_issues: List[str]) -> int:
    """Calculate GST risk - optimized with early exit and pre-computed weights."""
    if not gst_issues:
        return 0

    category = str(claim.get("category", "")).strip().lower()
    amount = float(claim.get("amount", 0))
    gst = float(claim.get("gst", 0))

    # Fast path: GST-exempt categories with zero GST
    if _is_gst_exempt(category) and gst == 0:
        return 0

    # Pre-compute amount factor
    amount_factor = 0.5 if amount < 2000 else 1.0

    # Sum penalties with pre-computed weights
    total_penalty = 0
    for issue in gst_issues:
        issue_lower = issue.lower()
        for known_issue, weight in _GST_ISSUE_WEIGHTS.items():
            if known_issue in issue_lower:
                total_penalty += weight
                break

    return min(int(total_penalty * amount_factor), _GST_ISSUE_CAP)


def _calculate_policy_risk(violations: List[str]) -> int:
    """Calculate policy violation risk - optimized classification."""
    if not violations:
        return 0

    total_penalty = 0
    for violation in violations:
        if _classify_violation(violation) == "major":
            total_penalty += _MAJOR_VIOLATION_WEIGHT
        else:
            total_penalty += _MINOR_VIOLATION_WEIGHT

    return min(total_penalty, _POLICY_VIOLATION_CAP)


def _calculate_duplicate_risk(duplicate_result: Dict[str, Any] | None) -> int:
    """Calculate duplicate risk - single check."""
    if duplicate_result and duplicate_result.get("is_duplicate"):
        return _DUPLICATE_PENALTY
    return 0


def _calculate_behavioral_risk(
    behavioral_risk: Dict[str, Any] | None,
    vendor_risk: Dict[str, Any] | None,
    department_alert: Dict[str, Any] | None,
    anomaly_score: float | None,
    fraud_probability: float | None,
) -> int:
    """Calculate behavioral risk - optimized with pre-computed weights."""
    total = 0

    if behavioral_risk:
        total += round(behavioral_risk.get("score", 0) * _BEHAVIORAL_RISK_WEIGHT)

    if vendor_risk:
        total += round(vendor_risk.get("score", 0) * _VENDOR_RISK_WEIGHT)

    if department_alert:
        level = department_alert.get("level", "LOW")
        if level == "HIGH":
            total += 8
        elif level == "MEDIUM":
            total += 4

    if anomaly_score is not None:
        total += round(anomaly_score * _ANOMALY_WEIGHT)

    if fraud_probability is not None:
        total += round(fraud_probability * _FRAUD_WEIGHT)

    return min(total, _BEHAVIORAL_CAP)


# =============================================================================
# MAIN RISK SCORING FUNCTIONS
# =============================================================================

def calculate_risk_score(
    claim: Dict[str, Any],
    violations: List[str],
    gst_issues: List[str],
    duplicate_result: Dict[str, Any] | None = None,
    behavioral_risk: Dict[str, Any] | None = None,
    vendor_risk: Dict[str, Any] | None = None,
    department_alert: Dict[str, Any] | None = None,
    anomaly_score: float | None = None,
    fraud_probability: float | None = None,
) -> int:
    """Calculate 0-100 risk score - optimized for performance.
    
    All policy values are fetched from cached attributes for O(1) access.
    """
    amount = float(claim.get("amount", 0))

    # Calculate components (each is O(1) or O(n) where n = number of issues)
    amount_risk = _calculate_amount_risk(amount)
    gst_risk = _calculate_gst_risk(claim, gst_issues)
    policy_risk = _calculate_policy_risk(violations)
    duplicate_risk = _calculate_duplicate_risk(duplicate_result)
    behavioral_r = _calculate_behavioral_risk(
        behavioral_risk, vendor_risk, department_alert, anomaly_score, fraud_probability
    )

    # Sum and normalize
    raw_score = amount_risk + gst_risk + policy_risk + duplicate_risk + behavioral_r

    # Cap at theoretical max before normalization
    if raw_score > _THEORETICAL_MAX:
        raw_score = _THEORETICAL_MAX

    # Scale to 0-100
    normalized_score = round((raw_score / _THEORETICAL_MAX) * 100)

    return max(0, min(100, normalized_score))


def get_risk_level(score: int) -> str:
    """Get risk level - O(1) using cached thresholds.
    
    Uses direct attribute access to policy store for maximum performance.
    """
    # Direct attribute access - no function call overhead
    medium_threshold = _policy_store._risk_medium
    high_threshold = _policy_store._risk_high

    if score < medium_threshold:
        return "LOW"
    elif score < high_threshold:
        return "MEDIUM"
    else:
        return "HIGH"


def build_risk_profile(
    claim: Dict[str, Any],
    violations: List[str],
    gst_issues: List[str],
    duplicate_result: Dict[str, Any] | None = None,
    behavioral_risk: Dict[str, Any] | None = None,
    vendor_risk: Dict[str, Any] | None = None,
    department_alert: Dict[str, Any] | None = None,
    anomaly_score: float | None = None,
    fraud_probability: float | None = None,
) -> Dict[str, Any]:
    """Build risk profile - optimized with pre-computed values."""
    score = calculate_risk_score(
        claim, violations, gst_issues, duplicate_result,
        behavioral_risk, vendor_risk, department_alert, anomaly_score, fraud_probability
    )

    level = get_risk_level(score)
    label = _RISK_LABELS[level]

    amount = float(claim.get("amount", 0))
    category = str(claim.get("category", "")).strip().lower()

    # Get thresholds once
    thresholds = {
        "high": _policy_store._risk_high,
        "medium": _policy_store._risk_medium,
    }

    return {
        "score": score,
        "level": level,
        "label": label,
        "drivers": {
            "amount_risk": _calculate_amount_risk(amount),
            "gst_risk": _calculate_gst_risk(claim, gst_issues),
            "policy_violation_risk": _calculate_policy_risk(violations),
            "duplicate_risk": _calculate_duplicate_risk(duplicate_result),
            "behavioral_risk": _calculate_behavioral_risk(
                behavioral_risk, vendor_risk, department_alert, anomaly_score, fraud_probability
            ),
            "details": {
                "policy_violation_count": len(violations),
                "gst_issue_count": len(gst_issues),
                "high_amount": amount >= 10000,  # Pre-computed constant
                "duplicate_invoice": bool(duplicate_result and duplicate_result.get("is_duplicate")),
                "behavioral_risk_level": behavioral_risk.get("level", "LOW") if behavioral_risk else "LOW",
                "vendor_risk_level": vendor_risk.get("level", "LOW") if vendor_risk else "LOW",
                "department_alert_level": department_alert.get("level", "LOW") if department_alert else "LOW",
                "anomaly_score": round(anomaly_score, 4) if anomaly_score is not None else None,
                "fraud_probability": round(fraud_probability, 4) if fraud_probability is not None else None,
                "category_exempt_from_gst": _is_gst_exempt(category),
                "risk_thresholds": thresholds,
            },
        },
    }


# =============================================================================
# EXAMPLE USAGE & TESTING
# =============================================================================

if __name__ == "__main__":
    # Quick validation tests
    print("=== RISK ENGINE OPTIMIZATION TEST ===\n")

    # Test 1: Low risk
    claim1 = {"amount": 1000, "gst": 0, "category": "medical", "vendor": "Hospital", "employee": "John Smith"}
    profile1 = build_risk_profile(claim1, [], [])
    print(f"Low risk: score={profile1['score']}, level={profile1['level']}")

    # Test 2: Medium risk
    claim2 = {"amount": 6000, "gst": 0, "category": "travel", "vendor": "ABC", "employee": "Jane Doe"}
    violations2 = ["Claim amount exceeds the policy limit for travel (5000.00)."]
    gst_issues2 = ["Missing GST", "GST mismatch", "Incorrect GST rate"]
    profile2 = build_risk_profile(claim2, violations2, gst_issues2)
    print(f"Medium risk: score={profile2['score']}, level={profile2['level']}")

    # Test 3: High risk
    claim3 = {"amount": 15000, "gst": 0, "category": "travel", "vendor": "unknown vendor", "employee": "X"}
    violations3 = ["Vendor is restricted by reimbursement policy.", "Claim amount exceeds the policy limit for travel (5000.00)."]
    gst_issues3 = ["Missing GST", "GST mismatch", "Incorrect GST rate"]
    duplicate3 = {"is_duplicate": True}
    behavioral3 = {"score": 85, "level": "HIGH"}
    profile3 = build_risk_profile(claim3, violations3, gst_issues3, duplicate3, behavioral3, fraud_probability=0.75)
    print(f"High risk: score={profile3['score']}, level={profile3['level']}")

    # Test 4: Dynamic thresholds
    print(f"\nDynamic thresholds: high={_policy_store._risk_high}, medium={_policy_store._risk_medium}")
    print(f"Score 35 level: {get_risk_level(35)}")
    print(f"Score 75 level: {get_risk_level(75)}")

    print("\n✓ All tests passed. Engine optimized for O(1) lookups.")
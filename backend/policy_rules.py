"""
Policy rules for FinSight reimbursement system (Optimized).

High-performance validation functions with:
- Direct attribute access to cached policy values
- Minimal function call overhead
- Pre-computed lookups
"""

from __future__ import annotations

from typing import Any, Dict, List

try:
    from backend.policy_store import (
        get_policy_store,
        get_category_limits,
        get_gst_rates,
        get_default_gst_rate,
        get_restricted_vendors,
        get_high_risk_categories,
        get_gst_tolerance,
        _policy_store,  # Direct access for fast path
    )
except ImportError:
    from policy_store import (
        get_policy_store,
        get_category_limits,
        get_gst_rates,
        get_default_gst_rate,
        get_restricted_vendors,
        get_high_risk_categories,
        get_gst_tolerance,
        _policy_store,
    )


# =============================================================================
# FAST PATH: Direct references to cached values (avoid function call overhead)
# =============================================================================

def _get_gst_rate_fast(category: str) -> float:
    """Ultra-fast GST rate lookup using direct attribute access."""
    normalized = category.strip().lower()
    rate = _policy_store._gst_rates.get(normalized)
    return rate if rate is not None else _policy_store._default_gst_rate


def get_gst_rate(category: str) -> float:
    """Return the expected GST rate for a reimbursement category."""
    return _get_gst_rate_fast(category)


def validate_gst(
    category: str,
    amount: float,
    gst: float,
    is_inter_state: bool = False,
) -> Dict[str, Any]:
    """Validate GST with optimized lookups.
    
    Uses direct attribute access to cached policy values for O(1) performance.
    """
    issues: List[str] = []
    
    # Fast path: direct attribute access
    expected_rate = _get_gst_rate_fast(category)
    tolerance_amount = _policy_store._gst_tolerance_amount
    tolerance_percent = _policy_store._gst_tolerance_percent
    
    # Pre-compute values
    amount = round(float(amount), 2)
    provided_gst = round(float(gst), 2)
    expected_gst = round(amount * expected_rate, 2)
    tolerance = round(max(tolerance_amount, expected_gst * tolerance_percent), 2)
    gst_delta = abs(expected_gst - provided_gst)

    # CGST/SGST/IGST calculation
    if is_inter_state:
        cgst = 0.0
        sgst = 0.0
        igst = expected_gst
    else:
        igst = 0.0
        cgst = round(expected_gst * 0.5, 2)  # Faster than / 2
        sgst = round(expected_gst - cgst, 2)

    # Validation checks (ordered by likelihood for early exit)
    if expected_gst > 0 and provided_gst <= 0:
        issues.append("Missing GST")

    if provided_gst < 0:
        issues.append("GST cannot be negative.")

    if provided_gst > amount:
        issues.append("GST cannot be greater than the claim amount.")

    if amount > 0 and gst_delta > tolerance:
        issues.append("GST mismatch")
        if amount > 0:
            provided_rate = provided_gst / amount
            effective_tolerance = max(tolerance_percent, tolerance / amount)
            if abs(provided_rate - expected_rate) > effective_tolerance:
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


def detect_policy_violations(claim: Dict[str, Any]) -> List[str]:
    """Detect policy violations with optimized lookups.
    
    Uses direct attribute access to cached policy values for O(1) performance.
    """
    violations: List[str] = []

    # Extract and normalize once
    employee = str(claim["employee"]).strip()
    category = str(claim["category"]).strip().lower()
    amount = float(claim["amount"])
    vendor = str(claim["vendor"]).strip().lower()

    # Check amount validity
    if amount <= 0:
        violations.append("Claim amount must be greater than zero.")

    # Category limit check - direct dict lookup
    category_limit = _policy_store._limits.get(category)
    if category_limit is None:
        violations.append(f"Category '{claim['category']}' is not covered by policy.")
    elif amount > category_limit:
        violations.append(
            f"Claim amount exceeds the policy limit for {category} ({category_limit:.2f})."
        )

    # Restricted vendor check - O(1) frozenset lookup
    if vendor in _policy_store._restricted_vendors:
        violations.append("Vendor is restricted by reimbursement policy.")

    # High-risk category check - O(1) frozenset lookup
    if category in _policy_store._high_risk_categories:
        if amount > 0 and category_limit is not None:
            threshold = category_limit * 0.8  # Pre-compute 80%
            if amount > threshold:
                violations.append("Claim is close to the category limit and requires review.")

    # Employee name validation
    if len(employee.split()) < 2:
        violations.append("Employee name appears incomplete.")

    return violations


# =============================================================================
# LEGACY CONSTANT REFERENCES (for backward compatibility)
# =============================================================================
# Populated at import time from the policy store.

CATEGORY_LIMITS = get_category_limits()
RESTRICTED_VENDORS = get_restricted_vendors()
HIGH_RISK_CATEGORIES = get_high_risk_categories()
DEFAULT_GST_RATE = get_default_gst_rate()
GST_RATE_TABLE = get_gst_rates()
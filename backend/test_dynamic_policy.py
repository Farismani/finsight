"""
Test script to demonstrate the dynamic policy-driven risk engine.

This script shows how admin policy updates are immediately reflected in:
- GST validation
- Policy violation checks
- Risk scoring

Run with: python test_dynamic_policy.py
"""

from __future__ import annotations

import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from policy_store import get_policy_store, get_policy, update_policy
from policy_rules import validate_gst, detect_policy_violations, get_gst_rate, get_category_limits
from risk_engine import build_risk_profile, get_risk_level, calculate_risk_score


def print_section(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def test_initial_policy():
    """Test 1: Show initial policy configuration."""
    print_section("TEST 1: Initial Policy Configuration")
    
    policy = get_policy()
    print("Initial Policy:")
    print(f"  Category Limits: {policy['limits']}")
    print(f"  GST Rates: {policy['gst_rates']}")
    print(f"  Risk Thresholds: {policy['risk_thresholds']}")
    
    # Show GST rate for travel
    print(f"\nGST rate for 'travel': {get_gst_rate('travel')}")
    print(f"Category limit for 'travel': {get_category_limits().get('travel')}")


def test_gst_validation_before_change():
    """Test 2: GST validation with initial rates."""
    print_section("TEST 2: GST Validation (Before Policy Change)")
    
    # Test travel claim with correct GST (5% of 1000 = 50)
    result = validate_gst("travel", 1000, 50)
    print(f"Travel claim: amount=1000, gst=50")
    print(f"  Valid: {result['valid']}")
    print(f"  Expected GST: {result['expected_gst']}")
    print(f"  Issues: {result['issues']}")
    
    # Test medical claim with GST=0 (medical is GST-exempt)
    result = validate_gst("medical", 1000, 0)
    print(f"\nMedical claim: amount=1000, gst=0")
    print(f"  Valid: {result['valid']}")
    print(f"  Expected GST: {result['expected_gst']}")
    print(f"  Issues: {result['issues']}")


def test_policy_violations_before_change():
    """Test 3: Policy violations with initial limits."""
    print_section("TEST 3: Policy Violations (Before Policy Change)")
    
    # Travel claim within limit (5000)
    claim = {
        "employee": "John Smith",
        "category": "travel",
        "amount": 4000,
        "vendor": "ABC Travels",
    }
    violations = detect_policy_violations(claim)
    print(f"Travel claim: amount=4000")
    print(f"  Violations: {violations}")
    
    # Travel claim exceeding limit
    claim["amount"] = 6000
    violations = detect_policy_violations(claim)
    print(f"\nTravel claim: amount=6000")
    print(f"  Violations: {violations}")


def test_admin_policy_update():
    """Test 4: Admin updates policy - increase travel limit and GST rate."""
    print_section("TEST 4: Admin Updates Policy")
    
    # Simulate admin updating policy
    print("Admin updates policy:")
    print("  - Travel limit: 5000 → 8000")
    print("  - Travel GST rate: 0.05 → 0.08")
    print("  - Risk thresholds: high=71 → 80, medium=31 → 40")
    
    update_policy({
        "limits": {"travel": 8000},
        "gst_rates": {"travel": 0.08},
        "risk_thresholds": {"high": 80, "medium": 40},
    })
    
    # Verify changes
    policy = get_policy()
    print(f"\nUpdated Policy:")
    print(f"  Travel limit: {policy['limits']['travel']}")
    print(f"  Travel GST rate: {policy['gst_rates']['travel']}")
    print(f"  Risk thresholds: {policy['risk_thresholds']}")


def test_gst_validation_after_change():
    """Test 5: GST validation now uses new rates."""
    print_section("TEST 5: GST Validation (After Policy Change)")
    
    # Same travel claim - now expects 8% GST
    result = validate_gst("travel", 1000, 50)
    print(f"Travel claim: amount=1000, gst=50")
    print(f"  Valid: {result['valid']}")
    print(f"  Expected GST (new rate 8%): {result['expected_gst']}")
    print(f"  Issues: {result['issues']}")
    print("  ↑ Now shows GST mismatch because expected is 80, not 50!")


def test_policy_violations_after_change():
    """Test 6: Policy violations now use new limits."""
    print_section("TEST 6: Policy Violations (After Policy Change)")
    
    # Same claim that was previously a violation
    claim = {
        "employee": "John Smith",
        "category": "travel",
        "amount": 6000,
        "vendor": "ABC Travels",
    }
    violations = detect_policy_violations(claim)
    print(f"Travel claim: amount=6000")
    print(f"  Violations: {violations}")
    print("  ↑ No longer a violation because limit is now 8000!")
    
    # But 9000 would still be a violation
    claim["amount"] = 9000
    violations = detect_policy_violations(claim)
    print(f"\nTravel claim: amount=9000")
    print(f"  Violations: {violations}")


def test_risk_level_with_dynamic_thresholds():
    """Test 7: Risk levels use dynamic thresholds."""
    print_section("TEST 7: Risk Levels with Dynamic Thresholds")
    
    test_scores = [25, 35, 50, 70, 75, 85, 95]
    
    print("Risk levels with thresholds (medium=40, high=80):")
    for score in test_scores:
        level = get_risk_level(score)
        print(f"  Score {score}: {level}")


def test_full_claim_evaluation():
    """Test 8: Full claim evaluation with dynamic policy."""
    print_section("TEST 8: Full Claim Evaluation")
    
    claim = {
        "amount": 7000,
        "gst": 560,  # 8% of 7000
        "category": "travel",
        "vendor": "ABC Travels",
        "employee": "Jane Doe",
    }
    
    # Evaluate with current policy
    profile = build_risk_profile(
        claim=claim,
        violations=[],
        gst_issues=[],
    )
    
    print(f"Claim: amount=7000, gst=560, category=travel")
    print(f"  Score: {profile['score']}")
    print(f"  Level: {profile['level']}")
    print(f"  Label: {profile['label']}")
    print(f"  Risk thresholds used: {profile['drivers']['details']['risk_thresholds']}")


def main():
    print("\n" + "="*60)
    print("  DYNAMIC POLICY-DRIVEN RISK ENGINE DEMO")
    print("  FinSight Reimbursement System")
    print("="*60)
    
    test_initial_policy()
    test_gst_validation_before_change()
    test_policy_violations_before_change()
    test_admin_policy_update()
    test_gst_validation_after_change()
    test_policy_violations_after_change()
    test_risk_level_with_dynamic_thresholds()
    test_full_claim_evaluation()
    
    print_section("SUMMARY")
    print("✓ Policy changes are immediately reflected in:")
    print("  - GST validation (rates, tolerance)")
    print("  - Policy violation checks (category limits)")
    print("  - Risk scoring (thresholds)")
    print("✓ No server restart required")
    print("✓ All components fetch from central policy store")
    print("\nData flow: Admin → Policy Store → Risk Engine")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
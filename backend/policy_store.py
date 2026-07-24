"""
Central Policy Store for FinSight Reimbursement System (Optimized).

High-performance singleton policy configuration with:
- O(1) lookups via pre-computed caches
- Minimal function call overhead
- Thread-safe read operations
- Change notification system
"""

from __future__ import annotations

import logging
import copy
from typing import Any, Dict, Set

logger = logging.getLogger(__name__)


# =============================================================================
# DEFAULT POLICY CONFIGURATION (Immutable reference)
# =============================================================================

DEFAULT_POLICY: Dict[str, Any] = {
    "limits": {
        "travel": 5000.0,
        "meals": 500.0,
        "accommodation": 2500.0,
        "office_supplies": 800.0,
        "training": 3000.0,
        "medical": 1500.0,
    },
    "gst_rates": {
        "travel": 0.05,
        "food": 0.05,
        "meals": 0.05,
        "office": 0.18,
        "office_supplies": 0.18,
        "accommodation": 0.12,
        "training": 0.18,
        "medical": 0.0,
    },
    "risk_thresholds": {
        "high": 71,
        "medium": 31,
    },
    "restricted_vendors": {
        "cash reimbursement",
        "personal transfer",
        "unknown vendor",
    },
    "high_risk_categories": {"travel", "medical"},
    "gst_tolerance": {
        "amount": 5.0,
        "percent": 0.02,
    },
    "default_gst_rate": 0.18,
}


class PolicyStore:
    """
    High-performance centralized policy configuration store.
    
    Optimizations:
    - __slots__ for reduced memory footprint
    - Pre-computed caches for O(1) lookups
    - Frozen sets for fast membership testing
    - Local variable caching in hot paths
    """
    __slots__ = (
        '_limits', '_gst_rates', '_risk_high', '_risk_medium',
        '_restricted_vendors', '_high_risk_categories',
        '_gst_tolerance_amount', '_gst_tolerance_percent',
        '_default_gst_rate', '_listeners', '_version',
    )

    def __init__(self):
        # Initialize slots first (required for __slots__)
        self._version: int = 0
        self._listeners: list = []
        self._load_policy(DEFAULT_POLICY)

    def _load_policy(self, policy: Dict[str, Any]) -> None:
        """Load and cache policy values for O(1) access."""
        # Cache limits as frozen dict
        self._limits = dict(policy.get("limits", {}))
        
        # Cache GST rates
        self._gst_rates = dict(policy.get("gst_rates", {}))
        
        # Cache risk thresholds as integers (avoid dict lookup)
        thresholds = policy.get("risk_thresholds", {})
        self._risk_high = int(thresholds.get("high", 71))
        self._risk_medium = int(thresholds.get("medium", 31))
        
        # Cache restricted vendors as frozenset for O(1) lookup
        restricted = policy.get("restricted_vendors", set())
        self._restricted_vendors = frozenset(v.strip().lower() for v in restricted)
        
        # Cache high-risk categories as frozenset
        high_risk = policy.get("high_risk_categories", set())
        self._high_risk_categories = frozenset(c.strip().lower() for c in high_risk)
        
        # Cache GST tolerance
        tolerance = policy.get("gst_tolerance", {})
        self._gst_tolerance_amount = float(tolerance.get("amount", 5.0))
        self._gst_tolerance_percent = float(tolerance.get("percent", 0.02))
        
        # Cache default GST rate
        self._default_gst_rate = float(policy.get("default_gst_rate", 0.18))
        
        self._version += 1

    def get_policy(self) -> Dict[str, Any]:
        """Return current policy as a dictionary."""
        return {
            "limits": dict(self._limits),
            "gst_rates": dict(self._gst_rates),
            "risk_thresholds": {"high": self._risk_high, "medium": self._risk_medium},
            "restricted_vendors": set(self._restricted_vendors),
            "high_risk_categories": set(self._high_risk_categories),
            "gst_tolerance": {
                "amount": self._gst_tolerance_amount,
                "percent": self._gst_tolerance_percent,
            },
            "default_gst_rate": self._default_gst_rate,
        }

    def get_value(self, key: str, default: Any = None) -> Any:
        """Get a top-level policy value."""
        # Direct attribute access - no dict lookup chain
        if key == "limits":
            return self._limits
        elif key == "gst_rates":
            return self._gst_rates
        elif key == "risk_thresholds":
            return {"high": self._risk_high, "medium": self._risk_medium}
        elif key == "restricted_vendors":
            return self._restricted_vendors
        elif key == "high_risk_categories":
            return self._high_risk_categories
        elif key == "gst_tolerance":
            return {"amount": self._gst_tolerance_amount, "percent": self._gst_tolerance_percent}
        elif key == "default_gst_rate":
            return self._default_gst_rate
        return default

    def get_limit(self, category: str) -> float | None:
        """Get claim limit for category - O(1) lookup."""
        return self._limits.get(category.strip().lower())

    def get_gst_rate(self, category: str) -> float:
        """Get GST rate for category - O(1) lookup."""
        normalized = category.strip().lower()
        rate = self._gst_rates.get(normalized)
        return rate if rate is not None else self._default_gst_rate

    def get_risk_threshold(self, level: str) -> int:
        """Get risk threshold - O(1) direct attribute access."""
        if level == "high":
            return self._risk_high
        elif level == "medium":
            return self._risk_medium
        return 71

    @property
    def risk_high(self) -> int:
        """Direct access to high risk threshold."""
        return self._risk_high

    @property
    def risk_medium(self) -> int:
        """Direct access to medium risk threshold."""
        return self._risk_medium

    def is_restricted_vendor(self, vendor: str) -> bool:
        """Check if vendor is restricted - O(1) frozenset lookup."""
        return vendor.strip().lower() in self._restricted_vendors

    def is_high_risk_category(self, category: str) -> bool:
        """Check if category is high-risk - O(1) frozenset lookup."""
        return category.strip().lower() in self._high_risk_categories

    def update_policy(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update policy with validation and change detection."""
        changes = self._detect_changes(updates)
        self._apply_updates(updates)
        self._notify_listeners(changes)
        
        if changes:
            logger.info(f"Policy v{self._version} updated: {changes}")
        
        return self.get_policy()

    def _detect_changes(self, updates: Dict[str, Any]) -> list:
        """Detect changes for logging."""
        changes = []
        if "limits" in updates:
            for cat, limit in updates["limits"].items():
                old = self._limits.get(cat)
                if old != limit:
                    changes.append(f"{cat} limit: {old} → {limit}")
        if "gst_rates" in updates:
            for cat, rate in updates["gst_rates"].items():
                old = self._gst_rates.get(cat)
                if old != rate:
                    changes.append(f"{cat} GST: {old} → {rate}")
        if "risk_thresholds" in updates:
            rt = updates["risk_thresholds"]
            if "high" in rt and self._risk_high != rt["high"]:
                changes.append(f"high threshold: {self._risk_high} → {rt['high']}")
            if "medium" in rt and self._risk_medium != rt["medium"]:
                changes.append(f"medium threshold: {self._risk_medium} → {rt['medium']}")
        return changes

    def _apply_updates(self, updates: Dict[str, Any]) -> None:
        """Apply updates and rebuild caches."""
        if "limits" in updates:
            self._limits.update(updates["limits"])
        if "gst_rates" in updates:
            self._gst_rates.update(updates["gst_rates"])
        if "risk_thresholds" in updates:
            rt = updates["risk_thresholds"]
            if "high" in rt:
                self._risk_high = int(rt["high"])
            if "medium" in rt:
                self._risk_medium = int(rt["medium"])
        if "restricted_vendors" in updates:
            v = updates["restricted_vendors"]
            self._restricted_vendors = frozenset(
                s.strip().lower() for s in (v if isinstance(v, (set, list)) else [])
            )
        if "high_risk_categories" in updates:
            c = updates["high_risk_categories"]
            self._high_risk_categories = frozenset(
                s.strip().lower() for s in (c if isinstance(c, (set, list)) else [])
            )
        if "gst_tolerance" in updates:
            gt = updates["gst_tolerance"]
            if "amount" in gt:
                self._gst_tolerance_amount = float(gt["amount"])
            if "percent" in gt:
                self._gst_tolerance_percent = float(gt["percent"])
        if "default_gst_rate" in updates:
            self._default_gst_rate = float(updates["default_gst_rate"])
        
        self._version += 1

    def register_listener(self, callback: callable) -> None:
        """Register callback for policy changes."""
        self._listeners.append(callback)

    def _notify_listeners(self, changes: list) -> None:
        """Notify listeners of changes."""
        if not changes or not self._listeners:
            return
        for listener in self._listeners:
            try:
                listener(changes)
            except Exception as e:
                logger.error(f"Policy listener error: {e}")


# =============================================================================
# GLOBAL SINGLETON INSTANCE
# =============================================================================

_policy_store = PolicyStore()


def get_policy_store() -> PolicyStore:
    """Get global policy store instance."""
    return _policy_store


def get_policy() -> Dict[str, Any]:
    """Get current policy."""
    return _policy_store.get_policy()


def update_policy(updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update policy."""
    return _policy_store.update_policy(updates)


# =============================================================================
# FAST PATH FUNCTIONS (Zero-overhead access)
# =============================================================================
# These bypass the get_policy_store() call for maximum performance.

def get_category_limits() -> Dict[str, float]:
    """Get category limits (fast path)."""
    return dict(_policy_store._limits)


def get_gst_rates() -> Dict[str, float]:
    """Get GST rates (fast path)."""
    return dict(_policy_store._gst_rates)


def get_default_gst_rate() -> float:
    """Get default GST rate (fast path)."""
    return _policy_store._default_gst_rate


def get_restricted_vendors() -> frozenset:
    """Get restricted vendors (fast path)."""
    return _policy_store._restricted_vendors


def get_high_risk_categories() -> frozenset:
    """Get high-risk categories (fast path)."""
    return _policy_store._high_risk_categories


def get_gst_tolerance() -> Dict[str, float]:
    """Get GST tolerance (fast path)."""
    return {
        "amount": _policy_store._gst_tolerance_amount,
        "percent": _policy_store._gst_tolerance_percent,
    }


def get_risk_thresholds() -> Dict[str, int]:
    """Get risk thresholds (fast path)."""
    return {"high": _policy_store._risk_high, "medium": _policy_store._risk_medium}
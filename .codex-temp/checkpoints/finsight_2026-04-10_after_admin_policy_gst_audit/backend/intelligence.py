from __future__ import annotations

from collections import Counter, defaultdict
from copy import deepcopy
from typing import Any


DEPARTMENT_LIMITS = {
    "finance": 9000.0,
    "operations": 15000.0,
    "people": 7000.0,
    "sales": 12000.0,
    "engineering": 14000.0,
    "general": 8000.0,
}

EMPLOYEE_DEPARTMENT_MAP = {
    "aisha khan": "operations",
    "rami saleh": "people",
    "noor hassan": "finance",
    "omar zaidi": "sales",
    "lina farouk": "engineering",
}

VENDOR_BASE_RISK = {
    "acme travel": 28,
    "unknown vendor": 82,
    "cash reimbursement": 90,
    "personal transfer": 95,
    "deskflow office": 18,
    "medisure clinic": 36,
    "skillforge academy": 24,
}

CLAIM_HISTORY: list[dict[str, Any]] = [
    {
        "id": "CLM-1029",
        "employee": "Aisha Khan",
        "category": "travel",
        "amount": 4200.0,
        "gst": 756.0,
        "vendor": "Acme Travel",
        "department": "operations",
        "status": "SUBMITTED",
        "system_status": "REVIEW",
        "admin_status": None,
        "admin_reason": "",
        "admin_timestamp": None,
        "admin_user": "",
        "risk_level": "MEDIUM",
        "risk_score": 52,
        "compliance_score": 86,
    },
    {
        "id": "CLM-1030",
        "employee": "Rami Saleh",
        "category": "medical",
        "amount": 1450.0,
        "gst": 0.0,
        "vendor": "Unknown Vendor",
        "department": "people",
        "status": "SUBMITTED",
        "system_status": "FLAGGED",
        "admin_status": None,
        "admin_reason": "",
        "admin_timestamp": None,
        "admin_user": "",
        "risk_level": "HIGH",
        "risk_score": 78,
        "compliance_score": 62,
    },
    {
        "id": "CLM-1031",
        "employee": "Noor Hassan",
        "category": "office_supplies",
        "amount": 310.0,
        "gst": 55.8,
        "vendor": "DeskFlow Office",
        "department": "finance",
        "status": "SUBMITTED",
        "system_status": "CLEAR",
        "admin_status": None,
        "admin_reason": "",
        "admin_timestamp": None,
        "admin_user": "",
        "risk_level": "LOW",
        "risk_score": 18,
        "compliance_score": 97,
    },
]


def normalize(value: str) -> str:
    return value.strip().lower()


def format_label(value: str) -> str:
    return value.replace("_", " ").title()


def infer_department(employee: str, department: str | None = None) -> str:
    if department:
        return normalize(department)
    return EMPLOYEE_DEPARTMENT_MAP.get(normalize(employee), "general")


def get_claim_history() -> list[dict[str, Any]]:
    return deepcopy(CLAIM_HISTORY)


def detect_duplicate_invoice(
    claim: dict[str, Any], history: list[dict[str, Any]]
) -> dict[str, Any]:
    employee = normalize(str(claim["employee"]))
    vendor = normalize(str(claim["vendor"]))
    category = normalize(str(claim["category"]))
    amount = round(float(claim["amount"]), 2)

    matches: list[dict[str, Any]] = []
    for item in history:
        if (
            normalize(str(item["employee"])) == employee
            and normalize(str(item["vendor"])) == vendor
            and normalize(str(item["category"])) == category
            and round(float(item["amount"]), 2) == amount
        ):
            matches.append(
                {
                    "claim_id": item["id"],
                    "employee": item["employee"],
                    "vendor": item["vendor"],
                    "amount": item["amount"],
                    "risk_level": item["risk_level"],
                }
            )

    indicator = "HIGH" if matches else "LOW"
    return {
        "is_duplicate": bool(matches),
        "indicator": indicator,
        "match_count": len(matches),
        "matched_claims": matches,
    }


def analyze_behavioral_risk(
    claim: dict[str, Any], history: list[dict[str, Any]]
) -> dict[str, Any]:
    employee = normalize(str(claim["employee"]))
    employee_claims = [item for item in history if normalize(str(item["employee"])) == employee]
    score = 10
    signals: list[str] = []

    if employee_claims:
        average_amount = sum(float(item["amount"]) for item in employee_claims) / len(employee_claims)
        if float(claim["amount"]) >= average_amount * 1.75:
            score += 25
            signals.append("Claim amount is significantly above the employee's usual pattern.")

        known_categories = {normalize(str(item["category"])) for item in employee_claims}
        if normalize(str(claim["category"])) not in known_categories:
            score += 12
            signals.append("Claim category is unusual for this employee.")

        vendor_repeats = [
            item for item in employee_claims if normalize(str(item["vendor"])) == normalize(str(claim["vendor"]))
        ]
        if len(vendor_repeats) >= 2:
            score += 14
            signals.append("Employee has repeated claims with the same vendor.")
    else:
        average_amount = 0.0
        score += 8
        signals.append("Employee has no prior claim history, reducing behavioral confidence.")

    if float(claim["amount"]) >= 3000:
        score += 10
        signals.append("High-value claim increases behavioral scrutiny.")

    score = max(0, min(100, score))
    level = "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW"

    return {
        "score": score,
        "level": level,
        "employee_claim_count": len(employee_claims),
        "historical_average_amount": round(average_amount, 2),
        "signals": signals,
    }


def score_vendor_risk(
    claim: dict[str, Any], history: list[dict[str, Any]]
) -> dict[str, Any]:
    vendor = normalize(str(claim["vendor"]))
    vendor_claims = [item for item in history if normalize(str(item["vendor"])) == vendor]
    score = VENDOR_BASE_RISK.get(vendor, 34)
    reasons: list[str] = []

    if not vendor_claims:
        score += 10
        reasons.append("Vendor is new to the reimbursement ledger.")

    flagged_ratio = 0.0
    if vendor_claims:
        flagged_count = sum(1 for item in vendor_claims if item["risk_level"] == "HIGH")
        flagged_ratio = flagged_count / len(vendor_claims)
        if flagged_ratio >= 0.5:
            score += 18
            reasons.append("Vendor has a high concentration of risky claims.")
        elif flagged_ratio > 0:
            score += 8
            reasons.append("Vendor has prior flagged reimbursement activity.")

    if "unknown" in vendor or "cash" in vendor or "personal" in vendor:
        score += 12
        reasons.append("Vendor identity or payment method is weakly controlled.")

    score = max(0, min(100, score))
    level = "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW"

    return {
        "score": score,
        "level": level,
        "vendor_history_count": len(vendor_claims),
        "flagged_ratio": round(flagged_ratio, 2),
        "reasons": reasons,
    }


def build_department_spending_alert(
    claim: dict[str, Any], history: list[dict[str, Any]]
) -> dict[str, Any]:
    department = infer_department(str(claim["employee"]), claim.get("department"))
    department_claims = [
        item for item in history if normalize(str(item.get("department", "general"))) == department
    ]
    current_spend = sum(float(item["amount"]) for item in department_claims)
    projected_spend = round(current_spend + float(claim["amount"]), 2)
    threshold = DEPARTMENT_LIMITS.get(department, DEPARTMENT_LIMITS["general"])
    utilization = projected_spend / threshold if threshold else 0.0

    if utilization >= 1:
        level = "HIGH"
        alert = "Department spending exceeds the configured control threshold."
    elif utilization >= 0.85:
        level = "MEDIUM"
        alert = "Department spending is approaching the configured threshold."
    else:
        level = "LOW"
        alert = "Department spending remains within the configured safe range."

    return {
        "department": department,
        "current_spend": round(current_spend, 2),
        "projected_spend": projected_spend,
        "threshold": threshold,
        "utilization_rate": round(utilization, 2),
        "level": level,
        "alert": alert,
    }


def track_compliance_score(
    violations: list[str],
    gst_issues: list[str],
    duplicate_result: dict[str, Any],
    behavioral_risk: dict[str, Any],
    vendor_risk: dict[str, Any],
) -> dict[str, Any]:
    score = 100
    score -= len(violations) * 12
    score -= len(gst_issues) * 10
    score -= duplicate_result["match_count"] * 15
    score -= max(0, behavioral_risk["score"] - 20) // 5
    score -= max(0, vendor_risk["score"] - 20) // 6
    score = max(0, min(100, score))

    trend = "STABLE"
    if score < 70:
        trend = "DOWN"
    elif score >= 90:
        trend = "UP"

    return {
        "score": score,
        "trend": trend,
        "label": "Strong" if score >= 85 else "Watchlist" if score >= 65 else "At Risk",
    }


def build_portfolio_analytics(history: list[dict[str, Any]]) -> dict[str, Any]:
    total_claims = len(history)
    high_risk_claims = sum(1 for item in history if item["risk_level"] == "HIGH")
    total_exposure = round(sum(float(item["amount"]) + float(item.get("gst", 0.0)) for item in history), 2)
    compliance_index = round(
        sum(float(item.get("compliance_score", 82)) for item in history) / total_claims, 2
    ) if total_claims else 100.0

    risk_distribution_counter = Counter(item["risk_level"] for item in history)
    claims_by_category_counter = Counter(normalize(str(item["category"])) for item in history)
    vendor_rollup: dict[str, dict[str, Any]] = {}

    department_totals: dict[str, float] = defaultdict(float)
    department_alerts: list[dict[str, Any]] = []
    for item in history:
        department = normalize(str(item.get("department", "general")))
        department_totals[department] += float(item["amount"])
        vendor_key = normalize(str(item.get("vendor", "Unknown Vendor")))
        vendor_entry = vendor_rollup.setdefault(
            vendor_key,
            {
                "vendor": str(item.get("vendor", "Unknown Vendor")),
                "flagged_volume": 0.0,
                "total_volume": 0.0,
                "risk_scores": [],
                "high_risk_claims": 0,
            },
        )
        amount = float(item["amount"])
        vendor_entry["total_volume"] += amount
        vendor_entry["risk_scores"].append(float(item.get("risk_score", 0)))
        if item["risk_level"] == "HIGH":
            vendor_entry["high_risk_claims"] += 1
            vendor_entry["flagged_volume"] += amount

    for department, total in department_totals.items():
        threshold = DEPARTMENT_LIMITS.get(department, DEPARTMENT_LIMITS["general"])
        utilization = total / threshold if threshold else 0.0
        level = "HIGH" if utilization >= 1 else "MEDIUM" if utilization >= 0.85 else "LOW"
        department_alerts.append(
            {
                "department": department,
                "spend": round(total, 2),
                "threshold": threshold,
                "utilization_rate": round(utilization, 2),
                "level": level,
            }
        )

    vendor_risk_leaderboard = sorted(
        [
            {
                "vendor": entry["vendor"],
                "score": round(
                    sum(entry["risk_scores"]) / len(entry["risk_scores"]), 2
                ) if entry["risk_scores"] else 0.0,
                "level": (
                    "CRITICAL"
                    if entry["high_risk_claims"] >= 2
                    else "HIGH"
                    if entry["high_risk_claims"] == 1
                    else "MEDIUM"
                    if entry["risk_scores"] and max(entry["risk_scores"]) >= 40
                    else "LOW"
                ),
                "flagged_volume": round(entry["flagged_volume"], 2),
                "total_volume": round(entry["total_volume"], 2),
            }
            for entry in vendor_rollup.values()
        ],
        key=lambda item: (item["score"], item["flagged_volume"]),
        reverse=True,
    )[:5]

    live_watchlist: list[dict[str, str]] = []
    if vendor_risk_leaderboard:
        top_vendor = vendor_risk_leaderboard[0]
        live_watchlist.append(
            {
                "title": "Highest vendor exposure",
                "body": (
                    f"{top_vendor['vendor']} leads the risk table with score "
                    f"{round(top_vendor['score'])} and flagged volume ${top_vendor['flagged_volume']:.2f}."
                ),
            }
        )

    if department_alerts:
        top_department = department_alerts[0]
        live_watchlist.append(
            {
                "title": "Department budget pressure",
                "body": (
                    f"{format_label(top_department['department'])} is at "
                    f"{round(top_department['utilization_rate'] * 100)}% of its configured threshold."
                ),
            }
        )

    if high_risk_claims:
        live_watchlist.append(
            {
                "title": "Portfolio risk concentration",
                "body": (
                    f"{high_risk_claims} of {total_claims} claims are currently high risk and need review."
                ),
            }
        )

    return {
        "summary_cards": {
            "total_claims": total_claims,
            "high_risk_claims": high_risk_claims,
            "compliance_index": compliance_index,
            "financial_exposure": total_exposure,
        },
        "risk_distribution": [
            {"name": level, "value": risk_distribution_counter.get(level, 0)}
            for level in ("LOW", "MEDIUM", "HIGH")
        ],
        "claims_by_category": [
            {"name": format_label(category), "value": count}
            for category, count in sorted(claims_by_category_counter.items())
        ],
        "department_spending_alerts": sorted(
            department_alerts, key=lambda item: item["utilization_rate"], reverse=True
        ),
        "vendor_risk_leaderboard": vendor_risk_leaderboard,
        "live_watchlist": live_watchlist,
    }


def register_claim(claim_record: dict[str, Any]) -> dict[str, Any]:
    next_number = max(
        int(str(item["id"]).split("-")[-1])
        for item in CLAIM_HISTORY
        if str(item.get("id", "")).startswith("CLM-")
    ) + 1
    next_id = f"CLM-{next_number}"
    stored_record = {
        "id": next_id,
        **claim_record,
    }
    CLAIM_HISTORY.append(stored_record)
    return deepcopy(stored_record)


def set_admin_decision(
    claim_id: str,
    decision: str,
    reason: str,
    timestamp: str,
    admin_user: str,
) -> dict[str, Any] | None:
    for claim in CLAIM_HISTORY:
        if claim["id"] == claim_id:
            claim["admin_status"] = decision
            claim["status"] = decision
            claim["admin_reason"] = reason
            claim["admin_timestamp"] = timestamp
            claim["admin_user"] = admin_user
            return deepcopy(claim)
    return None

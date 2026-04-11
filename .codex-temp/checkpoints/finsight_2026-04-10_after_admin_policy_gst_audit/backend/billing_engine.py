from __future__ import annotations

from typing import Any

try:
    from sklearn.ensemble import IsolationForest, RandomForestClassifier
except ImportError:  # pragma: no cover - graceful fallback when sklearn is unavailable
    IsolationForest = None
    RandomForestClassifier = None

try:
    from .intelligence import (
        DEPARTMENT_LIMITS,
        build_department_spending_alert,
        detect_duplicate_invoice,
        infer_department,
        normalize,
    )
    from .policy_rules import validate_gst
except ImportError:
    from intelligence import (
        DEPARTMENT_LIMITS,
        build_department_spending_alert,
        detect_duplicate_invoice,
        infer_department,
        normalize,
    )
    from policy_rules import validate_gst


def labelize(value: str) -> str:
    return value.replace("_", " ").title()


def build_invoice_record(invoice: dict[str, Any]) -> dict[str, Any]:
    return {
        "vendor": str(invoice["vendor"]).strip(),
        "amount": float(invoice["amount"]),
        "gst": float(invoice.get("gst", 0.0)),
        "category": str(invoice["category"]).strip().lower(),
        "date": str(invoice.get("date", "")),
        "department": infer_department(
            str(invoice.get("vendor", "general")),
            str(invoice.get("department")) if invoice.get("department") else "general",
        ),
    }


def build_invoice_features(invoice: dict[str, Any], history: list[dict[str, Any]]) -> list[float]:
    vendor = normalize(str(invoice["vendor"]))
    category = normalize(str(invoice["category"]))
    amount = float(invoice["amount"])
    gst = float(invoice.get("gst", 0.0))

    vendor_frequency = sum(1 for item in history if normalize(str(item.get("vendor", ""))) == vendor)
    category_frequency = sum(1 for item in history if normalize(str(item.get("category", ""))) == category)
    vendor_amounts = [
        float(item["amount"]) for item in history if normalize(str(item.get("vendor", ""))) == vendor
    ]
    vendor_average = sum(vendor_amounts) / len(vendor_amounts) if vendor_amounts else 0.0

    return [
        amount,
        round(gst / amount, 4) if amount > 0 else 0.0,
        float(vendor_frequency),
        float(category_frequency),
        round(vendor_average, 4),
    ]


def derive_invoice_label(item: dict[str, Any]) -> int:
    return int(
        str(item.get("status", "")).upper() == "FLAGGED"
        or str(item.get("risk_level", "")).upper() == "HIGH"
        or float(item.get("fraud_probability", 0.0)) >= 0.65
        or float(item.get("anomaly_score", 0.0)) >= 0.65
    )


def validate_invoice(invoice: dict[str, Any]) -> dict[str, Any]:
    gst_validation = validate_gst(
        str(invoice["category"]),
        float(invoice["amount"]),
        float(invoice.get("gst", 0.0)),
        bool(invoice.get("is_inter_state", False)),
    )

    total_issues: list[str] = []
    expected_total = round(float(invoice["amount"]) + float(invoice.get("gst", 0.0)), 2)
    invoice_total = invoice.get("invoice_total")

    total_mismatch = False
    if invoice_total is not None:
        total_mismatch = round(float(invoice_total), 2) != expected_total
        if total_mismatch:
            total_issues.append(
                f"Invoice total {float(invoice_total):.2f} does not match amount + GST ({expected_total:.2f})."
            )

    return {
        "gst": gst_validation,
        "totals": {
            "invoice_total": round(float(invoice_total), 2) if invoice_total is not None else None,
            "expected_total": expected_total,
            "total_mismatch": total_mismatch,
            "issues": total_issues,
        },
        "valid": gst_validation["valid"] and not total_mismatch,
    }


def detect_abnormal_billing(invoice: dict[str, Any], history: list[dict[str, Any]]) -> dict[str, Any]:
    vendor = normalize(str(invoice["vendor"]))
    category = normalize(str(invoice["category"]))
    vendor_history = [
        item for item in history if normalize(str(item.get("vendor", ""))) == vendor
    ]
    category_history = [
        item for item in history if normalize(str(item.get("category", ""))) == category
    ]

    vendor_average = (
        sum(float(item["amount"]) for item in vendor_history) / len(vendor_history)
        if vendor_history
        else 0.0
    )
    category_average = (
        sum(float(item["amount"]) for item in category_history) / len(category_history)
        if category_history
        else 0.0
    )

    amount = float(invoice["amount"])
    reasons: list[str] = []
    score = 0.15

    if vendor_average and amount >= vendor_average * 1.6:
        score += 0.35
        reasons.append("Invoice amount is high compared to this vendor's historical average.")

    if category_average and amount >= category_average * 1.5:
        score += 0.25
        reasons.append("Invoice amount is elevated compared to the category baseline.")

    if not vendor_history:
        score += 0.12
        reasons.append("Vendor has limited billing history, increasing uncertainty.")

    return {
        "score": round(min(1.0, score), 4),
        "vendor_average": round(vendor_average, 2),
        "category_average": round(category_average, 2),
        "reasons": reasons,
    }


def score_vendor_intelligence(
    invoice: dict[str, Any],
    history: list[dict[str, Any]],
) -> dict[str, Any]:
    vendor = normalize(str(invoice["vendor"]))
    vendor_history = [
        item for item in history if normalize(str(item.get("vendor", ""))) == vendor
    ]

    flagged_count = sum(1 for item in vendor_history if str(item.get("risk_level", "")).upper() == "HIGH")
    average_anomaly = (
        sum(float(item.get("anomaly_score", 0.0)) for item in vendor_history) / len(vendor_history)
        if vendor_history
        else 0.0
    )
    average_fraud = (
        sum(float(item.get("fraud_probability", 0.0)) for item in vendor_history) / len(vendor_history)
        if vendor_history
        else 0.0
    )

    score = 22
    score += min(len(vendor_history) * 6, 20)
    score += min(flagged_count * 14, 28)
    score += round(average_anomaly * 22)
    score += round(average_fraud * 24)
    score = max(0, min(100, score))

    level = "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW"

    return {
        "score": score,
        "level": level,
        "frequency": len(vendor_history),
        "flagged_invoices": flagged_count,
        "average_anomaly_score": round(average_anomaly, 4),
        "average_fraud_probability": round(average_fraud, 4),
    }


def score_invoice_anomaly(invoice: dict[str, Any], history: list[dict[str, Any]]) -> float:
    if len(history) < 3 or IsolationForest is None:
        abnormal = detect_abnormal_billing(invoice, history)
        return round(min(1.0, 0.2 + abnormal["score"] * 0.8), 4)

    training_matrix = [build_invoice_features(item, history[:idx]) for idx, item in enumerate(history)]
    candidate_vector = build_invoice_features(invoice, history)

    model = IsolationForest(
        n_estimators=100,
        contamination=min(0.35, max(0.1, 1 / max(len(history), 4))),
        random_state=42,
    )
    model.fit(training_matrix)

    raw_train_scores = model.score_samples(training_matrix)
    candidate_raw_score = float(model.score_samples([candidate_vector])[0])
    min_score = float(min(raw_train_scores))
    max_score = float(max(raw_train_scores))

    if max_score == min_score:
        abnormal = detect_abnormal_billing(invoice, history)
        return round(min(1.0, 0.2 + abnormal["score"] * 0.8), 4)

    normalized = (max_score - candidate_raw_score) / (max_score - min_score)
    return round(max(0.0, min(1.0, normalized)), 4)


def build_billing_training_features(history: list[dict[str, Any]]) -> tuple[list[list[float]], list[int]]:
    rows: list[list[float]] = []
    labels: list[int] = []
    for idx, item in enumerate(history):
        prior_history = history[:idx]
        invoice = {
            "vendor": item["vendor"],
            "amount": item["amount"],
            "gst": item.get("gst", 0.0),
            "category": item["category"],
            "department": item.get("department", "general"),
            "date": item.get("date", ""),
        }
        validation = validate_invoice(invoice)
        duplicate = detect_duplicate_invoice(item, prior_history)
        vendor_risk = score_vendor_intelligence(invoice, prior_history)
        abnormal = detect_abnormal_billing(invoice, prior_history)
        budget = build_department_spending_alert(
            {
                "employee": str(item.get("employee", item.get("vendor", "general"))),
                "amount": item["amount"],
                "department": item.get("department", "general"),
            },
            prior_history,
        )

        rows.append(
            [
                float(invoice["amount"]),
                float(bool(validation["gst"]["issues"] or validation["totals"]["issues"])),
                float(bool(duplicate["is_duplicate"])),
                float(vendor_risk["score"]),
                float(abnormal["score"]),
                float(budget["utilization_rate"]),
            ]
        )
        labels.append(derive_invoice_label(item))

    return rows, labels


def predict_invoice_fraud_probability(
    invoice: dict[str, Any],
    history: list[dict[str, Any]],
    validation: dict[str, Any],
    duplicate: dict[str, Any],
    vendor_risk: dict[str, Any],
    abnormal_billing: dict[str, Any],
    budget_tracking: dict[str, Any],
) -> float:
    feature_rows, labels = build_billing_training_features(history)
    candidate_features = [
        float(invoice["amount"]),
        float(bool(validation["gst"]["issues"] or validation["totals"]["issues"])),
        float(bool(duplicate["is_duplicate"])),
        float(vendor_risk["score"]),
        float(abnormal_billing["score"]),
        float(budget_tracking["utilization_rate"]),
    ]

    if len(feature_rows) < 3 or len(set(labels)) < 2 or RandomForestClassifier is None:
        score = 0.08
        score += 0.18 if validation["gst"]["issues"] or validation["totals"]["issues"] else 0.0
        score += 0.22 if duplicate["is_duplicate"] else 0.0
        score += min(vendor_risk["score"] / 250.0, 0.22)
        score += min(abnormal_billing["score"] * 0.24, 0.24)
        score += min(budget_tracking["utilization_rate"] * 0.18, 0.18)
        return round(max(0.0, min(1.0, score)), 4)

    model = RandomForestClassifier(
        n_estimators=120,
        max_depth=4,
        random_state=42,
    )
    model.fit(feature_rows, labels)
    probability = float(model.predict_proba([candidate_features])[0][1])
    return round(max(0.0, min(1.0, probability)), 4)


def get_invoice_risk_label(fraud_probability: float, anomaly_score: float) -> str:
    combined = max(fraud_probability, anomaly_score)
    if combined >= 0.75:
        return "HIGH"
    if combined >= 0.45:
        return "MEDIUM"
    return "LOW"


def build_billing_recommendation(
    fraud_probability: float,
    anomaly_score: float,
    validation: dict[str, Any],
    duplicate: dict[str, Any],
) -> str:
    combined = max(fraud_probability, anomaly_score)
    if duplicate["is_duplicate"] or combined >= 0.75:
        return "FLAG"
    if validation["gst"]["issues"] or validation["totals"]["issues"] or combined >= 0.45:
        return "REVIEW"
    return "APPROVE"


def build_billing_explanations(
    validation: dict[str, Any],
    abnormal_billing: dict[str, Any],
    duplicate: dict[str, Any],
    vendor_risk: dict[str, Any],
    budget_tracking: dict[str, Any],
    fraud_probability: float,
    anomaly_score: float,
) -> list[str]:
    explanations: list[str] = []

    explanations.extend(validation["gst"]["issues"])
    explanations.extend(validation["totals"]["issues"])
    explanations.extend(abnormal_billing["reasons"])

    if duplicate["is_duplicate"]:
        explanations.append("Potential duplicate invoice detected in historical billing records.")

    if vendor_risk["score"] >= 70:
        explanations.append("Vendor risk score is elevated based on prior billing behavior.")

    if budget_tracking["level"] in {"MEDIUM", "HIGH"}:
        explanations.append(budget_tracking["alert"])

    if fraud_probability >= 0.65:
        explanations.append("Fraud probability is materially elevated for this invoice.")

    if anomaly_score >= 0.65:
        explanations.append("Invoice pattern is anomalous compared to historical billing behavior.")

    if not explanations:
        explanations.append("Invoice aligns with expected billing behavior and budget thresholds.")

    deduped: list[str] = []
    for item in explanations:
        if item not in deduped:
            deduped.append(item)
    return deduped[:7]


def build_suspicious_invoice_table(history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked = sorted(
        history,
        key=lambda item: (
            float(item.get("fraud_probability", 0.0)),
            float(item.get("anomaly_score", 0.0)),
            float(item.get("risk_score", 0.0)),
        ),
        reverse=True,
    )[:5]

    return [
        {
            "id": item["id"],
            "vendor": item["vendor"],
            "category": labelize(str(item["category"])),
            "amount": round(float(item["amount"]), 2),
            "risk_level": item.get("risk_level", "LOW"),
            "fraud_probability": round(float(item.get("fraud_probability", 0.0)), 4),
            "anomaly_score": round(float(item.get("anomaly_score", 0.0)), 4),
        }
        for item in ranked
    ]


def analyze_billing_invoice(invoice: dict[str, Any], history: list[dict[str, Any]]) -> dict[str, Any]:
    invoice_record = build_invoice_record(invoice)
    validation = validate_invoice(invoice)
    duplicate = detect_duplicate_invoice(
        {
            "employee": invoice_record["vendor"],
            "vendor": invoice_record["vendor"],
            "category": invoice_record["category"],
            "amount": invoice_record["amount"],
        },
        [
            {
                **item,
                "employee": item.get("vendor", item.get("employee", "")),
            }
            for item in history
        ],
    )
    abnormal_billing = detect_abnormal_billing(invoice_record, history)
    vendor_risk = score_vendor_intelligence(invoice_record, history)
    budget_tracking = build_department_spending_alert(
        {
            "employee": invoice_record["vendor"],
            "amount": invoice_record["amount"],
            "department": invoice_record["department"],
        },
        history,
    )
    anomaly_score = score_invoice_anomaly(invoice_record, history)
    fraud_probability = predict_invoice_fraud_probability(
        invoice_record,
        history,
        validation,
        duplicate,
        vendor_risk,
        abnormal_billing,
        budget_tracking,
    )
    risk_label = get_invoice_risk_label(fraud_probability, anomaly_score)
    recommendation = build_billing_recommendation(
        fraud_probability,
        anomaly_score,
        validation,
        duplicate,
    )
    explanations = build_billing_explanations(
        validation,
        abnormal_billing,
        duplicate,
        vendor_risk,
        budget_tracking,
        fraud_probability,
        anomaly_score,
    )

    return {
        "invoice": {
            **invoice_record,
            "date": invoice.get("date"),
            "invoice_total": invoice.get("invoice_total"),
        },
        "validation": {
            **validation,
            "duplicate_invoice": duplicate,
            "abnormal_billing": abnormal_billing,
        },
        "vendor_risk": vendor_risk,
        "budget_tracking": budget_tracking,
        "fraud_probability": fraud_probability,
        "anomaly_score": anomaly_score,
        "risk_label": risk_label,
        "recommendation": recommendation,
        "explanations": explanations,
        "suspicious_invoices": build_suspicious_invoice_table(history),
        "budget_usage": {
            "department": budget_tracking["department"],
            "projected_spend": budget_tracking["projected_spend"],
            "threshold": budget_tracking["threshold"],
            "utilization_rate": budget_tracking["utilization_rate"],
            "level": budget_tracking["level"],
        },
    }

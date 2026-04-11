from __future__ import annotations

from typing import Any

try:
    from sklearn.ensemble import IsolationForest, RandomForestClassifier
except ImportError:  # pragma: no cover - graceful fallback if sklearn is unavailable
    IsolationForest = None
    RandomForestClassifier = None

try:
    from .intelligence import (
        analyze_behavioral_risk,
        detect_duplicate_invoice,
        score_vendor_risk,
    )
    from .policy_rules import detect_policy_violations, validate_gst
except ImportError:
    from intelligence import analyze_behavioral_risk, detect_duplicate_invoice, score_vendor_risk
    from policy_rules import detect_policy_violations, validate_gst


def normalize(value: str) -> str:
    return value.strip().lower()


def category_index(category: str, history: list[dict[str, Any]]) -> int:
    categories = sorted(
        {normalize(str(item.get("category", ""))) for item in history}
        | {normalize(category)}
    )
    return categories.index(normalize(category))


def count_matches(
    history: list[dict[str, Any]],
    *,
    employee: str | None = None,
    vendor: str | None = None,
    category: str | None = None,
) -> int:
    matches = history
    if employee is not None:
        matches = [
            item for item in matches if normalize(str(item.get("employee", ""))) == normalize(employee)
        ]
    if vendor is not None:
        matches = [item for item in matches if normalize(str(item.get("vendor", ""))) == normalize(vendor)]
    if category is not None:
        matches = [
            item for item in matches if normalize(str(item.get("category", ""))) == normalize(category)
        ]
    return len(matches)


def build_anomaly_features(claim: dict[str, Any], history: list[dict[str, Any]]) -> list[float]:
    amount = float(claim["amount"])
    gst = float(claim.get("gst", 0.0))
    category = str(claim["category"])
    employee = str(claim["employee"])
    vendor = str(claim["vendor"])

    employee_claims = count_matches(history, employee=employee)
    vendor_claims = count_matches(history, vendor=vendor)
    category_claims = count_matches(history, category=category)

    return [
        amount,
        round(gst / amount, 4) if amount > 0 else 0.0,
        float(category_index(category, history)),
        float(employee_claims),
        float(vendor_claims),
        float(category_claims),
    ]


def heuristic_anomaly_score(claim: dict[str, Any], history: list[dict[str, Any]]) -> float:
    if not history:
        return 0.35

    amounts = [float(item["amount"]) for item in history]
    average_amount = sum(amounts) / len(amounts)
    high_amount_factor = min(1.0, float(claim["amount"]) / max(average_amount * 2, 1.0))
    vendor_frequency = count_matches(history, vendor=str(claim["vendor"]))
    novelty_factor = 0.15 if vendor_frequency == 0 else 0.0
    return round(min(1.0, 0.2 + high_amount_factor * 0.6 + novelty_factor), 4)


def score_anomaly(claim: dict[str, Any], history: list[dict[str, Any]]) -> float:
    if len(history) < 3 or IsolationForest is None:
        return heuristic_anomaly_score(claim, history)

    training_matrix = [build_anomaly_features(item, history[:idx]) for idx, item in enumerate(history)]
    candidate_vector = build_anomaly_features(claim, history)

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
        return heuristic_anomaly_score(claim, history)

    normalized = (max_score - candidate_raw_score) / (max_score - min_score)
    return round(max(0.0, min(1.0, normalized)), 4)


def derive_history_label(item: dict[str, Any]) -> int:
    status = str(item.get("status", "")).upper()
    risk_level = str(item.get("risk_level", "")).upper()
    compliance_score = float(item.get("compliance_score", 100))
    return int(status == "FLAGGED" or risk_level == "HIGH" or compliance_score < 70)


def build_fraud_features(
    claim: dict[str, Any],
    gst_issues: list[str],
    policy_violations: list[str],
    duplicate_result: dict[str, Any],
    vendor_risk: dict[str, Any],
    behavioral_risk: dict[str, Any],
) -> list[float]:
    return [
        float(claim["amount"]),
        float(bool(gst_issues)),
        float(len(policy_violations)),
        float(bool(duplicate_result.get("is_duplicate"))),
        float(vendor_risk["score"]),
        float(behavioral_risk["score"]),
    ]


def build_training_features(history: list[dict[str, Any]]) -> tuple[list[list[float]], list[int]]:
    feature_rows: list[list[float]] = []
    labels: list[int] = []

    for idx, item in enumerate(history):
        prior_history = history[:idx]
        gst_result = validate_gst(
            str(item["category"]),
            float(item["amount"]),
            float(item.get("gst", 0.0)),
        )
        policy_violations = detect_policy_violations(item)
        duplicate_result = detect_duplicate_invoice(item, prior_history)
        behavioral_risk = analyze_behavioral_risk(item, prior_history)
        vendor_risk = score_vendor_risk(item, prior_history)

        feature_rows.append(
            build_fraud_features(
                item,
                gst_result["issues"],
                policy_violations,
                duplicate_result,
                vendor_risk,
                behavioral_risk,
            )
        )
        labels.append(derive_history_label(item))

    return feature_rows, labels


def heuristic_fraud_probability(
    claim: dict[str, Any],
    gst_issues: list[str],
    policy_violations: list[str],
    duplicate_result: dict[str, Any],
    vendor_risk: dict[str, Any],
    behavioral_risk: dict[str, Any],
) -> float:
    score = 0.08
    score += min(float(claim["amount"]) / 6000.0, 0.24)
    score += 0.16 if gst_issues else 0.0
    score += min(len(policy_violations) * 0.08, 0.24)
    score += 0.22 if duplicate_result.get("is_duplicate") else 0.0
    score += min(vendor_risk["score"] / 250.0, 0.24)
    score += min(behavioral_risk["score"] / 300.0, 0.18)
    return round(max(0.0, min(1.0, score)), 4)


def predict_fraud_probability(
    claim: dict[str, Any],
    history: list[dict[str, Any]],
    gst_issues: list[str],
    policy_violations: list[str],
    duplicate_result: dict[str, Any],
    vendor_risk: dict[str, Any],
    behavioral_risk: dict[str, Any],
) -> float:
    feature_rows, labels = build_training_features(history)
    candidate_features = build_fraud_features(
        claim,
        gst_issues,
        policy_violations,
        duplicate_result,
        vendor_risk,
        behavioral_risk,
    )

    if len(feature_rows) < 3 or len(set(labels)) < 2 or RandomForestClassifier is None:
        return heuristic_fraud_probability(
            claim,
            gst_issues,
            policy_violations,
            duplicate_result,
            vendor_risk,
            behavioral_risk,
        )

    model = RandomForestClassifier(
        n_estimators=120,
        max_depth=4,
        min_samples_leaf=1,
        random_state=42,
    )
    model.fit(feature_rows, labels)
    probability = float(model.predict_proba([candidate_features])[0][1])
    return round(max(0.0, min(1.0, probability)), 4)


def build_explanations(
    claim: dict[str, Any],
    history: list[dict[str, Any]],
    anomaly_score: float,
    gst_issues: list[str],
    policy_violations: list[str],
    duplicate_result: dict[str, Any],
    vendor_risk: dict[str, Any],
    behavioral_risk: dict[str, Any],
) -> list[str]:
    explanations: list[str] = []

    employee_history = [
        item for item in history if normalize(str(item.get("employee", ""))) == normalize(str(claim["employee"]))
    ]
    if employee_history:
        average_amount = sum(float(item["amount"]) for item in employee_history) / len(employee_history)
        if float(claim["amount"]) >= average_amount * 1.5:
            explanations.append("High amount compared to history")

    if gst_issues:
        explanations.append("GST mismatch detected")

    if duplicate_result.get("is_duplicate"):
        explanations.append("Potential duplicate invoice detected")

    if any("same vendor" in signal.lower() for signal in behavioral_risk.get("signals", [])):
        explanations.append("Frequent claims from same vendor")

    if vendor_risk["score"] >= 70:
        explanations.append("Vendor risk profile is elevated")

    if policy_violations:
        explanations.append("Policy violations were triggered")

    if anomaly_score >= 0.65:
        explanations.append("Claim pattern is anomalous compared to historical submissions")

    if not explanations:
        explanations.append("Claim aligns with normal historical behavior")

    return explanations[:6]


def build_ai_recommendation(
    *,
    risk_score: int,
    anomaly_score: float,
    fraud_probability: float,
    explanation: list[str],
) -> dict[str, Any]:
    combined_signal = max(risk_score / 100.0, anomaly_score, fraud_probability)

    if combined_signal >= 0.75:
        decision = "FLAG"
        reasoning = "High composite risk driven by ML and rules-based signals."
    elif combined_signal >= 0.45:
        decision = "REVIEW"
        reasoning = "Mixed risk indicators suggest manual verification before approval."
    else:
        decision = "APPROVE"
        reasoning = "ML and rules-based checks indicate low operational risk."

    return {
        "decision": decision,
        "reasoning": reasoning,
        "drivers": explanation[:3],
    }


def build_ml_assessment(
    claim: dict[str, Any],
    history: list[dict[str, Any]],
    gst_issues: list[str],
    policy_violations: list[str],
    duplicate_result: dict[str, Any],
    vendor_risk: dict[str, Any],
    behavioral_risk: dict[str, Any],
    risk_score: int | None = None,
) -> dict[str, Any]:
    anomaly_score = score_anomaly(claim, history)
    fraud_probability = predict_fraud_probability(
        claim,
        history,
        gst_issues,
        policy_violations,
        duplicate_result,
        vendor_risk,
        behavioral_risk,
    )
    explanation = build_explanations(
        claim,
        history,
        anomaly_score,
        gst_issues,
        policy_violations,
        duplicate_result,
        vendor_risk,
        behavioral_risk,
    )
    ai_recommendation = build_ai_recommendation(
        risk_score=risk_score or 0,
        anomaly_score=anomaly_score,
        fraud_probability=fraud_probability,
        explanation=explanation,
    )

    return {
        "anomaly_score": anomaly_score,
        "fraud_probability": fraud_probability,
        "ai_recommendation": ai_recommendation,
        "explanation": explanation,
    }

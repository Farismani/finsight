const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail ?? options.errorMessage ?? "Request failed");
  }

  return response.json();
}

export async function submitClaim(payload) {
  return fetchJson("/claims/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    errorMessage: "Unable to submit claim",
  });
}

export async function extractReceiptData(file) {
  const formData = new FormData();
  formData.append("file", file);

  return fetchJson("/ocr/extract", {
    method: "POST",
    body: formData,
    errorMessage: "Unable to extract receipt data",
  });
}

export async function adminLogin(payload) {
  return fetchJson("/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    errorMessage: "Unable to log in",
  });
}

export async function getAdminClaims(token) {
  return fetchJson("/admin/claims", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    errorMessage: "Unable to load admin claims",
  });
}

export async function submitAdminDecision(claimId, decision, reason, token) {
  return fetchJson(`/admin/decision/${claimId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ decision, reason }),
    errorMessage: "Unable to update claim decision",
  });
}

export async function runAiInsightsAnalysis(payload) {
  return submitClaim(payload);
}

export async function analyzeBillingInvoice(payload) {
  return fetchJson("/billing/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    errorMessage: "Unable to analyze billing invoice",
  });
}

export async function getClaims() {
  return fetchJson("/claims", {
    errorMessage: "Failed to fetch claims",
  });
}

export async function getDashboardAnalytics() {
  return fetchJson("/dashboard/analytics", {
    errorMessage: "Unable to load dashboard analytics",
  });
}

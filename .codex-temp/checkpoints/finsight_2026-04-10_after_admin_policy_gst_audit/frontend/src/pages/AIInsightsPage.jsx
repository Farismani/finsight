import { useState } from 'react'
import {
  Activity,
  Bot,
  BrainCircuit,
  CheckCircle2,
  LoaderCircle,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'

import RiskBadge from '../components/RiskBadge'
import { runAiInsightsAnalysis } from '../services/api'

const samplePayload = {
  employee: 'Aisha Khan',
  category: 'travel',
  amount: 4800,
  gst: 900,
  vendor: 'Acme Travel',
  department: 'operations',
}

const textFields = [
  ['employee', 'Employee'],
  ['vendor', 'Vendor'],
  ['category', 'Category'],
]

const numberFields = [
  ['amount', 'Amount'],
  ['gst', 'GST'],
]

function normalizeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function resolveAiPayload(response) {
  if (!response) {
    return null
  }

  const aiObject = response.ai ?? response.assessment?.ml_intelligence
  const recommendationObject = response.ai_recommendation ?? aiObject?.ai_recommendation
  const recommendation =
    response.recommendation ??
    aiObject?.recommendation ??
    recommendationObject?.decision ??
    'REVIEW'

  return {
    fraudProbability: normalizeNumber(response.fraud_probability ?? aiObject?.fraud_probability),
    anomalyScore: normalizeNumber(response.anomaly_score ?? aiObject?.anomaly_score),
    recommendation,
    reasoning:
      response.reasoning ??
      recommendationObject?.reasoning ??
      aiObject?.reasoning ??
      'AI reasoning unavailable.',
    explanations:
      response.explanations ??
      response.explanation ??
      aiObject?.explanations ??
      aiObject?.explanation ??
      recommendationObject?.drivers ??
      [],
  }
}

function getSignalColor(value) {
  if (value >= 0.75) {
    return {
      tone: 'text-rose-300',
      track: 'bg-rose-400/15',
      fill: 'from-rose-400 to-orange-300',
      ring: 'ring-rose-400/30',
      solid: '#fb7185',
    }
  }
  if (value >= 0.45) {
    return {
      tone: 'text-amber-200',
      track: 'bg-amber-300/15',
      fill: 'from-amber-300 to-yellow-200',
      ring: 'ring-amber-300/30',
      solid: '#fcd34d',
    }
  }
  return {
    tone: 'text-emerald-200',
    track: 'bg-emerald-400/15',
    fill: 'from-emerald-400 to-cyan-300',
    ring: 'ring-emerald-300/30',
    solid: '#34d399',
  }
}

function getRecommendationStyles(recommendation) {
  switch (recommendation) {
    case 'APPROVE':
      return {
        badge: 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30',
        icon: CheckCircle2,
        mappedRiskBadge: 'CLEAR',
      }
    case 'FLAG':
      return {
        badge: 'bg-rose-400/15 text-rose-200 ring-1 ring-rose-300/30',
        icon: ShieldAlert,
        mappedRiskBadge: 'FLAGGED',
      }
    default:
      return {
        badge: 'bg-amber-300/15 text-amber-100 ring-1 ring-amber-300/30',
        icon: TriangleAlert,
        mappedRiskBadge: 'REVIEW',
      }
  }
}

function GaugeCard({ title, subtitle, value, icon, description }) {
  const Icon = icon
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  const styles = getSignalColor(value)

  return (
    <div className="glass-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-white">{subtitle}</h3>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 ${styles.tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-6">
        <div className={`relative flex h-28 w-28 items-center justify-center rounded-full ${styles.track} ring-1 ${styles.ring}`}>
          <div
            className="absolute inset-2 rounded-full"
            style={{
              background: `conic-gradient(from 180deg, ${styles.solid} ${pct}%, rgba(255,255,255,0.06) ${pct}%)`,
            }}
          />
          <div className="absolute inset-5 rounded-full bg-slate-950/90" />
          <div className="relative text-center">
            <p className={`text-3xl font-semibold ${styles.tone}`}>{pct}%</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Score</p>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm leading-6 text-slate-400">{description}</p>
          <div className={`mt-4 h-2 rounded-full ${styles.track}`}>
            <div
              className={`h-2 rounded-full bg-gradient-to-r ${styles.fill}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function RecommendationCard({ recommendation, reasoning }) {
  const { badge, icon: Icon, mappedRiskBadge } = getRecommendationStyles(recommendation)

  return (
    <div className="glass-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">AI Recommendation</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-white">Decision Engine</h3>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-cyan-200">
          <Bot className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${badge}`}>
          <Icon className="mr-2 h-4 w-4" />
          {recommendation}
        </span>
        <RiskBadge value={mappedRiskBadge} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Reasoning</p>
        <p className="mt-3 text-sm leading-6 text-slate-300">{reasoning}</p>
      </div>
    </div>
  )
}

function ExplanationPanel({ explanations }) {
  return (
    <div className="glass-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Model Explainability</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-white">Why the AI decided this</h3>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-cyan-200">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {explanations.length ? (
          explanations.map((item, index) => (
            <div key={`${item}-${index}`} className="soft-panel flex items-start gap-3 p-4">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300" />
              <p className="text-sm leading-6 text-slate-300">{item}</p>
            </div>
          ))
        ) : (
          <div className="soft-panel p-4 text-sm text-slate-400">No AI explanations available yet.</div>
        )}
      </div>
    </div>
  )
}

function TrendCard({ points }) {
  const max = Math.max(...points, 1)

  return (
    <div className="glass-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Signal Trend</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-white">Recent AI run history</h3>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-cyan-200">
          <Activity className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-8 flex h-48 items-end gap-3">
        {points.map((point, index) => (
          <div key={`${point}-${index}`} className="flex flex-1 flex-col items-center gap-3">
            <div className="flex h-36 w-full items-end rounded-2xl bg-white/5 p-1">
              <div
                className="w-full rounded-xl bg-gradient-to-t from-cyan-400 via-sky-400 to-white"
                style={{ height: `${Math.max((point / max) * 100, 10)}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">Run {index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InsightHero({ payload, onPayloadChange, loading, onRunAnalysis, error }) {
  return (
    <section className="glass-panel p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm text-slate-400">AI / ML Intelligence</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
            Claim intelligence cockpit
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Run a live AI analysis against a sample reimbursement claim and visualize fraud probability,
            anomaly signals, recommendation confidence, and model explanations in one place.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:w-[440px]">
          <div className="soft-panel p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Sample Employee</p>
            <p className="mt-2 text-sm font-medium text-white">{payload.employee}</p>
          </div>
          <div className="soft-panel p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Scenario</p>
            <p className="mt-2 text-sm font-medium text-white">
              {payload.category} / ${payload.amount}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {textFields.map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-2 block text-sm text-slate-400">{label}</span>
            <input
              value={payload[key]}
              onChange={(event) => onPayloadChange(key, event.target.value)}
              className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-white outline-none"
            />
          </label>
        ))}

        {numberFields.map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-2 block text-sm text-slate-400">{label}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={payload[key]}
              onChange={(event) => onPayloadChange(key, normalizeNumber(event.target.value))}
              className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-white outline-none"
            />
          </label>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="soft-panel inline-flex items-center gap-3 px-4 py-3 text-sm text-slate-300">
          <BrainCircuit className="h-4 w-4 text-cyan-200" />
          AI engine combines rules, anomaly detection, and fraud classification
        </div>

        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Running analysis...' : 'Run AI Analysis'}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
    </section>
  )
}

export default function AIInsightsPage() {
  const [payload, setPayload] = useState(samplePayload)
  const [analysis, setAnalysis] = useState(null)
  const [trendPoints, setTrendPoints] = useState([0.22, 0.34, 0.41, 0.56])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handlePayloadChange(key, value) {
    setPayload((current) => ({ ...current, [key]: value }))
  }

  async function handleRunAnalysis() {
    setLoading(true)
    setError('')

    try {
      const response = await runAiInsightsAnalysis(payload)
      const resolved = resolveAiPayload(response)
      setAnalysis(resolved)

      if (resolved) {
        const combinedSignal = Math.max(resolved.fraudProbability, resolved.anomalyScore)
        setTrendPoints((current) => [...current.slice(-5), combinedSignal])
      }
    } catch (analysisError) {
      setError(analysisError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <InsightHero
        payload={payload}
        onPayloadChange={handlePayloadChange}
        loading={loading}
        onRunAnalysis={handleRunAnalysis}
        error={error}
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <GaugeCard
              title="Fraud Probability"
              subtitle="Classifier confidence"
              value={analysis?.fraudProbability ?? 0}
              icon={ShieldAlert}
              description="Probability that the claim belongs to the fraudulent or high-risk class based on behavioral, duplicate, GST, and vendor features."
            />
            <GaugeCard
              title="Anomaly Score"
              subtitle="Outlier detection"
              value={analysis?.anomalyScore ?? 0}
              icon={Activity}
              description="Outlier intensity detected by anomaly modeling against historical claim amount, category, and submission frequency patterns."
            />
          </div>

          <TrendCard points={trendPoints} />
        </div>

        <div className="grid gap-6">
          <RecommendationCard
            recommendation={analysis?.recommendation ?? 'REVIEW'}
            reasoning={analysis?.reasoning ?? 'Run AI analysis to generate a decision narrative.'}
          />
          <ExplanationPanel explanations={analysis?.explanations ?? []} />
        </div>
      </section>
    </div>
  )
}

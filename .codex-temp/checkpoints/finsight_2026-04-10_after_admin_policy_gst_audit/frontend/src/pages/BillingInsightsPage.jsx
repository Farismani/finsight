import { useState } from 'react'
import {
  AlertTriangle,
  Building2,
  LoaderCircle,
  ReceiptText,
  ShieldAlert,
  Wallet,
} from 'lucide-react'

import RiskBadge from '../components/RiskBadge'
import { analyzeBillingInvoice } from '../services/api'

const sampleInvoice = {
  vendor: 'Acme Travel',
  amount: 4800,
  gst: 900,
  date: '2026-03-18',
  category: 'travel',
  department: 'operations',
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function getSignalClasses(value) {
  if (value >= 0.75) {
    return {
      text: 'text-rose-300',
      track: 'bg-rose-400/15',
      fill: 'from-rose-400 to-orange-300',
    }
  }
  if (value >= 0.45) {
    return {
      text: 'text-amber-200',
      track: 'bg-amber-300/15',
      fill: 'from-amber-300 to-yellow-200',
    }
  }
  return {
    text: 'text-emerald-200',
    track: 'bg-emerald-400/15',
    fill: 'from-emerald-400 to-cyan-300',
  }
}

function MetricCard({ title, subtitle, value, icon, progress, suffix = '' }) {
  const Icon = icon
  const progressValue = Math.max(0, Math.min(100, Math.round(progress * 100)))
  const styles = getSignalClasses(progress)

  return (
    <div className="glass-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-white">{subtitle}</h3>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 ${styles.text}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6">
        <p className={`text-4xl font-semibold ${styles.text}`}>
          {value}
          {suffix}
        </p>
        <div className={`mt-5 h-2 rounded-full ${styles.track}`}>
          <div
            className={`h-2 rounded-full bg-gradient-to-r ${styles.fill}`}
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function RecommendationCard({ recommendation, explanations }) {
  const mapped = recommendation === 'FLAG' ? 'FLAGGED' : recommendation === 'REVIEW' ? 'REVIEW' : 'CLEAR'

  return (
    <div className="glass-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Recommendation</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-white">Billing decision</h3>
        </div>
        <RiskBadge value={mapped} />
      </div>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/5 p-4">
        <p className="text-sm font-medium text-white">{recommendation}</p>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {explanations[0] ?? 'Run billing analysis to generate an AI-guided recommendation.'}
        </p>
      </div>
    </div>
  )
}

function ExplanationsPanel({ items }) {
  return (
    <div className="glass-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Explanation Trail</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-white">Why this invoice was flagged</h3>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-cyan-200">
          <AlertTriangle className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${item}-${index}`} className="soft-panel flex items-start gap-3 p-4">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-300" />
              <p className="text-sm leading-6 text-slate-300">{item}</p>
            </div>
          ))
        ) : (
          <div className="soft-panel p-4 text-sm text-slate-400">No explanations yet.</div>
        )}
      </div>
    </div>
  )
}

function SuspiciousInvoicesTable({ rows }) {
  return (
    <div className="glass-panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Suspicious Invoices</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-white">Historical watchlist</h3>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-cyan-200">
          <ReceiptText className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-3 font-medium">Vendor</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 font-medium">Amount</th>
              <th className="pb-3 font-medium">Fraud</th>
              <th className="pb-3 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/6 text-slate-300">
                <td className="py-4">{row.vendor}</td>
                <td className="py-4">{row.category}</td>
                <td className="py-4">{formatCurrency(row.amount)}</td>
                <td className="py-4">{Math.round(row.fraud_probability * 100)}%</td>
                <td className="py-4">
                  <RiskBadge value={row.risk_level} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BillingInsightsPage() {
  const [invoice, setInvoice] = useState(sampleInvoice)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function updateField(key, value) {
    setInvoice((current) => ({ ...current, [key]: value }))
  }

  async function handleAnalyze() {
    setLoading(true)
    setError('')

    try {
      const response = await analyzeBillingInvoice(invoice)
      setAnalysis(response)
    } catch (analysisError) {
      setError(analysisError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm text-slate-400">Billing Intelligence</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
              Invoice intelligence control center
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Analyze invoices for GST mismatches, duplicate billing, abnormal vendor behavior, budget impact,
              and AI-detected fraud signals using the historical claim dataset.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <div className="soft-panel p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Vendor</p>
              <p className="mt-2 text-sm font-medium text-white">{invoice.vendor}</p>
            </div>
            <div className="soft-panel p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Department</p>
              <p className="mt-2 text-sm font-medium text-white">{invoice.department}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            ['vendor', 'Vendor'],
            ['category', 'Category'],
            ['date', 'Invoice Date'],
            ['department', 'Department'],
          ].map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm text-slate-400">{label}</span>
              <input
                value={invoice[key]}
                onChange={(event) => updateField(key, event.target.value)}
                className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-white outline-none"
              />
            </label>
          ))}

          {[
            ['amount', 'Amount'],
            ['gst', 'GST'],
          ].map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm text-slate-400">{label}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={invoice[key]}
                onChange={(event) => updateField(key, Number(event.target.value))}
                className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-white outline-none"
              />
            </label>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="soft-panel inline-flex items-center gap-3 px-4 py-3 text-sm text-slate-300">
            <Building2 className="h-4 w-4 text-cyan-200" />
            Billing AI uses vendor, anomaly, duplicate, and budget signals together
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            {loading ? 'Analyzing invoice...' : 'Analyze Billing'}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <MetricCard
              title="Invoice Risk"
              subtitle="Composite billing risk"
              value={analysis?.risk_label ?? 'LOW'}
              icon={ShieldAlert}
              progress={
                analysis
                  ? Math.max(analysis.fraud_probability ?? 0, analysis.anomaly_score ?? 0)
                  : 0
              }
            />
            <MetricCard
              title="Fraud Probability"
              subtitle="Invoice fraud classifier"
              value={analysis ? Math.round((analysis.fraud_probability ?? 0) * 100) : 0}
              suffix="%"
              icon={AlertTriangle}
              progress={analysis?.fraud_probability ?? 0}
            />
            <MetricCard
              title="Vendor Risk"
              subtitle="Vendor intelligence score"
              value={analysis?.vendor_risk?.score ?? 0}
              icon={Building2}
              progress={(analysis?.vendor_risk?.score ?? 0) / 100}
            />
            <MetricCard
              title="Budget Usage"
              subtitle="Department threshold utilization"
              value={analysis ? Math.round((analysis.budget_usage?.utilization_rate ?? 0) * 100) : 0}
              suffix="%"
              icon={Wallet}
              progress={analysis?.budget_usage?.utilization_rate ?? 0}
            />
          </div>

          <SuspiciousInvoicesTable rows={analysis?.suspicious_invoices ?? []} />
        </div>

        <div className="grid gap-6">
          <RecommendationCard
            recommendation={analysis?.recommendation ?? 'REVIEW'}
            explanations={analysis?.explanations ?? []}
          />
          <ExplanationsPanel items={analysis?.explanations ?? []} />
        </div>
      </section>
    </div>
  )
}

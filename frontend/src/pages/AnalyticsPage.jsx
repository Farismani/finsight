import { ArrowUpRight, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'

import RiskBadge from '../components/RiskBadge'
import { getDashboardAnalytics } from '../services/api'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatLabel(value) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const data = await getDashboardAnalytics()
        setDashboard(data.dashboard)
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [])

  if (loading) {
    return <div className="glass-panel p-6 text-slate-500">Loading analytics...</div>
  }

  if (error) {
    return <div className="glass-panel p-6 text-red-500">{error}</div>
  }

  const topVendor = dashboard.vendor_risk_leaderboard[0] ?? {
    vendor: 'No vendor data',
    score: 0,
  }
  const topDepartment = dashboard.department_spending_alerts[0] ?? {
    department: 'general',
    utilization_rate: 0,
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="glass-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500 font-medium">Advanced analytics</p>
            <h2 className="font-display text-2xl font-bold text-brand">Vendor risk intelligence</h2>
          </div>
          <div className="inline-flex items-center gap-2 border border-brand/20 bg-brand/5 px-4 py-2 rounded-lg text-sm font-semibold text-brand">
            <ArrowUpRight className="h-4 w-4" />
            {dashboard.summary_cards.high_risk_claims} high-risk claims
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {dashboard.vendor_risk_leaderboard.map((row) => (
            <div key={row.vendor} className="soft-panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-brand">{row.vendor}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Flagged claim volume {formatCurrency(row.flagged_volume)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Score</p>
                  <p className="text-lg font-bold text-brand">{Math.round(row.score)}</p>
                </div>
                <RiskBadge value={row.level} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Compliance watch</p>
              <h3 className="font-display text-xl font-bold text-brand">Policy drift overview</h3>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
            <p>
              {formatLabel(topDepartment.department)} is using {Math.round(topDepartment.utilization_rate * 100)}% of its department threshold.
            </p>
            <p>
              Portfolio compliance index is {dashboard.summary_cards.compliance_index}% across {dashboard.summary_cards.total_claims} tracked claims.
            </p>
            <p>
              {topVendor.vendor} currently has the highest vendor risk score at {Math.round(topVendor.score)}.
            </p>
          </div>
        </div>

        <div className="glass-panel p-6">
          <p className="text-sm text-slate-500 font-medium">Architecture</p>
          <h3 className="mt-2 font-display text-xl font-bold text-brand">Project cycle</h3>
          <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
            <p>Users submit a reimbursement claim, FastAPI validates GST and policy rules, then the risk engine scores behavior, vendors, duplicates, and department exposure.</p>
            <p>The frontend turns that response into dashboards, ledgers, and analytics views so finance teams can approve, review, or flag claims quickly.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'

import KpiCard from '../components/KpiCard'
import ClaimsByCategoryChart from '../charts/ClaimsByCategoryChart'
import RiskDistributionChart from '../charts/RiskDistributionChart'
import VendorLeaderboardChart from '../charts/VendorLeaderboardChart'
import { getDashboardAnalytics } from '../services/api'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 1,
  }).format(value)
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getDashboardAnalytics()
        setDashboard(data.dashboard)
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const kpis = useMemo(() => {
    if (!dashboard) {
      return []
    }

    return [
      {
        title: 'Total Claims',
        value: dashboard.summary_cards.total_claims.toLocaleString(),
        caption: 'All reimbursements currently tracked in the portfolio',
        accent: 'bg-cyan-300',
      },
      {
        title: 'High Risk Claims',
        value: dashboard.summary_cards.high_risk_claims.toLocaleString(),
        caption: 'Claims requiring additional compliance review',
        accent: 'bg-orange-400',
      },
      {
        title: 'Compliance Index',
        value: `${dashboard.summary_cards.compliance_index}%`,
        caption: 'Average policy and tax alignment across the claim book',
        accent: 'bg-emerald-400',
      },
      {
        title: 'Financial Exposure',
        value: formatCurrency(dashboard.summary_cards.financial_exposure),
        caption: 'Open claim value including tax exposure',
        accent: 'bg-sky-400',
      },
    ]
  }, [dashboard])

  if (loading) {
    return <div className="glass-panel p-6 text-slate-300">Loading dashboard analytics...</div>
  }

  if (error) {
    return <div className="glass-panel p-6 text-rose-300">{error}</div>
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => (
          <KpiCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="grid gap-6">
          <RiskDistributionChart
            data={dashboard.risk_distribution.map((item) => ({
              label: item.name,
              value: item.value,
            }))}
          />
          <ClaimsByCategoryChart
            data={dashboard.claims_by_category.map((item) => ({
              label: item.name,
              value: item.value,
            }))}
          />
        </div>
        <div className="grid gap-6">
          <VendorLeaderboardChart
            data={dashboard.vendor_risk_leaderboard.map((item) => ({
              label: item.vendor,
              value: item.score,
            }))}
          />
          <div className="glass-panel p-5">
            <div className="mb-5">
              <p className="text-sm text-slate-400">Realtime finance alerts</p>
              <h3 className="font-display text-xl font-semibold text-white">Live watchlist</h3>
            </div>
            <div className="space-y-4">
              {dashboard.live_watchlist.map((alert) => (
                <div key={alert.title} className="soft-panel p-4">
                  <p className="text-sm font-medium text-white">{alert.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{alert.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

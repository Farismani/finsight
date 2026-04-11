import { useEffect, useState } from 'react'

import { getClaims } from '../services/api'

const statusStyles = {
  APPROVED: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
  REJECTED: 'border-red-300/30 bg-red-300/10 text-red-100',
  FLAGGED: 'border-orange-300/30 bg-orange-300/10 text-orange-100',
  SUBMITTED: 'border-slate-300/20 bg-slate-300/10 text-slate-200',
}

function StatusPill({ value }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[value] ?? statusStyles.SUBMITTED}`}>
      {value}
    </span>
  )
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadClaims() {
      try {
        const data = await getClaims()
        setClaims(data.claims || [])
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    loadClaims()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Employee claims</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">Claims Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">
          Track submitted claims and final admin decisions.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-400">Loading claims...</div>
        ) : claims.length === 0 ? (
          <div className="p-6 text-sm text-slate-400">No claims submitted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Claim ID</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {claims.map((claim) => (
                  <tr key={claim.id} className="text-sm text-slate-200">
                    <td className="px-4 py-4 font-medium text-white">{claim.id}</td>
                    <td className="px-4 py-4">{claim.employee}</td>
                    <td className="px-4 py-4">{claim.vendor}</td>
                    <td className="px-4 py-4">{claim.category}</td>
                    <td className="px-4 py-4">${Number(claim.amount).toFixed(2)}</td>
                    <td className="px-4 py-4">
                      <StatusPill value={claim.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2, Flag, LogOut, XCircle } from 'lucide-react'

import { getAdminClaims, submitAdminDecision } from '../services/api'

const statusStyles = {
  APPROVED: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
  REJECTED: 'border-red-300/30 bg-red-300/10 text-red-100',
  FLAGGED: 'border-orange-300/30 bg-orange-300/10 text-orange-100',
  SUBMITTED: 'border-slate-300/20 bg-slate-300/10 text-slate-200',
  REVIEW: 'border-sky-300/30 bg-sky-300/10 text-sky-100',
  CLEAR: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
}

function StatusPill({ value }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[value] ?? statusStyles.SUBMITTED}`}>
      {value}
    </span>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const token = useMemo(() => localStorage.getItem('finsight_admin_token'), [])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingClaimId, setUpdatingClaimId] = useState('')

  useEffect(() => {
    if (!token) {
      return
    }

    async function loadClaims() {
      try {
        const response = await getAdminClaims(token)
        setClaims(response.claims ?? [])
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoading(false)
      }
    }

    loadClaims()
  }, [token])

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  async function handleDecision(claimId, decision) {
    setUpdatingClaimId(claimId)
    setError('')

    try {
      const response = await submitAdminDecision(claimId, decision, token)
      setClaims((current) =>
        current.map((claim) => (claim.id === claimId ? response.claim : claim)),
      )
    } catch (decisionError) {
      setError(decisionError.message)
    } finally {
      setUpdatingClaimId('')
    }
  }

  function handleLogout() {
    localStorage.removeItem('finsight_admin_token')
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Admin panel</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white">Claim decisions</h1>
          <p className="mt-2 text-sm text-slate-400">
            Review system suggestions and set final claim outcomes.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
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
          <div className="p-6 text-sm text-slate-400">No claims are waiting for review.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Claim ID</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">System Suggestion</th>
                  <th className="px-4 py-3">Final Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {claims.map((claim) => {
                  const finalStatus = claim.admin_status || claim.status
                  const isUpdating = updatingClaimId === claim.id

                  return (
                    <tr key={claim.id} className="text-sm text-slate-200">
                      <td className="px-4 py-4 font-medium text-white">{claim.id}</td>
                      <td className="px-4 py-4">{claim.employee}</td>
                      <td className="px-4 py-4">{claim.vendor}</td>
                      <td className="px-4 py-4">${Number(claim.amount).toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <StatusPill value={claim.system_status} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill value={finalStatus} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleDecision(claim.id, 'APPROVED')}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-300/20 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleDecision(claim.id, 'REJECTED')}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-300/25 bg-red-300/10 px-3 py-2 text-xs font-medium text-red-100 transition hover:bg-red-300/20 disabled:opacity-60"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleDecision(claim.id, 'FLAGGED')}
                            className="inline-flex items-center gap-1 rounded-lg border border-orange-300/25 bg-orange-300/10 px-3 py-2 text-xs font-medium text-orange-100 transition hover:bg-orange-300/20 disabled:opacity-60"
                          >
                            <Flag className="h-3.5 w-3.5" />
                            Flag
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

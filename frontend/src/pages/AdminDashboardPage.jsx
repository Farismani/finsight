import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2, Flag, LogOut, Settings2, XCircle } from 'lucide-react'

import { getAdminClaims, submitAdminDecision } from '../services/api'

const statusStyles = {
  APPROVED: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  REJECTED: 'border-red-500 bg-red-50 text-red-700',
  FLAGGED: 'border-orange-500 bg-orange-50 text-orange-700',
  SUBMITTED: 'border-blue-500 bg-blue-50 text-blue-700',
  REVIEW: 'border-blue-400 bg-blue-50 text-blue-700',
  CLEAR: 'border-emerald-500 bg-emerald-50 text-emerald-700',
}

function StatusPill({ value }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[value] ?? statusStyles.SUBMITTED}`}>
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
    if (!token) return

    async function loadClaims() {
      try {
        const response = await getAdminClaims(token)
        setClaims(response.claims ?? [])
      } catch (err) {
        setError(err.message)
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
    const reason = window.prompt('Enter reason')
    if (!reason || !reason.trim()) {
      setError('Decision reason is required.')
      return
    }

    setUpdatingClaimId(claimId)
    setError('')

    try {
      const response = await submitAdminDecision(claimId, decision, reason.trim(), token)
      setClaims((current) =>
        current.map((claim) =>
          claim.id === claimId ? response.claim : claim
        )
      )
    } catch (err) {
      setError(err.message)
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

      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 font-medium">Admin panel</p>
          <h1 className="mt-2 text-3xl font-bold text-brand">
            Claim Decisions
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Review system suggestions and set final claim outcomes.
          </p>
        </div>

        <div className="flex gap-3">

          {/* POLICY BUTTON */}
          <button
            onClick={() => navigate('/admin/policy')}
            className="flex items-center gap-2 rounded-xl border border-brand bg-brand/10 px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/20 transition"
          >
            <Settings2 size={16} />
            Policy Settings
          </button>

          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <LogOut size={16} />
            Sign Out
          </button>

        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-red-400 bg-red-50 p-3 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* TABLE */}
      <div className="rounded-2xl border border-line bg-white shadow-lg overflow-hidden">

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading claims...</div>
        ) : claims.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            No claims are waiting for review.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">

              {/* HEADER */}
              <thead className="bg-brand text-xs uppercase text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Claim ID</th>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">System</th>
                  <th className="px-4 py-3 font-semibold">Final</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              {/* BODY */}
              <tbody className="divide-y divide-line">
                {claims.map((claim) => {
                  const finalStatus = claim.admin_status || claim.status
                  const isUpdating = updatingClaimId === claim.id

                  return (
                    <tr key={claim.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-4 font-semibold text-brand">{claim.id}</td>
                      <td className="px-4 py-4 text-slate-700">{claim.employee}</td>
                      <td className="px-4 py-4 text-slate-700">{claim.vendor}</td>
                      <td className="px-4 py-4 font-semibold text-brand">₹{Number(claim.amount).toFixed(2)}</td>

                      <td className="px-4 py-4">
                        <StatusPill value={claim.system_status} />
                      </td>

                      <td className="px-4 py-4">
                        <StatusPill value={finalStatus} />
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex gap-2 flex-wrap">

                          <button
                            disabled={isUpdating}
                            onClick={() => handleDecision(claim.id, 'APPROVED')}
                            className="flex items-center gap-1 rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                          >
                            <CheckCircle2 size={14} />
                            Approve
                          </button>

                          <button
                            disabled={isUpdating}
                            onClick={() => handleDecision(claim.id, 'REJECTED')}
                            className="flex items-center gap-1 rounded-lg border border-red-500 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>

                          <button
                            disabled={isUpdating}
                            onClick={() => handleDecision(claim.id, 'FLAGGED')}
                            className="flex items-center gap-1 rounded-lg border border-orange-500 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition"
                          >
                            <Flag size={14} />
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
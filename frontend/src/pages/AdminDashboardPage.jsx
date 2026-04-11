import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2, Flag, LogOut, Settings2, XCircle } from 'lucide-react'

import { getAdminClaims, submitAdminDecision } from '../services/api'

const statusStyles = {
  APPROVED: 'border-emerald-500 bg-emerald-500/25 text-emerald-300',
  REJECTED: 'border-red-500 bg-red-500/25 text-red-300',
  FLAGGED: 'border-orange-500 bg-orange-500/25 text-orange-300',
  SUBMITTED: 'border-blue-500 bg-blue-500/25 text-blue-300',
  REVIEW: 'border-blue-400 bg-blue-400/25 text-blue-300',
  CLEAR: 'border-emerald-500 bg-emerald-500/25 text-emerald-300',
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
    <div className="space-y-6 text-white">

      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/60">Admin panel</p>
          <h1 className="mt-2 text-3xl font-bold text-blue-400">
            Claim Decisions
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Review system suggestions and set final claim outcomes.
          </p>
        </div>

        <div className="flex gap-3">

          {/* POLICY BUTTON */}
          <button
            onClick={() => navigate('/admin/policy')}
            className="flex items-center gap-2 rounded-xl border border-blue-400 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/40 transition"
          >
            <Settings2 size={16} />
            Policy Settings
          </button>

          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 transition"
          >
            <LogOut size={16} />
            Sign Out
          </button>

        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-red-500 bg-red-500/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* TABLE */}
      <div className="rounded-2xl border border-blue-500/20 bg-[#020c1b] shadow-2xl overflow-hidden">

        {loading ? (
          <div className="p-6 text-sm text-white/60">Loading claims...</div>
        ) : claims.length === 0 ? (
          <div className="p-6 text-sm text-white/60">
            No claims are waiting for review.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">

              {/* HEADER */}
              <thead className="bg-blue-500/20 text-xs uppercase text-blue-300 border-b border-blue-500/20">
                <tr>
                  <th className="px-4 py-3">Claim ID</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">System</th>
                  <th className="px-4 py-3">Final</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              {/* BODY */}
              <tbody className="divide-y divide-white/10">
                {claims.map((claim) => {
                  const finalStatus = claim.admin_status || claim.status
                  const isUpdating = updatingClaimId === claim.id

                  return (
                    <tr key={claim.id} className="hover:bg-white/5 transition">
                      <td className="px-4 py-4 font-semibold">{claim.id}</td>
                      <td className="px-4 py-4">{claim.employee}</td>
                      <td className="px-4 py-4">{claim.vendor}</td>
                      <td className="px-4 py-4">₹{Number(claim.amount).toFixed(2)}</td>

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
                            className="flex items-center gap-1 rounded-lg border border-emerald-500 bg-emerald-500/25 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/50"
                          >
                            <CheckCircle2 size={14} />
                            Approve
                          </button>

                          <button
                            disabled={isUpdating}
                            onClick={() => handleDecision(claim.id, 'REJECTED')}
                            className="flex items-center gap-1 rounded-lg border border-red-500 bg-red-500/25 px-3 py-2 text-xs text-red-300 hover:bg-red-500/50"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>

                          <button
                            disabled={isUpdating}
                            onClick={() => handleDecision(claim.id, 'FLAGGED')}
                            className="flex items-center gap-1 rounded-lg border border-orange-500 bg-orange-500/25 px-3 py-2 text-xs text-orange-300 hover:bg-orange-500/50"
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
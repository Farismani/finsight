import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, FileCheck2, Search, ShieldAlert } from 'lucide-react'

import { getClaims } from '../services/api'

const statusStyles = {
  APPROVED: 'border-[#008755]/25 bg-[#008755]/10 text-[#008755]',
  REJECTED: 'border-[#DA291C]/25 bg-[#DA291C]/10 text-[#DA291C]',
  FLAGGED: 'border-[#DA291C]/25 bg-[#DA291C]/10 text-[#DA291C]',
  SUBMITTED: 'border-[#53565A]/25 bg-[#F2F2F2] text-[#53565A]',
}

function StatusPill({ value }) {
  return (
    <span className={`inline-flex border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${statusStyles[value] ?? statusStyles.SUBMITTED}`}>
      {value}
    </span>
  )
}

function formatAuditDate(value) {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(parsedDate)
}

function formatAdminAction(status) {
  const normalizedStatus = status?.toUpperCase()
  if (normalizedStatus === 'APPROVED') {
    return 'Approved by Admin'
  }
  if (normalizedStatus === 'REJECTED') {
    return 'Rejected by Admin'
  }
  if (normalizedStatus === 'FLAGGED') {
    return 'Flagged by Admin'
  }
  return ''
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(Number(value) || 0)
}

function formatLabel(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function SummaryCard({ icon, label, value, accent = 'bg-brand' }) {
  const Icon = icon

  return (
    <div className="border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#53565A]">{label}</p>
          <p className="mt-2 font-display text-4xl font-bold uppercase text-brand">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center text-white ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

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

  const summary = useMemo(() => {
    const approved = claims.filter((claim) => claim.status === 'APPROVED').length
    const flagged = claims.filter((claim) => claim.status === 'FLAGGED' || claim.risk_level === 'HIGH').length
    const exposure = claims.reduce((total, claim) => total + Number(claim.amount || 0), 0)

    return {
      approved,
      exposure,
      flagged,
      total: claims.length,
    }
  }, [claims])

  const filteredClaims = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return claims.filter((claim) => {
      const finalStatus = claim.admin_status || claim.status
      const matchesStatus = statusFilter === 'ALL' || finalStatus === statusFilter
      const searchable = [claim.id, claim.employee, claim.vendor, claim.category, finalStatus]
        .join(' ')
        .toLowerCase()
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery))
    })
  }, [claims, query, statusFilter])

  if (loading) {
    return <div className="glass-panel p-6 text-brand">Loading claims register...</div>
  }

  return (
    <div className="space-y-7">
      <section className="overflow-hidden border border-line bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
          <div className="p-6 sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-brand2">Claims register</p>
            <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-none text-brand">
              Employee Claims
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#53565A]">
              Track every submitted reimbursement, final admin decision, and audit reason in a cleaner Balfour Beatty-style control register.
            </p>
          </div>
          <div className="bg-brand p-6 text-white sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#F2F2F2]">Portfolio exposure</p>
            <p className="mt-3 font-display text-5xl font-bold uppercase leading-none text-white">
              {formatCurrency(summary.exposure)}
            </p>
            <p className="mt-4 text-sm leading-6 text-[#F2F2F2]">
              Total open claim value across the live reimbursement ledger.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="border border-[#DA291C]/25 bg-[#DA291C]/10 p-4 text-sm font-semibold text-[#DA291C]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={ClipboardList} label="Total Claims" value={summary.total} />
        <SummaryCard icon={FileCheck2} label="Approved" value={summary.approved} accent="bg-[#008755]" />
        <SummaryCard icon={ShieldAlert} label="Flagged / High Risk" value={summary.flagged} accent="bg-brand2" />
      </section>

      <section className="border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 border border-line bg-[#F2F2F2] px-4 py-3">
            <Search className="h-4 w-4 text-brand" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search claim ID, employee, vendor, category"
              className="w-full border-0 bg-transparent p-0 text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FLAGGED'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`border px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] transition ${
                  statusFilter === status
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-white text-brand hover:border-brand hover:bg-[#F2F2F2]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="overflow-hidden border border-line bg-white shadow-sm">
        {filteredClaims.length === 0 ? (
          <div className="p-6 text-sm text-[#53565A]">No claims match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="bg-brand text-xs uppercase tracking-[0.16em] text-white">
                <tr>
                  <th className="px-5 py-4">Claim ID</th>
                  <th className="px-5 py-4">Employee</th>
                  <th className="px-5 py-4">Vendor / Category</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Risk</th>
                  <th className="px-5 py-4">Status & Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredClaims.map((claim) => {
                  const finalStatus = claim.admin_status || claim.status
                  const auditDate = formatAuditDate(claim.admin_timestamp)

                  return (
                    <tr key={claim.id} className="text-sm text-[#393339] transition hover:bg-[#F2F2F2]">
                      <td className="px-5 py-5">
                        <p className="font-display text-2xl font-bold uppercase text-brand">{claim.id}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#97999B]">
                          System: {claim.system_status || 'N/A'}
                        </p>
                      </td>
                      <td className="px-5 py-5">
                        <p className="font-semibold text-[#393339]">{claim.employee}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#53565A]">
                          {formatLabel(claim.department || 'general')}
                        </p>
                      </td>
                      <td className="px-5 py-5">
                        <p className="font-semibold text-[#393339]">{claim.vendor}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#53565A]">
                          {formatLabel(claim.category)}
                        </p>
                      </td>
                      <td className="px-5 py-5 font-display text-2xl font-bold text-brand">
                        {formatCurrency(claim.amount)}
                      </td>
                      <td className="px-5 py-5">
                        <div className="inline-flex border border-line bg-[#F2F2F2] px-3 py-2">
                          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#53565A]">
                            {claim.risk_level || 'LOW'} / {claim.risk_score ?? 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <StatusPill value={finalStatus} />
                        {claim.admin_status ? (
                          <div className="mt-3 max-w-sm border-l-4 border-brand bg-[#F2F2F2] px-4 py-3 text-xs leading-5 text-[#53565A]">
                            <p className="font-bold uppercase tracking-[0.12em] text-brand">{formatAdminAction(claim.admin_status)}</p>
                            <p className="mt-1">Reason: {claim.admin_reason || 'No reason provided'}</p>
                            {auditDate ? <p>Time: {auditDate}</p> : null}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#97999B]">
                            Awaiting admin decision
                          </p>
                        )}
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

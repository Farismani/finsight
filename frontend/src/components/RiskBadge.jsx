const badgeStyles = {
  LOW: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  HIGH: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  CRITICAL: 'bg-blue-950 text-white ring-1 ring-blue-950',
  CLEAR: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  REVIEW: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  FLAGGED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
}

export default function RiskBadge({ value }) {
  return (
    <span
      className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
        badgeStyles[value] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {value}
    </span>
  )
}



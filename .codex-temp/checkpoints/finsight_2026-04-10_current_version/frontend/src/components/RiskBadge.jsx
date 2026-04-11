const badgeStyles = {
  LOW: 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30',
  MEDIUM: 'bg-yellow-400/15 text-yellow-300 ring-1 ring-yellow-400/30',
  HIGH: 'bg-orange-400/15 text-orange-300 ring-1 ring-orange-400/30',
  CRITICAL: 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-400/30',
  CLEAR: 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30',
  REVIEW: 'bg-yellow-400/15 text-yellow-300 ring-1 ring-yellow-400/30',
  FLAGGED: 'bg-orange-400/15 text-orange-300 ring-1 ring-orange-400/30',
}

export default function RiskBadge({ value }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        badgeStyles[value] ?? 'bg-white/10 text-white'
      }`}
    >
      {value}
    </span>
  )
}

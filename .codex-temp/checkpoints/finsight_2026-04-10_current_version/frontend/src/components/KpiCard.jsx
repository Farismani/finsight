export default function KpiCard({ title, value, caption, accent }) {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-3 font-display text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={`h-3 w-3 rounded-full ${accent}`} />
      </div>
      <p className="mt-4 text-sm text-slate-400">{caption}</p>
    </div>
  )
}

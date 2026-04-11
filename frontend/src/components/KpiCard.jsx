export default function KpiCard({ title, value, caption, accent }) {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="mt-3 font-display text-3xl font-bold text-brand">{value}</p>
        </div>
        <div className={`h-3 w-3 rounded-full ${accent}`} />
      </div>
      <p className="mt-4 text-sm text-slate-500 font-medium">{caption}</p>
    </div>
  )
}

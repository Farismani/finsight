import { Bell, Search, Sparkles } from 'lucide-react'

export default function Header({ hyperMode, onToggleMode }) {
  return (
    <header className="border-b border-line bg-white px-5 py-5 shadow-sm sm:px-8 xl:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand2">Enterprise controls</p>
          <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-brand">
            FinSight Workspace
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Claims assurance, reimbursement policy, and operational risk in one infrastructure-grade control layer.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onToggleMode}
            className={`inline-flex items-center gap-2 border px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition ${
              hyperMode
                ? 'border-brand bg-brand text-white'
                : 'border-brand/20 bg-white text-brand hover:border-brand hover:bg-brand hover:text-white'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {hyperMode ? 'Focus On' : 'Focus Mode'}
          </button>

          <div className="flex items-center gap-3 border border-line bg-white px-4 py-3 text-slate-500 shadow-sm">
            <Search className="h-4 w-4" />
            <span className="text-sm">Search claims, vendors, alerts</span>
          </div>

          <button className="relative flex h-12 w-12 items-center justify-center border border-line bg-white text-brand shadow-sm">
            <Bell className="h-4 w-4" />
            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-brand2" />
          </button>

          <div className="flex items-center gap-3 border border-line bg-brand px-3 py-2 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center bg-white text-sm font-bold text-brand">
              FA
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Faris</p>
              <p className="text-xs text-blue-100">Finance Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

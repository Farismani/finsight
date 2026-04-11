import { Bell, Search, Sparkles } from 'lucide-react'

export default function Header({ hyperMode, onToggleMode }) {
  return (
    <header className="border-b border-line px-5 py-5 sm:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-400">Fintech operations dashboard</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
            FinSight Workspace
          </h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onToggleMode}
            className={`soft-panel inline-flex items-center gap-2 px-4 py-3 text-sm transition ${
              hyperMode ? 'text-cyan-200 ring-1 ring-cyan-300/25' : 'text-slate-300'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {hyperMode ? 'Hyper Mode On' : 'Hyper Mode'}
          </button>

          <div className="soft-panel flex items-center gap-3 px-4 py-3 text-slate-400">
            <Search className="h-4 w-4" />
            <span className="text-sm">Search claims, vendors, alerts</span>
          </div>

          <button className="soft-panel relative flex h-12 w-12 items-center justify-center text-slate-200">
            <Bell className="h-4 w-4" />
            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-cyan-300" />
          </button>

          <div className="glass-panel flex items-center gap-3 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-sky-500 text-sm font-semibold text-slate-950">
              FA
            </div>
            <div>
              <p className="text-sm font-medium text-white">Faris</p>
              <p className="text-xs text-slate-400">Finance Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

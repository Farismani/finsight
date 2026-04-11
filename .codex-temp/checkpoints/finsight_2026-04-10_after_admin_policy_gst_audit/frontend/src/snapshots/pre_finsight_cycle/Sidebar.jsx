import {
  BarChart3,
  BrainCircuit,
  CreditCard,
  LayoutDashboard,
  Receipt,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Submit Claim', to: '/submit-claim', icon: CreditCard },
  { label: 'Claims', to: '/claims', icon: ReceiptText },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'AI Insights', to: '/ai-insights', icon: BrainCircuit },
  { label: 'Billing Intelligence', to: '/billing-insights', icon: Receipt },
]

export default function Sidebar() {
  return (
    <aside className="border-b border-line bg-slate-950/55 px-5 py-6 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-6">
      <div className="glass-panel p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-white">FinSight</p>
            <p className="text-xs text-slate-400">Intelligent reimbursement</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Risk-aware claims, compliance intelligence, and financial visibility in one fintech control layer.
        </p>
      </div>

      <nav className="mt-6 space-y-2">
        {navItems.map(({ label, to, icon }) => {
          const Icon = icon

          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          )
        })}
      </nav>

      <div className="mt-6 rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/10 to-sky-400/5 p-5">
        <p className="font-display text-sm font-semibold text-white">Control Tower</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-slate-400">Automation</p>
            <p className="mt-2 font-semibold text-white">94%</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-slate-400">Exposure</p>
            <p className="mt-2 font-semibold text-white">$67k</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

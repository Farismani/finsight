import {
  BarChart3,
  BrainCircuit,
  CreditCard,
  LayoutDashboard,
  Receipt,
  ReceiptText,
  Shield,
  ShieldCheck,
  Waypoints,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Submit Claim', to: '/submit-claim', icon: CreditCard },
  { label: 'Claims', to: '/claims', icon: ReceiptText },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'AI Insights', to: '/ai-insights', icon: BrainCircuit },
  { label: 'Billing Intelligence', to: '/billing-insights', icon: Receipt },
  { label: 'FinSight Cycle', to: '/finsight-cycle', icon: Waypoints },
  { label: 'Admin Panel', to: '/admin', icon: Shield },
]

export default function Sidebar() {
  return (
    <aside className="border-b border-blue-500/20 bg-[#020c1b] px-5 py-6 text-white lg:min-h-screen lg:border-b-0 lg:border-r lg:border-r-blue-500/20 lg:px-6">

      {/* LOGO / BRAND */}
      <div className="border border-blue-500/20 bg-blue-500/10 p-5 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            {/* ✅ FIXED HERE */}
            <p className="font-display text-3xl font-bold uppercase leading-none text-white">
              FinSight
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Intelligent reimbursement
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-white/70">
          Building new assurance for claims, compliance, and financial controls.
        </p>
      </div>

      {/* NAVIGATION */}
      <nav className="mt-7 space-y-2">
        {navItems.map(({ label, to, icon }) => {
          const Icon = icon

          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-white/80 hover:bg-blue-500/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* CONTROL PANEL */}
      <div className="mt-8 border border-blue-500/20 bg-blue-500/10 p-5 rounded-xl">
        <p className="font-display text-2xl font-bold uppercase text-blue-400">
          Control Tower
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          Live operations
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="border border-blue-500/20 bg-[#020c1b] p-3 rounded-lg">
            <p className="text-white/60">Automation</p>
            <p className="mt-2 font-semibold text-white">94%</p>
          </div>

          <div className="border border-blue-500/20 bg-[#020c1b] p-3 rounded-lg">
            <p className="text-white/60">Exposure</p>
            <p className="mt-2 font-semibold text-white">$67k</p>
          </div>
        </div>
      </div>

    </aside>
  )
}
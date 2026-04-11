import { useEffect, useState } from 'react'
import {
  BadgeCheck,
  BrainCircuit,
  Building2,
  CheckCircle2,
  CircleDashed,
  FileStack,
  LoaderCircle,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserRound,
  Waypoints,
} from 'lucide-react'

import RiskBadge from '../components/RiskBadge'
import { submitClaim } from '../services/api'

const TOTAL_STEPS = 6
const STEP_DELAYS = [900, 1100, 850, 1200, 950, 800]

const sampleClaim = {
  employee: 'Aisha Khan',
  vendor: 'Acme Travel',
  amount: 4800,
  gst: 864,
  category: 'travel',
  department: 'operations',
}

function formatCurrency(value) {
  if (typeof value !== 'number') return 'Pending'
  return `₹${Math.round(value)}`
}

function formatScore(value) {
  if (typeof value !== 'number') return 'Pending'
  return `${Math.round(value)}/100`
}

function normalizeStatus(status) {
  if (status === 'FLAGGED') return 'FLAG'
  return status ?? 'Pending'
}

function stepState(index, currentStep) {
  if (index < currentStep) return 'complete'
  if (index === currentStep) return 'active'
  return 'upcoming'
}

function StepMetric({ label, value, subtle = false }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#020617] p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{label}</p>
      <p className={`mt-2 text-sm ${subtle ? 'text-white/70' : 'font-semibold text-white'}`}>
        {value}
      </p>
    </div>
  )
}

function PipelineStepCard({ index, icon: Icon, title, description, state, children }) {
  const isActive = state === 'active'
  const isComplete = state === 'complete'

  const shellClass = isActive
    ? 'border-blue-400 bg-[#020617] shadow-[0_0_40px_rgba(59,130,246,0.25)] scale-[1.02]'
    : isComplete
    ? 'border-emerald-400 bg-emerald-500/10'
    : 'border-white/10 bg-[#020617]/70 opacity-80'

  const chipClass = isActive
    ? 'bg-blue-500/20 text-blue-300 ring-blue-400/30'
    : isComplete
    ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-400/30'
    : 'bg-[#020617] text-white/70 ring-white/10'

  return (
    <div className={`rounded-[28px] border p-5 transition-all duration-500 ${shellClass}`}>
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="flex items-center gap-4 lg:w-[280px]">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${chipClass}`}>
            {isComplete ? <CheckCircle2 /> : <Icon />}
          </div>

          <div>
            <p className="text-xs text-white/60">Step {index + 1}</p>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <p className="text-sm text-white/70">{description}</p>
          </div>
        </div>

        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function FinSightCyclePage() {
  const [currentStep, setCurrentStep] = useState(-1)
  const [responseData, setResponseData] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!responseData || !isRunning) return

    let cumulativeDelay = 0
    const timers = STEP_DELAYS.map((delay, index) => {
      cumulativeDelay += delay

      return setTimeout(() => {
        setCurrentStep(index)
        if (index === TOTAL_STEPS - 1) {
          setTimeout(() => {
            setIsRunning(false)
            setCurrentStep(TOTAL_STEPS)
          }, 300)
        }
      }, cumulativeDelay)
    })

    return () => timers.forEach(clearTimeout)
  }, [responseData, isRunning])

  async function handleRunCycle() {
    setError('')
    setResponseData(null)
    setCurrentStep(-1)
    setIsRunning(true)

    try {
      const response = await submitClaim(sampleClaim)
      setResponseData(response)
    } catch (e) {
      setError(e.message)
      setIsRunning(false)
    }
  }

  const progress =
    currentStep < 0 ? 0 : Math.min(((currentStep + 1) / TOTAL_STEPS) * 100, 100)

  const assessment = responseData?.assessment
  const displayedStatus = normalizeStatus(responseData?.status)

  const steps = [
    {
      icon: ReceiptText,
      title: 'Input',
      description: 'Claim enters system',
      content: (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StepMetric label="Employee" value={sampleClaim.employee} />
          <StepMetric label="Vendor" value={sampleClaim.vendor} />
          <StepMetric label="Amount" value={formatCurrency(sampleClaim.amount)} />
        </div>
      ),
    },
    {
      icon: ShieldCheck,
      title: 'GST & Policy',
      description: 'Validation stage',
      content: (
        <StepMetric label="GST" value={assessment?.gst?.valid ? 'Valid' : 'Pending'} />
      ),
    },
    {
      icon: FileStack,
      title: 'Billing',
      description: 'Duplicate check',
      content: (
        <StepMetric label="Duplicate" value={assessment?.duplicate_invoice?.is_duplicate ? 'Yes' : 'No'} />
      ),
    },
    {
      icon: BrainCircuit,
      title: 'AI Risk',
      description: 'Risk scoring',
      content: (
        <StepMetric label="Risk Score" value={formatScore(assessment?.risk?.score)} />
      ),
    },
    {
      icon: BadgeCheck,
      title: 'Decision',
      description: 'System decision',
      content: (
        <StepMetric label="Decision" value={displayedStatus} />
      ),
    },
    {
      icon: Building2,
      title: 'Output',
      description: 'Final result',
      content: (
        <StepMetric label="Final" value="Stored & Updated" />
      ),
    },
  ]

  return (
    <div className="space-y-6 text-white">

      <div>
        <h1 className="text-3xl font-bold text-blue-400">FinSight Cycle</h1>
      </div>

      <button
        onClick={handleRunCycle}
        disabled={isRunning}
        className="bg-blue-500/20 border border-blue-400 px-5 py-3 rounded-xl text-blue-300 hover:bg-blue-500/40"
      >
        {isRunning ? 'Processing...' : 'Run FinSight Cycle'}
      </button>

      <div className="bg-white/10 h-2 rounded-full overflow-hidden">
        <div
          className="bg-blue-400 h-2 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-4">
        {steps.map((s, i) => (
          <PipelineStepCard
            key={i}
            index={i}
            icon={s.icon}
            title={s.title}
            description={s.description}
            state={stepState(i, currentStep)}
          >
            {s.content}
          </PipelineStepCard>
        ))}
      </div>

      {error && (
        <div className="text-red-400">{error}</div>
      )}
    </div>
  )
}
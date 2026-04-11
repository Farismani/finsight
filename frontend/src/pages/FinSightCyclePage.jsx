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
  return `$${Math.round(value).toLocaleString()}`
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
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-semibold">{label}</p>
      <p className={`mt-2 text-sm ${subtle ? 'text-slate-600' : 'font-bold text-brand'}`}>
        {value}
      </p>
    </div>
  )
}

function PipelineStepCard({ index, icon: Icon, title, description, state, children }) {
  const isActive = state === 'active'
  const isComplete = state === 'complete'

  const shellClass = isActive
    ? 'border-brand bg-white shadow-[0_0_40px_rgba(27,54,93,0.15)] scale-[1.02]'
    : isComplete
    ? 'border-emerald-500 bg-emerald-50'
    : 'border-line bg-white opacity-70'

  const chipClass = isActive
    ? 'bg-brand/10 text-brand ring-brand/30'
    : isComplete
    ? 'bg-emerald-100 text-emerald-700 ring-emerald-300'
    : 'bg-slate-100 text-slate-500 ring-slate-200'

  return (
    <div className={`rounded-[28px] border p-5 transition-all duration-500 ${shellClass}`}>
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="flex items-center gap-4 lg:w-[280px]">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${chipClass}`}>
            {isComplete ? <CheckCircle2 /> : <Icon />}
          </div>

          <div>
            <p className="text-xs text-slate-500 font-medium">Step {index + 1}</p>
            <h3 className="text-xl font-bold text-brand">{title}</h3>
            <p className="text-sm text-slate-600">{description}</p>
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
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-brand">FinSight Cycle</h1>
        <p className="text-slate-600 mt-1">End-to-end claim processing pipeline visualization</p>
      </div>

      <button
        onClick={handleRunCycle}
        disabled={isRunning}
        className="border border-brand bg-brand text-white px-5 py-3 rounded-xl font-semibold hover:bg-brand-deep transition disabled:opacity-60"
      >
        {isRunning ? 'Processing...' : 'Run FinSight Cycle'}
      </button>

      <div className="bg-slate-200 h-2 rounded-full overflow-hidden">
        <div
          className="bg-brand h-2 transition-all duration-500"
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
        <div className="rounded-xl border border-red-400 bg-red-50 p-3 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}
    </div>
  )
}
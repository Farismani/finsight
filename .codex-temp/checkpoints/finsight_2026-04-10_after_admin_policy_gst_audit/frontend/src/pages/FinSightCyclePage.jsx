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
  if (typeof value !== 'number') {
    return 'Pending'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatScore(value) {
  if (typeof value !== 'number') {
    return 'Pending'
  }

  return `${Math.round(value)}/100`
}

function normalizeStatus(status) {
  if (status === 'FLAGGED') {
    return 'FLAG'
  }

  return status ?? 'Pending'
}

function stepState(index, currentStep) {
  if (index < currentStep) {
    return 'complete'
  }

  if (index === currentStep) {
    return 'active'
  }

  return 'upcoming'
}

function StepMetric({ label, value, subtle = false }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-2 text-sm ${subtle ? 'text-slate-300' : 'font-semibold text-white'}`}>{value}</p>
    </div>
  )
}

function PipelineStepCard({ index, icon: Icon, title, description, state, children }) {
  const isActive = state === 'active'
  const isComplete = state === 'complete'

  const shellClass = isActive
    ? 'border-cyan-300/35 bg-slate-950/90 shadow-[0_0_35px_rgba(34,211,238,0.16)] scale-[1.01]'
    : isComplete
    ? 'border-emerald-400/30 bg-emerald-400/[0.05]'
    : 'border-white/8 bg-slate-950/50 opacity-60'

  const chipClass = isActive
    ? 'bg-cyan-300/15 text-cyan-200 ring-cyan-300/20'
    : isComplete
    ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/20'
    : 'bg-white/5 text-slate-400 ring-white/10'

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border p-5 transition-all duration-500 ${shellClass}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex items-center gap-4 lg:w-[280px] lg:flex-none">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${
              isActive
                ? 'bg-cyan-300/15 text-cyan-200 ring-cyan-300/20'
                : isComplete
                ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/20'
                : 'bg-white/5 text-slate-500 ring-white/10'
            }`}
          >
            {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
          </div>

          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Step {index + 1}</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-4 flex justify-start lg:justify-end">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${chipClass}`}>
              {isActive ? 'Processing...' : isComplete ? 'Completed' : 'Queued'}
            </span>
          </div>
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
    if (!responseData || !isRunning) {
      return undefined
    }

    let cumulativeDelay = 0
    const timers = STEP_DELAYS.map((delay, index) => {
      cumulativeDelay += delay

      return window.setTimeout(() => {
        setCurrentStep(index)

        if (index === TOTAL_STEPS - 1) {
          window.setTimeout(() => {
            setIsRunning(false)
            setCurrentStep(TOTAL_STEPS)
          }, 250)
        }
      }, cumulativeDelay)
    })

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [responseData, isRunning])

  async function handleRunCycle() {
    setError('')
    setResponseData(null)
    setCurrentStep(-1)
    setIsRunning(true)

    try {
      const response = await submitClaim(sampleClaim)
      setResponseData(response)
    } catch (cycleError) {
      setIsRunning(false)
      setError(cycleError.message)
    }
  }

  const progress = currentStep < 0 ? 0 : Math.min(((currentStep + 1) / TOTAL_STEPS) * 100, 100)
  const assessment = responseData?.assessment
  const displayedStatus = normalizeStatus(responseData?.status)

  const steps = [
    {
      icon: ReceiptText,
      title: 'Input',
      description: 'Claim payload enters the control pipeline and the core reimbursement facts are prepared.',
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
      title: 'Policy & GST Validation',
      description: 'FinSight validates GST treatment and checks submitted values against policy rules.',
      content: (
        <div className="grid gap-4 lg:grid-cols-2">
          <StepMetric
            label="GST Validation"
            value={assessment?.gst?.valid ? 'Valid' : assessment?.gst ? 'Invalid' : 'Pending'}
          />
          <StepMetric
            label="Policy Violations"
            value={
              assessment?.policy_violations?.length
                ? assessment.policy_violations.join(', ')
                : responseData
                ? 'No policy violations'
                : 'Pending'
            }
            subtle={Boolean(responseData)}
          />
        </div>
      ),
    },
    {
      icon: FileStack,
      title: 'Billing Intelligence',
      description: 'Duplicate invoice patterns and vendor profile checks are evaluated in the billing layer.',
      content: (
        <div className="grid gap-4 lg:grid-cols-2">
          <StepMetric
            label="Duplicate Detection"
            value={
              assessment?.duplicate_invoice?.is_duplicate
                ? 'Potential duplicate found'
                : responseData
                ? 'No duplicate pattern detected'
                : 'Pending'
            }
          />
          <StepMetric
            label="Vendor Risk"
            value={assessment?.vendor_risk?.level ?? 'Pending'}
            subtle={Boolean(assessment?.vendor_risk?.level)}
          />
        </div>
      ),
    },
    {
      icon: BrainCircuit,
      title: 'AI / Risk Analysis',
      description: 'Behavioral and vendor intelligence signals are fused into a unified risk assessment.',
      content: (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Risk Level</p>
            {assessment?.risk?.level ? (
              <div className="mt-3">
                <RiskBadge value={assessment.risk.level} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-300">Pending</p>
            )}
          </div>
          <StepMetric
            label="Behavioral Risk Score"
            value={formatScore(assessment?.behavioral_risk?.score)}
          />
          <StepMetric label="Vendor Risk Score" value={formatScore(assessment?.vendor_risk?.score)} />
        </div>
      ),
    },
    {
      icon: BadgeCheck,
      title: 'Decision Engine',
      description: 'The decision layer converts the intelligence outputs into an operational claim outcome.',
      content: (
        <div className="rounded-2xl border border-white/8 bg-gradient-to-r from-white/[0.05] to-cyan-300/[0.05] p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</p>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                displayedStatus === 'CLEAR'
                  ? 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30'
                  : displayedStatus === 'REVIEW'
                  ? 'bg-yellow-400/15 text-yellow-300 ring-1 ring-yellow-400/30'
                  : displayedStatus === 'FLAG'
                  ? 'bg-orange-400/15 text-orange-300 ring-1 ring-orange-400/30'
                  : 'bg-white/10 text-white'
              }`}
            >
              {displayedStatus}
            </span>
            <span className="text-sm text-slate-300">
              {displayedStatus === 'FLAG'
                ? 'High-risk claim escalated for manual intervention.'
                : displayedStatus === 'REVIEW'
                ? 'Claim routed for finance review.'
                : responseData
                ? 'Claim cleared for normal processing.'
                : 'Pending'}
            </span>
          </div>
        </div>
      ),
    },
    {
      icon: Building2,
      title: 'Final Output',
      description: 'The claim result is committed to the product workflow and surfaced to downstream views.',
      content: (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/70">System Output</p>
            <p className="mt-3 text-lg font-semibold text-white">Stored and displayed in dashboard</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Claim {responseData?.claim_id ? `#${responseData.claim_id}` : ''} has completed the FinSight cycle.
            </p>
          </div>
          <div className="grid gap-4">
            <StepMetric label="Claim Employee" value={responseData?.claim?.employee ?? sampleClaim.employee} />
            <StepMetric label="Total Exposure" value={formatCurrency(responseData?.claim?.total_exposure)} />
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_30%),rgba(2,6,23,0.9)] p-6 shadow-[0_24px_60px_rgba(2,6,23,0.4)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm text-cyan-200/80">FinSight Cycle</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
              Live claims intelligence pipeline
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Click once and watch the reimbursement pipeline execute like a live fintech control system, from
              claim intake to final decisioning.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunCycle}
            disabled={isRunning}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isRunning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isRunning ? 'Processing...' : 'Run FinSight Cycle'}
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Waypoints className="h-4 w-4 text-cyan-200" />
                <p className="text-sm font-medium text-white">Pipeline Progress</p>
              </div>
              <span className="text-sm text-slate-300">{Math.round(progress)}%</span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {steps.map((step, index) => {
                const state = stepState(index, currentStep)
                const cardClass =
                  state === 'complete'
                    ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
                    : state === 'active'
                    ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
                    : 'border-white/8 bg-white/[0.03] text-slate-500'

                return (
                  <div
                    key={step.title}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-500 ${cardClass}`}
                  >
                    {state === 'complete' ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : state === 'active' ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CircleDashed className="h-3.5 w-3.5" />
                    )}
                    {step.title}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5">
              <div className="flex items-center gap-3">
                <UserRound className="h-4 w-4 text-cyan-200" />
                <p className="text-sm font-medium text-white">Employee</p>
              </div>
              <p className="mt-3 text-sm text-slate-300">{sampleClaim.employee}</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-cyan-200" />
                <p className="text-sm font-medium text-white">Vendor</p>
              </div>
              <p className="mt-3 text-sm text-slate-300">{sampleClaim.vendor}</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-4 w-4 text-cyan-200" />
                <p className="text-sm font-medium text-white">Target Decision</p>
              </div>
              <p className="mt-3 text-sm text-slate-300">CLEAR / REVIEW / FLAG</p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        {steps.map((step, index) => (
          <PipelineStepCard
            key={step.title}
            index={index}
            icon={step.icon}
            title={step.title}
            description={step.description}
            state={stepState(index, currentStep)}
          >
            {step.content}
          </PipelineStepCard>
        ))}
      </section>
    </div>
  )
}

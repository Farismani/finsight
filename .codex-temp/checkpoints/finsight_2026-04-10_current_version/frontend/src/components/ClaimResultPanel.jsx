import { AlertTriangle, BadgeCheck, ShieldAlert } from 'lucide-react'

import RiskBadge from './RiskBadge'

function ResultBlock({ icon, title, subtitle, children }) {
  const Icon = icon

  return (
    <div className="soft-panel p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-cyan-200">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 text-sm leading-6 text-slate-300">{children}</div>
    </div>
  )
}

export default function ClaimResultPanel({ result }) {
  if (!result) {
    return (
      <div className="glass-panel flex min-h-[430px] items-center justify-center p-8 text-center text-slate-400">
        Submit a claim to visualize GST validation, policy issues, and risk scoring.
      </div>
    )
  }

  const complianceScore = result.assessment.compliance_score ?? {
    score: 0,
    label: 'Unavailable',
  }
  const riskLevel = result.assessment.risk.level
  const effectiveRisk =
    riskLevel === 'HIGH' && result.assessment.vendor_risk.score >= 85
      ? 'CRITICAL'
      : riskLevel

  return (
    <div className="glass-panel space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Claim outcome</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white">
            Status: {result.status}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {result.claim.employee} / {result.claim.vendor}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RiskBadge value={effectiveRisk} />
          <RiskBadge value={result.system_status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ResultBlock
          icon={BadgeCheck}
          title="GST validation"
          subtitle={`Expected rate ${Math.round(result.assessment.gst.expected_rate * 100)}%`}
        >
          {result.assessment.gst.valid
            ? 'GST matches the configured tax rate for this expense category.'
            : result.assessment.gst.issues.join(' ')}
        </ResultBlock>

        <ResultBlock
          icon={ShieldAlert}
          title="Policy violations"
          subtitle={`${result.assessment.policy_violations.length} issues found`}
        >
          {result.assessment.policy_violations.length
            ? result.assessment.policy_violations.join(' ')
            : 'No policy violations were triggered for this submission.'}
        </ResultBlock>
      </div>

      <ResultBlock
        icon={AlertTriangle}
        title="Risk score"
        subtitle={result.assessment.risk.label}
      >
        <div className="flex items-center justify-between">
          <span className="text-4xl font-semibold text-white">
            {result.assessment.risk.score}
          </span>
          <RiskBadge value={effectiveRisk} />
        </div>
        <div className="mt-4 h-3 rounded-full bg-white/5">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-purple-500"
            style={{
              width: `${Math.min(result.assessment.risk.score, 100)}%`,
            }}
          />
        </div>
      </ResultBlock>

      <div className="grid gap-4 md:grid-cols-3">
        <ResultBlock
          icon={AlertTriangle}
          title="Behavioral Risk"
          subtitle={result.assessment.behavioral_risk.level}
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl font-semibold text-white">
              {result.assessment.behavioral_risk.score}
            </span>
            <RiskBadge value={result.assessment.behavioral_risk.level} />
          </div>
        </ResultBlock>

        <ResultBlock
          icon={ShieldAlert}
          title="Vendor Risk"
          subtitle={result.assessment.vendor_risk.level}
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl font-semibold text-white">
              {result.assessment.vendor_risk.score}
            </span>
            <RiskBadge value={result.assessment.vendor_risk.level} />
          </div>
        </ResultBlock>

        <ResultBlock
          icon={BadgeCheck}
          title="Compliance Score"
          subtitle={complianceScore.label}
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl font-semibold text-white">
              {complianceScore.score}
            </span>
            <RiskBadge value={complianceScore.label} />
          </div>
        </ResultBlock>
      </div>

      <div className="soft-panel p-4">
        <p className="text-sm text-slate-400">Admin review</p>
        <p className="mt-2 text-lg font-semibold text-white">Status: {result.status}</p>
        <p className="mt-2 text-sm text-slate-400">
          System suggestion: {result.system_status}. Final approval is available only in the admin portal.
        </p>
      </div>
    </div>
  )
}

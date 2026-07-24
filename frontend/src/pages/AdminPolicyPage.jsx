import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, RotateCcw, AlertCircle } from 'lucide-react'
import { getPolicy, updatePolicy } from '../services/api'

const DEFAULT_CATEGORIES = [
  { key: 'travel', label: 'Travel', defaultLimit: 5000 },
  { key: 'meals', label: 'Meals', defaultLimit: 500 },
  { key: 'accommodation', label: 'Accommodation', defaultLimit: 2500 },
  { key: 'office_supplies', label: 'Office Supplies', defaultLimit: 800 },
  { key: 'training', label: 'Training', defaultLimit: 3000 },
  { key: 'medical', label: 'Medical', defaultLimit: 1500 },
]

const DEFAULT_GST_RATES = {
  travel: 5,
  meals: 5,
  accommodation: 12,
  office_supplies: 18,
  training: 18,
  medical: 0,
}

export default function AdminPolicyPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('finsight_admin_token')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [policy, setPolicy] = useState(null)
  const [limits, setLimits] = useState({})
  const [gstRates, setGstRates] = useState({})
  const [riskThresholds, setRiskThresholds] = useState({ high: 71, medium: 31 })

  useEffect(() => {
    if (!token) {
      navigate('/admin/login', { replace: true })
      return
    }

    async function loadPolicy() {
      try {
        const data = await getPolicy(token)
        setPolicy(data)
        
        // Parse limits
        const parsedLimits = {}
        DEFAULT_CATEGORIES.forEach(cat => {
          parsedLimits[cat.key] = data.limits?.[cat.key] ?? cat.defaultLimit
        })
        setLimits(parsedLimits)

        // Parse GST rates (convert decimal to percentage)
        const parsedGst = {}
        DEFAULT_CATEGORIES.forEach(cat => {
          const rate = data.gst_rates?.[cat.key]
          parsedGst[cat.key] = rate !== undefined ? Math.round(rate * 100) : DEFAULT_GST_RATES[cat.key]
        })
        setGstRates(parsedGst)

        // Parse risk thresholds
        if (data.risk_thresholds) {
          setRiskThresholds({
            high: data.risk_thresholds.high ?? 71,
            medium: data.risk_thresholds.medium ?? 31,
          })
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadPolicy()
  }, [token, navigate])

  function handleLimitChange(category, value) {
    const num = parseFloat(value)
    if (isNaN(num) || num >= 0) {
      setLimits(prev => ({ ...prev, [category]: value === '' ? '' : num }))
    }
  }

  function handleGstChange(category, value) {
    const num = parseFloat(value)
    if (isNaN(num) || (num >= 0 && num <= 100)) {
      setGstRates(prev => ({ ...prev, [category]: value === '' ? '' : num }))
    }
  }

  function handleThresholdChange(type, value) {
    const num = parseInt(value)
    if (isNaN(num) || num >= 0) {
      setRiskThresholds(prev => ({ ...prev, [type]: value === '' ? '' : num }))
    }
  }

  function validateThresholds() {
    const { high, medium } = riskThresholds
    if (medium >= high) {
      setError('Medium threshold must be less than High threshold')
      return false
    }
    if (medium <= 0 || high > 100) {
      setError('Thresholds must be between 0 and 100')
      return false
    }
    return true
  }

  async function handleSave() {
    setError('')
    setSuccess('')

    if (!validateThresholds()) {
      return
    }

    setSaving(true)
    try {
      // Convert GST from percentage to decimal
      const gstRatesDecimal = {}
      Object.entries(gstRates).forEach(([key, val]) => {
        gstRatesDecimal[key] = parseFloat((val / 100).toFixed(4))
      })

      const payload = {
        limits: { ...limits },
        gst_rates: gstRatesDecimal,
        risk_thresholds: { ...riskThresholds },
      }

      await updatePolicy(payload, token)
      setSuccess('Policy updated successfully! Changes are now active.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    // Reset to default values
    const defaultLimits = {}
    DEFAULT_CATEGORIES.forEach(cat => {
      defaultLimits[cat.key] = cat.defaultLimit
    })
    setLimits(defaultLimits)

    const defaultGst = {}
    DEFAULT_CATEGORIES.forEach(cat => {
      defaultGst[cat.key] = DEFAULT_GST_RATES[cat.key]
    })
    setGstRates(defaultGst)

    setRiskThresholds({ high: 71, medium: 31 })
    setSuccess('')
    setError('')
  }

  if (!token) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading policy settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand transition mb-2"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-brand">Policy Settings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Configure category limits, GST rates, and risk thresholds. 
            Changes take effect immediately.
          </p>
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-400 bg-red-50 p-4 text-sm text-red-700 font-medium">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-400 bg-emerald-50 p-4 text-sm text-emerald-700 font-medium">
          {success}
        </div>
      )}

      {/* CATEGORY LIMITS */}
      <div className="rounded-2xl border border-line bg-white shadow-lg p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Category Limits</h2>
        <p className="text-sm text-slate-500 mb-6">
          Maximum claim amount allowed per category. Claims exceeding these limits will be flagged.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEFAULT_CATEGORIES.map(cat => (
            <div key={cat.key} className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                {cat.label}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  value={limits[cat.key] ?? ''}
                  onChange={(e) => handleLimitChange(cat.key, e.target.value)}
                  className="w-full rounded-xl border border-line pl-8 pr-4 py-3 text-brand font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
                  placeholder={cat.defaultLimit.toString()}
                  min="0"
                  step="100"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GST RATES */}
      <div className="rounded-2xl border border-line bg-white shadow-lg p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">GST Rates</h2>
        <p className="text-sm text-slate-500 mb-6">
          GST percentage rates for each category. Enter as whole numbers (e.g., 18 for 18%).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEFAULT_CATEGORIES.map(cat => (
            <div key={cat.key} className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                {cat.label}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={gstRates[cat.key] ?? ''}
                  onChange={(e) => handleGstChange(cat.key, e.target.value)}
                  className="w-full rounded-xl border border-line pr-10 pl-4 py-3 text-brand font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
                  placeholder={DEFAULT_GST_RATES[cat.key].toString()}
                  min="0"
                  max="100"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RISK THRESHOLDS */}
      <div className="rounded-2xl border border-line bg-white shadow-lg p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Risk Score Thresholds</h2>
        <p className="text-sm text-slate-500 mb-6">
          Score boundaries for risk level classification (0-100 scale).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Medium Risk Threshold
            </label>
            <input
              type="number"
              value={riskThresholds.medium ?? ''}
              onChange={(e) => handleThresholdChange('medium', e.target.value)}
              className="w-full rounded-xl border border-line px-4 py-3 text-brand font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
              placeholder="31"
              min="1"
              max="99"
            />
            <p className="text-xs text-slate-500">
              Scores from {riskThresholds.medium ?? 31} to {(riskThresholds.high ?? 71) - 1} → MEDIUM risk
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              High Risk Threshold
            </label>
            <input
              type="number"
              value={riskThresholds.high ?? ''}
              onChange={(e) => handleThresholdChange('high', e.target.value)}
              className="w-full rounded-xl border border-line px-4 py-3 text-brand font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
              placeholder="71"
              min="2"
              max="100"
            />
            <p className="text-xs text-slate-500">
              Scores ≥ {riskThresholds.high ?? 71} → HIGH risk
            </p>
          </div>
        </div>

        {/* Visual indicator */}
        <div className="mt-6">
          <div className="flex h-8 rounded-lg overflow-hidden border border-line">
            <div 
              className="bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold transition-all"
              style={{ width: `${(riskThresholds.medium || 31)}%` }}
            >
              LOW
            </div>
            <div 
              className="bg-amber-500 flex items-center justify-center text-white text-xs font-semibold transition-all"
              style={{ width: `${(riskThresholds.high || 71) - (riskThresholds.medium || 31)}%` }}
            >
              MEDIUM
            </div>
            <div 
              className="bg-red-500 flex items-center justify-center text-white text-xs font-semibold transition-all"
              style={{ width: `${100 - (riskThresholds.high || 71)}%` }}
            >
              HIGH
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>0</span>
            <span>{riskThresholds.medium ?? 31}</span>
            <span>{riskThresholds.high ?? 71}</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          <RotateCcw size={16} />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl border border-brand bg-brand text-white px-6 py-3 text-sm font-semibold hover:bg-brand/90 transition disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
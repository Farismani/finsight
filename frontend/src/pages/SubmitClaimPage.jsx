import { useEffect, useMemo, useState } from 'react'
import { Camera, CheckCircle2, LoaderCircle, Send, Upload, WandSparkles } from 'lucide-react'

import ClaimResultPanel from '../components/ClaimResultPanel'
import { extractReceiptData, submitClaim } from '../services/api'

const initialForm = {
  employee: '',
  category: 'travel',
  amount: '',
  gst: '',
  vendor: '',
}

const ocrInitialForm = {
  employee: 'Aisha Khan',
  category: 'travel',
  amount: '',
  gst: '',
  vendor: '',
}

export default function SubmitClaimPage() {
  const [mode, setMode] = useState('ocr')
  const [form, setForm] = useState(ocrInitialForm)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [ocrResult, setOcrResult] = useState(null)
  const [ocrError, setOcrError] = useState('')
  const [ocrStatus, setOcrStatus] = useState('')

  const missingFields = useMemo(() => {
    if (!ocrResult) {
      return new Set()
    }

    const parsed = ocrResult.parsed ?? {}
    return new Set(
      [
        !parsed.vendor || parsed.vendor === 'Unknown Vendor' ? 'vendor' : '',
        !parsed.amount ? 'amount' : '',
        parsed.gst === undefined || parsed.gst === null ? 'gst' : '',
        !parsed.category ? 'category' : '',
      ].filter(Boolean),
    )
  }, [ocrResult])
  const hasRequiredClaimData =
    form.employee.trim() &&
    form.vendor.trim() &&
    form.category &&
    form.amount !== '' &&
    form.gst !== ''
  const canSubmitClaim = Boolean(hasRequiredClaimData) && !loading && !ocrLoading

  const steps = useMemo(
    () => [
      {
        key: 'upload',
        label: 'Upload',
        description: 'Attach a receipt image',
        active: Boolean(selectedFile),
      },
      {
        key: 'processing',
        label: 'Processing',
        description: 'OCR scans the bill',
        active: ocrLoading,
      },
      {
        key: 'done',
        label: 'Data Extracted',
        description: 'Review detected values',
        active: Boolean(ocrResult),
      },
      {
        key: 'ready',
        label: 'Ready to Submit',
        description: 'Analyze the claim',
        active: Boolean(ocrResult) && !ocrLoading,
      },
    ],
    [ocrLoading, ocrResult, selectedFile],
  )

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('')
      return undefined
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(nextPreviewUrl)

    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [selectedFile])

  function applyExtractedClaimData(parsed = {}) {
    setForm((current) => ({
      ...current,
      employee: current.employee || ocrInitialForm.employee,
      vendor: parsed.vendor || current.vendor,
      amount: typeof parsed.amount === 'number' ? String(parsed.amount) : current.amount,
      gst: typeof parsed.gst === 'number' ? String(parsed.gst) : current.gst,
      category: parsed.category || current.category,
    }))
  }

  async function handleSubmitClaim(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await submitClaim({
        ...form,
        amount: Number(form.amount),
        gst: Number(form.gst),
      })
      setResult(response)
      setForm(mode === 'ocr' ? ocrInitialForm : initialForm)
      setOcrResult(null)
      setSelectedFile(null)
      setOcrStatus('')
    } catch (submissionError) {
      setError(submissionError.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSelectedFile(file)
    setOcrResult(null)
    setOcrError('')
    setError('')
    setOcrStatus('')
  }

  function handleModeChange(nextMode) {
    setMode(nextMode)
    setForm(nextMode === 'ocr' ? ocrInitialForm : initialForm)
    setResult(null)
    setError('')
    setOcrError('')
    setOcrResult(null)
    setSelectedFile(null)
    setOcrStatus('')
  }

  async function handleUploadBill() {
    if (!selectedFile) {
      setOcrError('Choose a bill image first.')
      return
    }

    let statusTimer
    try {
      setOcrLoading(true)
      setOcrStatus('Scanning bill...')
      setOcrError('')
      setError('')
      statusTimer = window.setTimeout(() => setOcrStatus('Extracting data...'), 500)
      const response = await extractReceiptData(selectedFile)
      const parsed = response.parsed ?? {}
      setOcrResult(response)
      applyExtractedClaimData(parsed)
      if (response.success === false) {
        setOcrError(response.message ?? 'OCR could not read the bill, so fallback values were applied.')
      }
    } catch (uploadError) {
      setOcrError(uploadError.message)
    } finally {
      window.clearTimeout(statusTimer)
      setOcrLoading(false)
      setOcrStatus('')
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="glass-panel p-6">
        <div>
          <p className="text-sm text-slate-500 font-medium">Claim submission</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-brand">Submit a reimbursement claim</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            FinSight instantly evaluates policy compliance, GST accuracy, and composite risk as soon as the finance request is sent.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            ['ocr', 'Upload Bill', 'Scan a bill and review extracted fields.'],
            ['manual', 'Manual Entry', 'Enter claim details yourself.'],
          ].map(([key, label, description]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleModeChange(key)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                mode === key
                  ? 'border-brand bg-brand/10 text-brand font-semibold'
                  : 'border-line bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-sm font-medium">{label}</span>
              <span className="mt-1 block text-xs text-slate-500">{description}</span>
            </button>
          ))}
        </div>

        {mode === 'ocr' ? (
        <div className="mt-6 rounded-2xl border border-line bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-brand">Receipt OCR</p>
              <p className="mt-1 text-sm text-slate-600">Upload a bill to auto-fill vendor, amount, GST, and category.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              <WandSparkles className="h-3.5 w-3.5" />
              {ocrLoading ? ocrStatus || 'Scanning bill...' : 'Smart autofill ready'}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-brand/40 bg-brand/5 px-4 py-3 text-sm font-semibold text-brand transition hover:bg-brand/10">
              <Upload className="h-4 w-4" />
              Choose Bill
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <Camera className="h-4 w-4" />
              Take Photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            </label>

            <button
              type="button"
              disabled={!selectedFile || ocrLoading}
              onClick={handleUploadBill}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ocrLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload Bill
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`rounded-2xl border px-4 py-3 transition ${
                  step.active
                    ? 'border-brand bg-brand/10 text-brand font-semibold'
                    : 'border-line bg-white text-slate-500'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      step.active ? 'bg-brand text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {index + 1}
                  </span>
                  {step.label}
                </div>
                <p className="mt-2 text-xs text-slate-500">{step.description}</p>
              </div>
            ))}
          </div>

          {previewUrl ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
              <img src={previewUrl} alt="Uploaded receipt preview" className="h-52 w-full object-cover" />
            </div>
          ) : null}

          {ocrError ? (
            <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-50 p-3 text-sm text-red-600 font-medium">
              {ocrError}
            </div>
          ) : null}

          {ocrResult ? (
            <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Bill scanned successfully
              </div>
              <p className="mt-2 text-sm text-emerald-700/80">Review the autofilled form, then click Analyze Claim when ready.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Vendor', ocrResult.parsed.vendor || 'Not detected'],
                  ['Amount', ocrResult.parsed.amount ?? 'Not detected'],
                  ['GST', ocrResult.parsed.gst ?? 'Not detected'],
                  ['Category', ocrResult.parsed.category || 'travel'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={`rounded-2xl border p-3 ${
                      missingFields.has(label.toLowerCase())
                        ? 'border-orange-400/40 bg-orange-50'
                        : 'border-line bg-white'
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-brand">{value}</p>
                    {missingFields.has(label.toLowerCase()) ? (
                      <p className="mt-1 text-xs text-orange-600 font-medium">Optional correction recommended.</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        ) : null}

        <form className="mt-8 space-y-4" onSubmit={handleSubmitClaim}>
          {[
            ['employee', 'Employee', 'Aisha Khan'],
            ['vendor', 'Vendor', 'Acme Travel'],
          ].map(([key, label, placeholder]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm text-slate-600 font-semibold">{label}</span>
              <input
                required
                value={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                className={`w-full rounded-2xl border px-4 py-3 text-brand outline-none placeholder:text-slate-400 ${
                  missingFields.has(key) ? 'border-orange-400/50 bg-orange-50' : 'border-line bg-white'
                }`}
                placeholder={placeholder}
              />
            </label>
          ))}

          <label className="block">
            <span className="mb-2 block text-sm text-slate-600 font-semibold">Category</span>
            <select
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              className={`w-full rounded-2xl border px-4 py-3 text-brand outline-none ${
                missingFields.has('category') ? 'border-orange-400/50 bg-orange-50' : 'border-line bg-white'
              }`}
            >
              <option value="travel">Travel</option>
              <option value="meals">Meals</option>
              <option value="accommodation">Accommodation</option>
              <option value="office_supplies">Office Supplies</option>
              <option value="training">Training</option>
              <option value="medical">Medical</option>
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['amount', 'Amount', '4200'],
              ['gst', 'GST', '756'],
            ].map(([key, label, placeholder]) => (
              <label key={key} className="block">
                <span className="mb-2 block text-sm text-slate-600 font-semibold">{label}</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form[key]}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className={`w-full rounded-2xl border px-4 py-3 text-brand outline-none placeholder:text-slate-400 ${
                    missingFields.has(key) ? 'border-orange-400/50 bg-orange-50' : 'border-line bg-white'
                  }`}
                  placeholder={placeholder}
                />
              </label>
            ))}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-50 p-3 text-sm text-red-600 font-medium">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmitClaim}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? 'Analyzing claim...' : 'Analyze Claim'}
          </button>
        </form>
      </section>

      <ClaimResultPanel result={result} />
    </div>
  )
}

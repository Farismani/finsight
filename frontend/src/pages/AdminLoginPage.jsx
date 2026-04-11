import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'

import { adminLogin } from '../services/api'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await adminLogin(credentials)
      localStorage.setItem('finsight_admin_token', response.token)
      navigate('/admin', { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[620px] max-w-md items-center">
      <form onSubmit={handleSubmit} className="glass-panel w-full p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <p className="mt-5 text-sm text-slate-400">Admin access</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-white">Sign in to review claims</h1>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-400">Username</span>
            <input
              required
              value={credentials.username}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, username: event.target.value }))
              }
              className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              placeholder="admin"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-400">Password</span>
            <input
              required
              type="password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, password: event.target.value }))
              }
              className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              placeholder="admin123"
            />
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-cyan-300 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

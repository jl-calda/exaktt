// src/app/auth/login/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [mode, setMode]       = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [sent, setSent]       = useState(false)

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false) }
      else router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } })
      if (error) { setError(error.message); setLoading(false) }
      else setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white text-xl font-bold mb-4 shadow-float"
            style={{ background: 'var(--color-primary)' }}>
            E
          </div>
          <h1 className="font-bold text-2xl text-ink" style={{ letterSpacing: '-0.025em' }}>Exaktt</h1>
          <p className="text-xs text-ink-muted mt-1">Precision Material Take-Off Platform</p>
        </div>

        <div className="card p-6 shadow-panel animate-fade-in stagger-1">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-xl bg-surface-200/40 flex items-center justify-center text-2xl mx-auto mb-3">📧</div>
              <h2 className="font-semibold text-ink text-[13px] mb-2">Check your email</h2>
              <p className="text-xs text-ink-muted">We sent a confirmation link to <strong>{email}</strong></p>
            </div>
          ) : (
            <>
              {/* Google SSO */}
              <button onClick={handleGoogle} disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-surface-300 rounded-lg px-4 py-2.5 text-xs font-semibold text-ink hover:bg-surface-100 transition-all duration-200">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-300" />
                </div>
                <div className="relative flex justify-center text-[11px] text-ink-faint">
                  <span className="bg-surface-50 px-2">or</span>
                </div>
              </div>

              {/* Email form */}
              <form onSubmit={handleEmail} className="space-y-3">
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="input" placeholder="you@company.com" required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" value={password} onChange={e => setPass(e.target.value)}
                    className="input" placeholder="••••••••" required minLength={8} />
                </div>
                {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                  {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <p className="text-center text-xs text-ink-faint mt-4">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null) }}
                  className="text-primary font-semibold hover:underline">
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

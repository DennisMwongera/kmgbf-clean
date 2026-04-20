'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Mode = 'login' | 'register' | 'reset'

export default function AuthPage() {
  const [mode,     setMode]     = useState<Mode>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [error,    setError]    = useState('')
  const [info,     setInfo]     = useState('')
  const [loading,  setLoading]  = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Full browser redirect — guarantees middleware runs fresh with new cookie
        window.location.href = '/dashboard'

      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name.trim() } },
        })
        if (error) throw error
        if (data.session) {
          window.location.href = '/dashboard'
        } else {
          setInfo('Account created! Check your email to confirm, then sign in.')
        }

      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        })
        if (error) throw error
        setInfo('Reset link sent — check your inbox.')
      }
    } catch (err: any) {
      const m: string = err?.message ?? 'An error occurred'
      if (m.includes('Invalid login credentials'))  setError('Incorrect email or password.')
      else if (m.includes('User already registered')) setError('Email already registered. Sign in instead.')
      else if (m.includes('Email not confirmed'))     setError('Confirm your email first, then sign in.')
      else if (m.includes('Database error'))          setError('Account setup failed. Try again or contact your admin.')
      else setError(m)
    } finally {
      setLoading(false)
    }
  }

  function sw(m: Mode) { setMode(m); setError(''); setInfo('') }

  return (
    <div className="min-h-screen flex" style={{ background: '#f6f3ee' }}>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[400px] shrink-0 p-10"
        style={{ background: '#0f2d1c' }}>
        <div>
          <div className="inline-block mb-3 px-2 py-0.5 rounded text-[9px] font-bold tracking-[2px] uppercase"
            style={{ background:'rgba(82,183,136,.2)', color:'#95d5b2', border:'1px solid rgba(82,183,136,.3)' }}>
            CBD · KMGBF · 2030
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, color:'white', lineHeight:1.2, marginBottom:12 }}>
            Capacity Needs Assessment Tool
          </h1>
          <p style={{ color:'rgba(149,213,178,.7)', fontSize:13.5, lineHeight:1.7 }}>
            Assess, track and report institutional capacity for implementing the
            Kunming-Montreal Global Biodiversity Framework targets.
          </p>
        </div>
        <div>
          {['50 core indicators across 8 dimensions','All 23 KMGBF targets','Live dashboards and radar charts','Export to XLSX, PDF, JSON, CSV','Role-based access control'].map(l => (
            <div key={l} className="flex items-center gap-3 mb-3 text-[13px]" style={{ color:'rgba(255,255,255,.6)' }}>
              <span>✓</span>{l}
            </div>
          ))}
          <p className="mt-6 text-[10px]" style={{ color:'rgba(255,255,255,.2)' }}>
            Convention on Biological Diversity · © 2025 KMGBF CNA Tool
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          <div className="bg-white rounded-2xl p-8 border border-sand-300"
            style={{ boxShadow:'0 4px 24px rgba(15,45,28,.1)' }}>

            <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'#0f2d1c', marginBottom:4 }}>
              {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Reset password'}
            </h2>
            <p className="text-[13px] text-forest-400 mb-5">
              {mode === 'login' ? 'Access your KMGBF CNA workspace.'
               : mode === 'register' ? 'Create your account to begin an assessment.'
               : 'Enter your email to receive a reset link.'}
            </p>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl text-[13px] flex gap-2 items-start"
                style={{ background:'#fee2e2', color:'#dc2626' }}>
                <span>⚠️</span><span>{error}</span>
              </div>
            )}
            {info && (
              <div className="mb-4 p-3.5 rounded-xl text-[13px] flex gap-2 items-start"
                style={{ background:'#dcfce7', color:'#15803d' }}>
                <span>✅</span><span>{info}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold text-forest-400 uppercase tracking-wide mb-1.5">Full Name *</label>
                  <input className="form-input" type="text" value={name}
                    onChange={e => setName(e.target.value)} placeholder="Your full name"
                    required autoComplete="name" />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold text-forest-400 uppercase tracking-wide mb-1.5">Email *</label>
                <input className="form-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="your.email@institution.org"
                  required autoComplete="email" />
              </div>
              {mode !== 'reset' && (
                <div>
                  <label className="block text-[11px] font-bold text-forest-400 uppercase tracking-wide mb-1.5">Password *</label>
                  <input className="form-input" type="password" value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters"
                    required minLength={8}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                </div>
              )}
              <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-3 text-[14px] mt-1"
                style={{ opacity: loading ? 0.7 : 1 }}>
                {loading
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Please wait…</span>
                  : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-sand-300 text-center space-y-2 text-[12.5px]">
              {mode === 'login' && <>
                <button onClick={() => sw('register')} className="block w-full text-forest-500 hover:text-forest-700 font-medium">Don't have an account? Register</button>
                <button onClick={() => sw('reset')}    className="block w-full text-forest-400 hover:text-forest-600">Forgot password?</button>
              </>}
              {mode !== 'login' && (
                <button onClick={() => sw('login')} className="text-forest-500 hover:text-forest-700 font-medium">← Back to sign in</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

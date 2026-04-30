'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Mode = 'login' | 'register' | 'reset'

const ROLES = [
  { value:'contributor',      label:'Contributor',      desc:'Fills in assessment data' },
  { value:'institution_lead', label:'Institution Lead', desc:'Manages institution settings' },
  { value:'viewer',           label:'Viewer',           desc:'Read-only access to reports' },
]

interface Institution { id: string; name: string; type: string|null; level: string|null }

// Isolated component so useSearchParams is inside a Suspense boundary
function IdleBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('reason') !== 'idle') return null
  return (
    <div style={{
      position:'fixed', top:16, left:'50%', transform:'translateX(-50%)',
      background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:10,
      padding:'12px 20px', fontSize:13, color:'#92400e', zIndex:100,
      boxShadow:'0 4px 12px rgba(0,0,0,.1)', whiteSpace:'nowrap',
    }}>
      ⏱ Your session expired due to inactivity. Please sign in again.
    </div>
  )
}

export default function AuthPage() {
  const [mode,         setMode]         = useState<Mode>('login')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [name,         setName]         = useState('')
  const [role,         setRole]         = useState('contributor')
  const [instId,       setInstId]       = useState('')
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [error,        setError]        = useState('')
  const [info,         setInfo]         = useState('')
  const [loading,      setLoading]      = useState(false)
  const [instsLoading, setInstsLoading] = useState(false)

  useEffect(() => {
    if (mode !== 'register') return
    setInstsLoading(true)
    supabase.from('institutions').select('id, name, type, level').order('name')
      .then(({ data }) => { setInstitutions(data ?? []); setInstsLoading(false) })
  }, [mode])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/dashboard'

      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name.trim(), institution_id: instId || null } },
        })
        if (error) throw error
        if (data.user && instId) {
          await supabase.from('user_profiles').update({ institution_id: instId }).eq('id', data.user.id)
        }
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
      if (m.includes('Invalid login credentials'))    setError('Incorrect email or password.')
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
    <div className="min-h-screen flex" style={{ background:'#f6f3ee' }}>

      {/* Idle timeout toast — Suspense required for useSearchParams */}
      <Suspense fallback={null}>
        <IdleBanner/>
      </Suspense>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[400px] shrink-0 p-10" style={{ background:'#0f2d1c' }}>
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
          {[
            '50 core indicators across 8 dimensions',
            'All 23 KMGBF targets',
            'Live dashboards and radar charts',
            'Export to XLSX, PDF, JSON, CSV',
            'Multi-institution with role-based access',
          ].map(l => (
            <div key={l} className="flex items-center gap-3 mb-3 text-[13px]" style={{ color:'rgba(255,255,255,.6)' }}>
              <span style={{ color:'#52b788' }}>✓</span>{l}
            </div>
          ))}
          <p className="mt-6 text-[10px]" style={{ color:'rgba(255,255,255,.2)' }}>
            Convention on Biological Diversity · © 2026 KMGBF CNA Tool
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[440px]">
          <div className="bg-white rounded-2xl p-8 border border-sand-300" style={{ boxShadow:'0 4px 24px rgba(15,45,28,.1)' }}>

            <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'#0f2d1c', marginBottom:4 }}>
              {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Reset password'}
            </h2>
            <p className="text-[13px] text-forest-400 mb-5">
              {mode === 'login'    ? 'Access your KMGBF CNA workspace.'
               : mode === 'register' ? 'Create your account to begin an assessment.'
               : 'Enter your email to receive a reset link.'}
            </p>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl text-[13px] flex gap-2" style={{ background:'#fee2e2', color:'#dc2626' }}>
                <span>⚠️</span><span>{error}</span>
              </div>
            )}
            {info && (
              <div className="mb-4 p-3.5 rounded-xl text-[13px] flex gap-2" style={{ background:'#dcfce7', color:'#15803d' }}>
                <span>✅</span><span>{info}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-forest-400 uppercase tracking-wide mb-1.5">Full Name *</label>
                    <input className="form-input" type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Your full name" required autoComplete="name"/>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-forest-400 uppercase tracking-wide mb-1.5">Institution</label>
                    {instsLoading ? (
                      <div className="form-input text-[13px] text-forest-400">Loading institutions…</div>
                    ) : institutions.length === 0 ? (
                      <div className="p-3 rounded-xl text-[12.5px] text-forest-400" style={{ background:'#f6f3ee', border:'1px solid #e8e3da' }}>
                        No institutions available yet. An admin will link you after signup.
                      </div>
                    ) : (
                      <select className="form-input" value={instId} onChange={e => setInstId(e.target.value)}>
                        <option value="">— Select your institution —</option>
                        {institutions.map(i => (
                          <option key={i.id} value={i.id}>
                            {i.name}{i.level ? ` (${i.level})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-[11px] text-forest-400 mt-1">If your institution isn't listed, an admin will assign you.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-forest-400 uppercase tracking-wide mb-1.5">I will be a…</label>
                    <div className="flex flex-col gap-2">
                      {ROLES.map(r => (
                        <label key={r.value}
                          className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                          style={{ borderColor:role===r.value?'#2d6a4f':'#e8e3da', background:role===r.value?'#f0faf4':'white' }}>
                          <input type="radio" name="role" value={r.value} checked={role===r.value}
                            onChange={() => setRole(r.value)} className="mt-0.5"/>
                          <div>
                            <div className="text-[13px] font-semibold text-forest-700">{r.label}</div>
                            <div className="text-[11.5px] text-forest-400">{r.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-[11px] text-forest-400 mt-2">ℹ️ All accounts start as Contributor. Admin assigns final roles.</p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-forest-400 uppercase tracking-wide mb-1.5">Email *</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@institution.org" required autoComplete="email"/>
              </div>

              {mode !== 'reset' && (
                <div>
                  <label className="block text-[11px] font-bold text-forest-400 uppercase tracking-wide mb-1.5">Password *</label>
                  <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters" required minLength={8}
                    autoComplete={mode==='login'?'current-password':'new-password'}/>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="btn btn-primary w-full justify-center py-3 text-[14px] mt-1"
                style={{ opacity:loading?0.7:1 }}>
                {loading
                  ? <span className="flex items-center gap-2 justify-center">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      Please wait…
                    </span>
                  : mode==='login' ? 'Sign In' : mode==='register' ? 'Create Account' : 'Send Reset Link'}
              </button>

            </form>

            <div className="mt-5 pt-5 border-t border-sand-300 text-center space-y-2 text-[12.5px]">
              {mode === 'login' && (
                <>
                  <button onClick={() => sw('register')} className="block w-full text-forest-500 hover:text-forest-700 font-medium">
                    Don't have an account? Register
                  </button>
                  <button onClick={() => sw('reset')} className="block w-full text-forest-400 hover:text-forest-600">
                    Forgot password?
                  </button>
                </>
              )}
              {mode !== 'login' && (
                <button onClick={() => sw('login')} className="text-forest-500 hover:text-forest-700 font-medium">
                  ← Back to sign in
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}
'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────
interface Country { id: string; name: string; code: string; region: string | null }
interface Institution { id: string; name: string; type: string | null; level: string | null }

type AuthMode = 'signin' | 'register' | 'forgot'
type RegisterStep = 'credentials' | 'location' | 'confirm'

// ─── Step indicator ───────────────────────────────────────────
function StepIndicator({ step }: { step: RegisterStep }) {
  const steps = [
    { id: 'credentials', label: 'Account' },
    { id: 'location',    label: 'Organisation' },
    { id: 'confirm',     label: 'Confirm' },
  ]
  const idx = steps.findIndex(s => s.id === step)
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
              style={{
                background: i < idx ? '#52b788' : i === idx ? '#1b4332' : '#e8e3da',
                color: i <= idx ? 'white' : '#9ca3af',
              }}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className="text-[10px] font-medium" style={{ color: i === idx ? '#1b4332' : '#9ca3af' }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-16 h-0.5 mb-4 mx-1 transition-all"
              style={{ background: i < idx ? '#52b788' : '#e8e3da' }}/>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main auth page ───────────────────────────────────────────
export default function AuthPage() {
  const [mode,        setMode]        = useState<AuthMode>('signin')
  const [step,        setStep]        = useState<RegisterStep>('credentials')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')

  const searchParams = useSearchParams()

  // Show middleware redirect errors on mount
  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'pending')   setError('Your account is pending activation by a country admin.')
    if (err === 'suspended') setError('Your account has been suspended. Contact your country admin.')
  }, [])

  // Credentials
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [fullName,    setFullName]    = useState('')

  // Location
  const [countries,     setCountries]     = useState<Country[]>([])
  const [institutions,  setInstitutions]  = useState<Institution[]>([])
  const [countryId,     setCountryId]     = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [newInstName,   setNewInstName]   = useState('')
  const [addingNew,     setAddingNew]     = useState(false)
  const [loadingInsts,  setLoadingInsts]  = useState(false)

  // Load countries on mount
  useEffect(() => {
    supabase.from('countries')
      .select('id, name, code, region')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setCountries(data ?? []))
  }, [])

  // Load institutions when country changes
  useEffect(() => {
    if (!countryId) { setInstitutions([]); setInstitutionId(''); return }
    setLoadingInsts(true)
    setInstitutionId('')
    supabase.rpc('get_institutions_by_country', { p_country_id: countryId })
      .then(({ data }) => {
        setInstitutions(data ?? [])
        setLoadingInsts(false)
      })
  }, [countryId])

  // ── Sign in ──────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    // Check account status
    const { data: profile } = await supabase
      .from('user_profiles').select('status, role').eq('id', data.user.id).single()
    if (profile?.status === 'pending') {
      await supabase.auth.signOut()
      setError('Your account is pending activation. A country admin will activate it shortly.')
      setLoading(false); return
    }
    if (profile?.status === 'suspended') {
      await supabase.auth.signOut()
      setError('Your account has been suspended. Contact your country admin.')
      setLoading(false); return
    }
    window.location.href = '/dashboard'
  }

  // ── Register step 1 → 2 ─────────────────────────────────────
  function handleCredentialsNext(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!fullName.trim()) { setError('Please enter your full name'); return }
    if (!email.trim())    { setError('Please enter your email'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setStep('location')
  }

  // ── Register step 2 → 3 ─────────────────────────────────────
  function handleLocationNext(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!countryId) { setError('Please select your country'); return }
    if (!institutionId && !newInstName.trim()) {
      setError('Please select your organisation or enter a new one'); return
    }
    setStep('confirm')
  }

  // ── Final register ───────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      const userId = authData.user.id
      let finalInstId = institutionId

      // 2. Create new institution if needed (via validated RPC)
      if (addingNew && newInstName.trim()) {
        const { data: newInstId, error: instError } = await supabase
          .rpc('create_institution_for_country', {
            p_name:       newInstName.trim(),
            p_country_id: countryId,
          })
        if (instError) throw instError
        finalInstId = newInstId
      }

      // 3. Update user profile with country + institution
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name:      fullName,
          country_id:     countryId,
          institution_id: finalInstId || null,
          role:           'contributor',
          status:         'pending',
        })
        .eq('id', userId)

      if (profileError) throw profileError

      setSuccess('Account created! Check your email to confirm your address. A country admin will then activate your account before you can sign in.')
      setMode('signin')
    } catch (err: any) {
      setError(err.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot password ──────────────────────────────────────────
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    if (error) { setError(error.message) }
    else { setSuccess('Password reset email sent. Check your inbox.') }
    setLoading(false)
  }

  const selectedCountry = countries.find(c => c.id === countryId)
  const selectedInst    = institutions.find(i => i.id === institutionId)

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f2d1c 0%, #1b4332 50%, #2d6a4f 100%)' }}>

      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:'absolute', top:'-20%', right:'-10%', width:600, height:600, borderRadius:'50%', background:'rgba(82,183,136,.06)', filter:'blur(80px)' }}/>
        <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:400, height:400, borderRadius:'50%', background:'rgba(64,145,108,.08)', filter:'blur(60px)' }}/>
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full"
            style={{ background:'rgba(82,183,136,.15)', border:'1px solid rgba(82,183,136,.25)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background:'#52b788' }}/>
            <span className="text-[11px] font-bold tracking-[2px] uppercase" style={{ color:'#95d5b2' }}>
              CBD · KMGBF · 2030
            </span>
          </div>
          <h1 className="text-white text-[28px] font-bold leading-tight mb-1"
            style={{ fontFamily:'var(--font-display)' }}>
            Capacity Needs<br/>Assessment Tool
          </h1>
          <p className="text-[13px]" style={{ color:'rgba(149,213,178,.6)' }}>
            Kunming-Montreal Global Biodiversity Framework
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background:'white', boxShadow:'0 32px 64px rgba(0,0,0,.3)' }}>

          {/* Success message */}
          {success && (
            <div className="mb-5 px-4 py-3 rounded-xl text-[13px] font-medium"
              style={{ background:'#d8f3dc', color:'#1b4332' }}>
              ✅ {success}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-[13px] font-medium"
              style={{ background:'#fee2e2', color:'#dc2626' }}>
              {error}
            </div>
          )}

          {/* ── SIGN IN ── */}
          {mode === 'signin' && (
            <>
              <h2 className="text-[22px] font-bold mb-6" style={{ fontFamily:'var(--font-display)', color:'#0f2d1c' }}>
                Welcome back
              </h2>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Email</label>
                  <input className="ti w-full" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required/>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Password</label>
                  <input className="ti w-full" type="password" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required/>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-[13.5px] font-bold text-white transition-all"
                  style={{ background: loading ? '#9ca3af' : '#1b4332' }}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <div className="mt-5 flex items-center justify-between text-[12.5px]">
                <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                  className="text-forest-400 hover:text-forest-600 transition-colors">
                  Forgot password?
                </button>
                <button onClick={() => { setMode('register'); setStep('credentials'); setError(''); setSuccess('') }}
                  className="font-semibold transition-colors" style={{ color:'#1b4332' }}>
                  Create account →
                </button>
              </div>
            </>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[22px] font-bold" style={{ fontFamily:'var(--font-display)', color:'#0f2d1c' }}>
                  Create account
                </h2>
                <button onClick={() => { setMode('signin'); setStep('credentials'); setError('') }}
                  className="text-[12px] text-forest-400 hover:text-forest-600">
                  ← Sign in
                </button>
              </div>

              <StepIndicator step={step}/>

              {/* Step 1: Credentials */}
              {step === 'credentials' && (
                <form onSubmit={handleCredentialsNext} className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Full Name</label>
                    <input className="ti w-full" type="text" placeholder="Dr. Jane Smith"
                      value={fullName} onChange={e => setFullName(e.target.value)} required/>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Email</label>
                    <input className="ti w-full" type="email" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} required/>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Password</label>
                    <input className="ti w-full" type="password" placeholder="Min. 8 characters"
                      value={password} onChange={e => setPassword(e.target.value)} required minLength={8}/>
                  </div>
                  <button type="submit"
                    className="w-full py-3 rounded-xl text-[13.5px] font-bold text-white transition-all"
                    style={{ background:'#1b4332' }}>
                    Next: Select Organisation →
                  </button>
                </form>
              )}

              {/* Step 2: Country + Institution */}
              {step === 'location' && (
                <form onSubmit={handleLocationNext} className="space-y-4">
                  {/* Country */}
                  <div>
                    <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Country</label>
                    <select className="ti w-full" value={countryId}
                      onChange={e => { setCountryId(e.target.value); setAddingNew(false); setNewInstName('') }}
                      style={{ appearance:'none' }}>
                      <option value="">Select your country…</option>
                      {countries.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code}){c.region ? ` — ${c.region}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Institution */}
                  {countryId && (
                    <div>
                      <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">
                        Organisation / Institution
                      </label>
                      {loadingInsts ? (
                        <div className="ti w-full text-forest-300 text-[13px]">Loading institutions…</div>
                      ) : (
                        <>
                          <select className="ti w-full" value={addingNew ? '__new__' : institutionId}
                            onChange={e => {
                              if (e.target.value === '__new__') { setAddingNew(true); setInstitutionId('') }
                              else { setAddingNew(false); setInstitutionId(e.target.value) }
                            }}
                            style={{ appearance:'none' }}>
                            <option value="">Select your institution…</option>
                            {institutions.map(i => (
                              <option key={i.id} value={i.id}>{i.name}</option>
                            ))}
                            <option value="__new__">➕ My institution is not listed</option>
                          </select>

                          {addingNew && (
                            <div className="mt-2">
                              <input className="ti w-full" type="text"
                                placeholder="Enter your institution name"
                                value={newInstName}
                                onChange={e => setNewInstName(e.target.value)}/>
                              <p className="text-[11px] text-forest-400 mt-1">
                                A new institution will be created for your country.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep('credentials')}
                      className="flex-1 py-3 rounded-xl text-[13px] font-semibold border transition-all"
                      style={{ borderColor:'#e8e3da', color:'#5c7566' }}>
                      ← Back
                    </button>
                    <button type="submit"
                      className="flex-[2] py-3 rounded-xl text-[13.5px] font-bold text-white transition-all"
                      style={{ background:'#1b4332' }}>
                      Review & Confirm →
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Confirm */}
              {step === 'confirm' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="rounded-xl p-4 space-y-3" style={{ background:'#f6f3ee' }}>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-forest-400 mb-2">
                      Review your details
                    </div>
                    {[
                      ['Name',    fullName],
                      ['Email',   email],
                      ['Country', selectedCountry?.name ?? '—'],
                      ['Organisation', addingNew ? `${newInstName} (new)` : selectedInst?.name ?? '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start gap-3">
                        <span className="text-[12px] text-forest-400 w-28 shrink-0">{label}</span>
                        <span className="text-[12.5px] font-semibold text-forest-700">{value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11.5px] text-forest-400">
                    Your account will be created as a <strong>Contributor</strong>. An admin can upgrade your role after sign-in.
                  </p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep('location')}
                      className="flex-1 py-3 rounded-xl text-[13px] font-semibold border transition-all"
                      style={{ borderColor:'#e8e3da', color:'#5c7566' }}>
                      ← Back
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex-[2] py-3 rounded-xl text-[13.5px] font-bold text-white transition-all"
                      style={{ background: loading ? '#9ca3af' : '#1b4332' }}>
                      {loading ? 'Creating account…' : 'Create Account ✓'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            <>
              <h2 className="text-[22px] font-bold mb-2" style={{ fontFamily:'var(--font-display)', color:'#0f2d1c' }}>
                Reset password
              </h2>
              <p className="text-[13px] text-forest-400 mb-6">
                Enter your email and we'll send a reset link.
              </p>
              <form onSubmit={handleForgot} className="space-y-4">
                <input className="ti w-full" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required/>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-[13.5px] font-bold text-white transition-all"
                  style={{ background: loading ? '#9ca3af' : '#1b4332' }}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <button onClick={() => { setMode('signin'); setError(''); setSuccess('') }}
                className="mt-4 text-[12.5px] text-forest-400 hover:text-forest-600 transition-colors">
                ← Back to sign in
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-[11px]" style={{ color:'rgba(149,213,178,.4)' }}>
          Convention on Biological Diversity · KMGBF CNA Tool · 2025
        </p>
      </div>
    </div>
  )
}
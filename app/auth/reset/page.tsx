'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function ResetPage() {
  const [pw, setPw]       = useState('')
  const [confirm, setC]   = useState('')
  const [error, setError] = useState('')
  const [loading, setL]   = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pw !== confirm) { setError('Passwords do not match'); return }
    setL(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) { setError(error.message); setL(false); return }
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#f6f3ee' }}>
      <div className="bg-white rounded-2xl p-8 w-full max-w-[400px] border border-sand-300" style={{ boxShadow:'0 4px 24px rgba(15,45,28,.1)' }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:'#0f2d1c', marginBottom:6 }}>Set new password</h2>
        {error && <div className="mb-4 p-3 rounded-xl text-[13px]" style={{ background:'#fee2e2', color:'#dc2626' }}>{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-forest-400 uppercase tracking-wide mb-1.5">New Password</label>
            <input className="form-input" type="password" value={pw} onChange={e => setPw(e.target.value)} required minLength={8} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-forest-400 uppercase tracking-wide mb-1.5">Confirm Password</label>
            <input className="form-input" type="password" value={confirm} onChange={e => setC(e.target.value)} required minLength={8} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-3">
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

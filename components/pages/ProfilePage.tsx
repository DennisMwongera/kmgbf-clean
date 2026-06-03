'use client'
import { useState, memo, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { getT } from '@/lib/i18n'
import { INST_TYPES_CANONICAL, INST_LEVELS_CANONICAL, toCanonical, fromCanonical } from '@/lib/utils'
import { SectionActions } from '@/components/ui'
import { supabase } from '@/lib/supabase/client'
import { Lock, Building2, Globe } from 'lucide-react'

const ProfileInput = memo(function ProfileInput({ label, fieldKey, storeValue, placeholder, type = 'text', onSave, readOnly }: {
  label: string; fieldKey: string; storeValue: string; placeholder?: string; type?: string
  onSave: (k: string, v: string) => void; readOnly?: boolean
}) {
  const [val, setVal] = useState(storeValue)
  // Sync if storeValue changes from outside
  useEffect(() => { setVal(storeValue) }, [storeValue])
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">{label}</label>
      <input
        className="form-input"
        type={type}
        value={val}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={e => setVal(e.target.value)}
        onBlur={e  => onSave(fieldKey, e.target.value)}
        placeholder={placeholder}
        style={readOnly ? { background:'#f6f3ee', cursor:'not-allowed', color:'#5c7566' } : undefined}
      />
    </div>
  )
})

export default function ProfilePage() {
  const profile       = useStore(s => s.assessment.profile)
  const updateProfile = useStore(s => s.updateProfile)
  const navigate      = useStore(s => s.navigate)
  const lang          = useStore(s => s.lang)
  const t             = getT(lang ?? 'en')
  const p             = t.profile

  const [mandate,      setMandate]      = useState(profile.mandate)
  const [userRole,     setUserRole]     = useState<string>('contributor')
  const [countryName,  setCountryName]  = useState('')
  const [instLinked,   setInstLinked]   = useState<any>(null)
  const [loading,      setLoading]      = useState(true)

  // Resolve who the user is and what institution they belong to
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('user_profiles')
        .select('role, institution_id, country_id')
        .eq('id', user.id).single()

      if (cancelled || !prof) return
      setUserRole(prof.role ?? 'contributor')

      // Load the institution the user was registered into
      if (prof.institution_id) {
        const { data: inst } = await supabase
          .from('institutions')
          .select('id, name, type, level, country_id')
          .eq('id', prof.institution_id).single()
        if (!cancelled && inst) setInstLinked(inst)
      }

      // Load country name
      if (prof.country_id) {
        const { data: country } = await supabase
          .from('countries').select('name').eq('id', prof.country_id).single()
        if (!cancelled && country) setCountryName(country.name)
      }

      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Sync mandate when profile changes from outside
  useEffect(() => { setMandate(profile.mandate) }, [profile.mandate])

  // Only institution_lead and admins can edit
  const canEdit = ['institution_lead','admin','country_admin','super_admin'].includes(userRole)
  const readOnly = !canEdit

  // Wrapper that blocks updates from non-editors
  function safeUpdate(key: string, value: string) {
    if (readOnly) return
    updateProfile(key, value)
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c', lineHeight:1.1 }}>{p.title}</h2>
        <p className="text-[13.5px] text-forest-400 mt-1.5">{p.desc}</p>
      </div>

      {/* Institution context banner */}
      {instLinked && (
        <div className="card mb-4" style={{ background:'#f0faf4', border:'1px solid #d8f3dc' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background:'#d8f3dc' }}>
                <Building2 size={20} style={{ color:'#2d6a4f' }}/>
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-0.5">
                  Your Institution
                </div>
                <div className="text-[15px] font-bold text-forest-700">{instLinked.name}</div>
                <div className="text-[11.5px] text-forest-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  {instLinked.type && <span>{instLinked.type}</span>}
                  {instLinked.level && <><span>·</span><span>{instLinked.level}</span></>}
                  {countryName && <><span>·</span><Globe size={11}/><span>{countryName}</span></>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-0.5">
                Your Role
              </div>
              <span className="chip text-[11px]" style={{
                background: canEdit ? '#d8f3dc' : '#fef3c7',
                color:      canEdit ? '#1b4332' : '#d97706',
              }}>
                {userRole.replace(/_/g,' ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Read-only warning for contributors and viewers */}
      {!loading && readOnly && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background:'#fef3c7', border:'1px solid #fde68a' }}>
          <Lock size={16} style={{ color:'#d97706', flexShrink:0, marginTop:2 }}/>
          <div>
            <div className="text-[12.5px] font-bold" style={{ color:'#d97706' }}>
              Read-only access
            </div>
            <div className="text-[11.5px] mt-0.5" style={{ color:'#92400e' }}>
              Only your institution lead can update the institution profile.
              You can still view all fields and contribute to the assessment.
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="text-[10px] font-bold tracking-[1.8px] uppercase pb-2 mb-4 border-b-2"
          style={{color:'#40916c',borderColor:'#d8f3dc'}}>{p.basicInfo}</div>
        <div className="grid grid-cols-2 gap-3.5 mb-3.5">
          <ProfileInput label={p.instName + ' *'} fieldKey="name"
            storeValue={profile.name || instLinked?.name || ''}
            placeholder={p.instNamePh} onSave={safeUpdate} readOnly={readOnly}/>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">{p.type}</label>
            <select className="form-input"
              disabled={readOnly}
              value={fromCanonical(INST_TYPES_CANONICAL, p.types, profile.type || instLinked?.type || '')}
              onChange={e => safeUpdate('type', toCanonical(p.types, e.target.value, INST_TYPES_CANONICAL))}
              style={readOnly ? { background:'#f6f3ee', cursor:'not-allowed', color:'#5c7566' } : undefined}>
              <option value="">{t.common.selectDots}</option>
              {p.types.map(tp => <option key={tp}>{tp}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">{p.level}</label>
            <select className="form-input"
              disabled={readOnly}
              value={fromCanonical(INST_LEVELS_CANONICAL, p.levels, profile.level || instLinked?.level || '')}
              onChange={e => safeUpdate('level', toCanonical(p.levels, e.target.value, INST_LEVELS_CANONICAL))}
              style={readOnly ? { background:'#f6f3ee', cursor:'not-allowed', color:'#5c7566' } : undefined}>
              <option value="">{t.common.selectDots}</option>
              {p.levels.map(lv => <option key={lv}>{lv}</option>)}
            </select>
          </div>

          <ProfileInput label={p.scope} fieldKey="scope" storeValue={profile.scope}
            placeholder={p.scopePh} onSave={safeUpdate} readOnly={readOnly}/>
        </div>

        <div className="flex flex-col gap-1.5 mb-6">
          <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">{p.mandate}</label>
          <textarea
            className="form-input"
            rows={3}
            value={mandate}
            disabled={readOnly}
            onChange={e => setMandate(e.target.value)}
            onBlur={e  => safeUpdate('mandate', e.target.value)}
            placeholder={p.mandatePh}
            style={readOnly ? { background:'#f6f3ee', cursor:'not-allowed', color:'#5c7566' } : undefined}
          />
        </div>

        <div className="text-[10px] font-bold tracking-[1.8px] uppercase pb-2 mb-4 border-b-2"
          style={{color:'#40916c',borderColor:'#d8f3dc'}}>{p.contact}</div>
        <div className="grid grid-cols-2 gap-3.5">
          <ProfileInput label={p.focalName}  fieldKey="focalName"  storeValue={profile.focalName}
            placeholder={p.focalNamePh} onSave={safeUpdate} readOnly={readOnly}/>
          <ProfileInput label={p.focalTitle} fieldKey="focalTitle" storeValue={profile.focalTitle}
            placeholder={p.focalTitlePh} onSave={safeUpdate} readOnly={readOnly}/>
          <ProfileInput label={p.focalEmail} fieldKey="focalEmail" storeValue={profile.focalEmail}
            placeholder={p.focalEmail} type="email" onSave={safeUpdate} readOnly={readOnly}/>
          <ProfileInput label={p.assessDate} fieldKey="assessDate" storeValue={profile.assessDate}
            type="date" onSave={safeUpdate} readOnly={readOnly}/>
        </div>
        <SectionActions>
          <button className="btn btn-primary" onClick={() => navigate('core')}>
            {readOnly ? 'Continue →' : t.common.saveAndContinue}
          </button>
        </SectionActions>
      </div>
    </div>
  )
}
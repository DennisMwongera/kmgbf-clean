'use client'
import { useState, memo } from 'react'
import { useStore } from '@/lib/store'
import { getT } from '@/lib/i18n'
import { SectionActions } from '@/components/ui'

const ProfileInput = memo(function ProfileInput({ label, fieldKey, storeValue, placeholder, type = 'text', onSave }: {
  label: string; fieldKey: string; storeValue: string; placeholder?: string; type?: string
  onSave: (k: string, v: string) => void
}) {
  const [val, setVal] = useState(storeValue)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">{label}</label>
      <input className="form-input" type={type} value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={e  => onSave(fieldKey, e.target.value)}
        placeholder={placeholder}/>
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

  const [mandate, setMandate] = useState(profile.mandate)

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c', lineHeight:1.1 }}>{p.title}</h2>
        <p className="text-[13.5px] text-forest-400 mt-1.5">{p.desc}</p>
      </div>
      <div className="card">
        <div className="text-[10px] font-bold tracking-[1.8px] uppercase pb-2 mb-4 border-b-2" style={{color:'#40916c',borderColor:'#d8f3dc'}}>{p.basicInfo}</div>
        <div className="grid grid-cols-2 gap-3.5 mb-3.5">
          <ProfileInput label={p.instName + ' *'} fieldKey="name"  storeValue={profile.name}  placeholder={p.instNamePh} onSave={updateProfile}/>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">{p.type}</label>
            <select className="form-input" value={profile.type} onChange={e => updateProfile('type', e.target.value)}>
              <option value="">{t.common.selectDots}</option>
              {p.types.map(tp => <option key={tp}>{tp}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">{p.level}</label>
            <select className="form-input" value={profile.level} onChange={e => updateProfile('level', e.target.value)}>
              <option value="">{t.common.selectDots}</option>
              {p.levels.map(lv => <option key={lv}>{lv}</option>)}
            </select>
          </div>
          <ProfileInput label={p.scope} fieldKey="scope" storeValue={profile.scope} placeholder={p.scopePh} onSave={updateProfile}/>
        </div>
        <div className="flex flex-col gap-1.5 mb-6">
          <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">{p.mandate}</label>
          <textarea className="form-input" rows={3} value={mandate}
            onChange={e => setMandate(e.target.value)}
            onBlur={e  => updateProfile('mandate', e.target.value)}
            placeholder={p.mandatePh}/>
        </div>
        <div className="text-[10px] font-bold tracking-[1.8px] uppercase pb-2 mb-4 border-b-2" style={{color:'#40916c',borderColor:'#d8f3dc'}}>{p.contact}</div>
        <div className="grid grid-cols-2 gap-3.5">
          <ProfileInput label={p.focalName}  fieldKey="focalName"  storeValue={profile.focalName}  placeholder={p.focalNamePh}  onSave={updateProfile}/>
          <ProfileInput label={p.focalTitle} fieldKey="focalTitle" storeValue={profile.focalTitle} placeholder={p.focalTitlePh} onSave={updateProfile}/>
          <ProfileInput label={p.focalEmail} fieldKey="focalEmail" storeValue={profile.focalEmail} placeholder={p.focalEmail}   type="email" onSave={updateProfile}/>
          <ProfileInput label={p.assessDate} fieldKey="assessDate" storeValue={profile.assessDate}  type="date" onSave={updateProfile}/>
        </div>
        <SectionActions>
          <button className="btn btn-primary" onClick={() => navigate('core')}>{t.common.saveAndContinue}</button>
        </SectionActions>
      </div>
    </div>
  )
}
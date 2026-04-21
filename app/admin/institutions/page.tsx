'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

const TYPES  = ['Government Ministry','Regulatory Agency','Research Institute','NGO / Civil Society','International Organization','Private Sector','Academic Institution','Protected Area Authority','Local Government','Other']
const LEVELS = ['National','Regional','Local','International']

interface Institution {
  id: string; name: string; type: string|null; level: string|null
  country: string|null; focal_email: string|null; created_at: string
  user_count?: number; assessment_count?: number
}

export default function InstitutionsPage() {
  const [insts,    setInsts]   = useState<Institution[]>([])
  const [loading,  setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]  = useState(false)
  const [error,    setError]   = useState('')
  const [search,   setSearch]  = useState('')
  const [form, setForm] = useState({ name:'', type:'', level:'', country:'', mandate:'', focal_name:'', focal_title:'', focal_email:'' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('institutions').select('*').order('name')
    if (data) {
      const enriched = await Promise.all(data.map(async inst => {
        const [{ count: uc }, { count: ac }] = await Promise.all([
          supabase.from('user_profiles').select('*', { count:'exact', head:true }).eq('institution_id', inst.id),
          supabase.from('assessments').select('*', { count:'exact', head:true }).eq('institution_id', inst.id),
        ])
        return { ...inst, user_count: uc??0, assessment_count: ac??0 }
      }))
      setInsts(enriched)
    }
    setLoading(false)
  }

  async function create() {
    if (!form.name.trim()) { setError('Institution name is required'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('institutions').insert({
      name: form.name, type: form.type as any || null, level: form.level as any || null,
      country: form.country || null, mandate: form.mandate || null,
      focal_name: form.focal_name || null, focal_title: form.focal_title || null,
      focal_email: form.focal_email || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setForm({ name:'', type:'', level:'', country:'', mandate:'', focal_name:'', focal_title:'', focal_email:'' })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  async function deleteInst(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will also delete all assessments and user links. This cannot be undone.`)) return
    await supabase.from('institutions').delete().eq('id', id)
    await load()
  }

  const filtered = insts.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  const LocalTextarea = ({ value, placeholder, onBlur }: { value:string; placeholder:string; onBlur:(v:string)=>void }) => {
    const [val, setVal] = useState(value ?? '')
    return <textarea className="form-input" rows={2} value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={e => onBlur(e.target.value)}
      placeholder={placeholder}/>
  }

  // Local-state input — only flushes to form state on blur, preventing re-render on every keystroke
  const F = ({ label, k, type='text', full=false }: { label:string; k:string; type?:string; full?:boolean }) => {
    const [val, setVal] = useState((form as any)[k] ?? '')
    return (
      <div className={`flex flex-col gap-1.5 ${full ? 'col-span-2' : ''}`}>
        <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">{label}</label>
        <input className="form-input" type={type} value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={e  => setForm(p => ({ ...p, [k]: e.target.value }))} />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c' }}>Institutions</h2>
          <p className="text-[13.5px] text-forest-400 mt-1">{insts.length} institution{insts.length!==1?'s':''} registered.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancel' : '＋ New Institution'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card mb-6">
          <div className="card-title">🏛️ Create Institution</div>
          {error && <div className="mb-4 p-3 rounded-xl text-[13px]" style={{ background:'#fee2e2', color:'#dc2626' }}>{error}</div>}
          <div className="grid grid-cols-2 gap-3.5 mb-4">
            <F label="Institution Name *" k="name" full/>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">Type</label>
              <select className="form-input" value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))}>
                <option value="">Select…</option>{TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">Level</label>
              <select className="form-input" value={form.level} onChange={e => setForm(p=>({...p,level:e.target.value}))}>
                <option value="">Select…</option>{LEVELS.map(l=><option key={l}>{l}</option>)}
              </select>
            </div>
            <F label="Country" k="country"/>
            <F label="Focal Point Name"  k="focal_name"/>
            <F label="Focal Point Title" k="focal_title"/>
            <F label="Focal Point Email" k="focal_email" type="email"/>
          </div>
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">Mandate</label>
            <LocalTextarea value={form.mandate} placeholder="Biodiversity mandate…" onBlur={v => setForm(p=>({...p,mandate:v}))} />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={create} disabled={saving}>{saving ? 'Creating…' : 'Create Institution'}</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input className="form-input max-w-sm" placeholder="Search institutions…"
          defaultValue={search}
          onChange={e => setSearch(e.target.value)}/>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-forest-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-4xl mb-3">🏛️</div>
          <p className="text-forest-400">{search ? 'No institutions match your search.' : 'No institutions yet. Create one above.'}</p>
        </div>
      ) : (
        <div className="card">
          <div className="rounded-xl overflow-hidden border border-sand-300">
            <table className="rt w-full">
              <thead>
                <tr><th>Institution</th><th>Type</th><th>Level</th><th>Country</th><th>Users</th><th>Assessments</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(inst => (
                  <tr key={inst.id}>
                    <td>
                      <div className="font-semibold text-[13px] text-forest-700">{inst.name}</div>
                      {inst.focal_email && <div className="text-[11px] text-forest-400">{inst.focal_email}</div>}
                    </td>
                    <td className="text-[12px] text-forest-400">{inst.type ?? '—'}</td>
                    <td className="text-[12px] text-forest-400">{inst.level ?? '—'}</td>
                    <td className="text-[12px] text-forest-400">{inst.country ?? '—'}</td>
                    <td>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
                        style={{ background:'#d8f3dc', color:'#1b4332' }}>{inst.user_count}</span>
                    </td>
                    <td>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
                        style={{ background:'#dbeafe', color:'#1d4ed8' }}>{inst.assessment_count}</span>
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <Link href={`/admin/institutions/${inst.id}`} className="btn btn-ghost btn-sm">View</Link>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteInst(inst.id, inst.name)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
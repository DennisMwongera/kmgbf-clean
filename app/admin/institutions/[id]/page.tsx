'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

const ROLES = ['admin','institution_lead','contributor','viewer']
const ROLE_COLORS: Record<string,{bg:string;text:string}> = {
  admin:            { bg:'#fee2e2', text:'#dc2626' },
  institution_lead: { bg:'#fef3c7', text:'#d97706' },
  contributor:      { bg:'#d8f3dc', text:'#1b4332' },
  viewer:           { bg:'#e0e7ff', text:'#4338ca' },
}

const ALL_TARGETS = [
  {num:1,title:'Spatial Planning'},{num:2,title:'Ecosystem Restoration'},
  {num:3,title:'Protected Areas (30×30)'},{num:4,title:'Halting Species Loss'},
  {num:5,title:'Sustainable Wild Species'},{num:6,title:'Invasive Alien Species'},
  {num:7,title:'Pollution Reduction'},{num:8,title:'Climate & Biodiversity'},
  {num:9,title:'Wild Species Benefits'},{num:10,title:'Sustainable Production'},
  {num:11,title:'Ecosystem Services'},{num:12,title:'Urban Green Spaces'},
  {num:13,title:'Access & Benefit Sharing'},{num:14,title:'Biodiversity Mainstreaming'},
  {num:15,title:'Business & Biodiversity'},{num:16,title:'Sustainable Consumption'},
  {num:17,title:'Biosafety'},{num:18,title:'Harmful Subsidies Reform'},
  {num:19,title:'Resource Mobilisation'},{num:20,title:'Capacity Building'},
  {num:21,title:'Knowledge & Innovation'},{num:22,title:'Participation & Rights'},
  {num:23,title:'Gender Equality'},
]

interface Institution {
  id:string; name:string; type:string|null; level:string|null
  country:string|null; mandate:string|null; focal_name:string|null
  focal_title:string|null; focal_email:string|null; created_at:string
}
interface User { id:string; full_name:string|null; email:string|null; role:string; created_at:string }
interface Assessment { id:string; assess_date:string; status:string; updated_at:string }

// ─── Local-state helpers to prevent cursor loss ────────────────
function EditField({ label, value, onBlur }: { label:string; value:string; onBlur:(v:string)=>void }) {
  const [val, setVal] = useState(value)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide capitalize">{label}</label>
      <input className="form-input" value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={e  => onBlur(e.target.value)}/>
    </div>
  )
}

function EditTextarea({ value, onBlur }: { value:string; onBlur:(v:string)=>void }) {
  const [val, setVal] = useState(value)
  return <textarea className="form-input" rows={2} value={val}
    onChange={e => setVal(e.target.value)}
    onBlur={e  => onBlur(e.target.value)}/>
}

// ─── Target assignment panel ───────────────────────────────────
function TargetAssignment({ institutionId }: { institutionId: string }) {
  const [assigned, setAssigned] = useState<number[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    supabase.from('institution_targets')
      .select('target_num')
      .eq('institution_id', institutionId)
      .then(({ data }) => {
        setAssigned((data ?? []).map(r => r.target_num))
        setLoading(false)
      })
  }, [institutionId])

  async function toggle(num: number) {
    setSaving(true)
    if (assigned.includes(num)) {
      await supabase.from('institution_targets').delete()
        .eq('institution_id', institutionId).eq('target_num', num)
      setAssigned(prev => prev.filter(n => n !== num))
    } else {
      await supabase.from('institution_targets')
        .insert({ institution_id: institutionId, target_num: num })
      setAssigned(prev => [...prev, num].sort((a,b) => a-b))
    }
    setSaving(false)
  }

  async function selectAll() {
    setSaving(true)
    const toAdd = ALL_TARGETS.filter(t => !assigned.includes(t.num))
      .map(t => ({ institution_id: institutionId, target_num: t.num }))
    if (toAdd.length) await supabase.from('institution_targets').insert(toAdd)
    setAssigned(ALL_TARGETS.map(t => t.num))
    setSaving(false)
  }

  async function clearAll() {
    if (!confirm('Remove all target assignments for this institution?')) return
    setSaving(true)
    await supabase.from('institution_targets').delete().eq('institution_id', institutionId)
    setAssigned([])
    setSaving(false)
  }

  if (loading) return <div className="text-[13px] text-forest-400 py-3">Loading targets…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold tracking-[1.2px] uppercase text-forest-400">
          {assigned.length} / 23 assigned
        </span>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={selectAll} disabled={saving}>Select all</button>
          <button className="btn btn-danger btn-sm" onClick={clearAll} disabled={saving}>Clear all</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {ALL_TARGETS.map(t => {
          const active = assigned.includes(t.num)
          return (
            <button key={t.num} onClick={() => toggle(t.num)} disabled={saving}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all"
              style={{
                background:  active ? '#d8f3dc' : 'white',
                borderColor: active ? '#52b788' : '#e8e3da',
                color:       active ? '#1b4332' : '#6b7280',
                opacity:     saving ? 0.6 : 1,
              }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background:active?'#52b788':'#e8e3da', color:active?'white':'#9ca3af' }}>
                {active ? '✓' : t.num}
              </span>
              <span className="text-[12px] truncate">{t.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────
export default function InstitutionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [inst,        setInst]        = useState<Institution|null>(null)
  const [users,       setUsers]       = useState<User[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [editing,     setEditing]     = useState(false)
  const [editForm,    setEditForm]    = useState<Partial<Institution>>({})

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: instData }, { data: userData }, { data: assessData }] = await Promise.all([
      supabase.from('institutions').select('*').eq('id', id).single(),
      supabase.from('user_profiles').select('*').eq('institution_id', id).order('created_at'),
      supabase.from('assessments').select('*').eq('institution_id', id).order('created_at', { ascending:false }),
    ])
    if (instData) { setInst(instData); setEditForm(instData) }
    if (userData) setUsers(userData)
    if (assessData) setAssessments(assessData)
    setLoading(false)
  }

  async function saveInstitution() {
    await supabase.from('institutions').update({
      name: editForm.name, type: editForm.type as any, level: editForm.level as any,
      country: editForm.country, mandate: editForm.mandate,
      focal_name: editForm.focal_name, focal_title: editForm.focal_title,
      focal_email: editForm.focal_email,
    }).eq('id', id)
    setEditing(false)
    await load()
  }

  async function changeRole(userId: string, role: string) {
    await supabase.from('user_profiles').update({ role: role as any }).eq('id', userId)
    await load()
  }

  async function removeUser(userId: string) {
    if (!confirm('Remove this user from the institution?')) return
    await supabase.from('user_profiles').update({ institution_id: null }).eq('id', userId)
    await load()
  }

  const STATUS_STYLE: Record<string,{bg:string;text:string}> = {
    draft:       { bg:'#f3f4f6', text:'#6b7280' },
    in_progress: { bg:'#fef3c7', text:'#d97706' },
    completed:   { bg:'#d1fae5', text:'#047857' },
    submitted:   { bg:'#dbeafe', text:'#1d4ed8' },
    approved:    { bg:'#d8f3dc', text:'#1b4332' },
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-forest-400">Loading…</div>
  if (!inst)   return <div className="text-center py-20 text-forest-400">Institution not found.</div>

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/admin/institutions" className="text-[12px] text-forest-400 hover:text-forest-600 mb-1 inline-block">← All institutions</Link>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c' }}>{inst.name}</h2>
          <div className="flex gap-2 mt-1.5">
            {inst.type  && <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background:'#f0faf4', color:'#2d6a4f' }}>{inst.type}</span>}
            {inst.level && <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background:'#dbeafe', color:'#1d4ed8' }}>{inst.level}</span>}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => setEditing(v => !v)}>
          {editing ? '✕ Cancel' : '✏️ Edit'}
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card mb-5">
          <div className="card-title">Edit Institution</div>
          <div className="grid grid-cols-2 gap-3.5 mb-4">
            {(['name','country','focal_name','focal_title','focal_email'] as const).map(k => (
              <EditField key={k} label={k.replace(/_/g,' ')} value={(editForm as any)[k]??''}
                onBlur={v => setEditForm(p=>({...p,[k]:v}))}/>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-[11px] font-bold text-forest-400 uppercase tracking-wide">Mandate</label>
            <EditTextarea value={editForm.mandate??''} onBlur={v => setEditForm(p=>({...p,mandate:v}))}/>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={saveInstitution}>Save changes</button>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Users */}
        <div className="card">
          <div className="card-title">👥 Users ({users.length})</div>
          {users.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-forest-400">No users linked yet.</div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-sand-300">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                    style={{ background:'rgba(82,183,136,.2)', color:'#2d6a4f' }}>
                    {(u.full_name||u.email||'?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-forest-700 truncate">{u.full_name||'—'}</div>
                    <div className="text-[11px] text-forest-400 truncate">{u.email}</div>
                  </div>
                  <select
                    className="text-[11px] px-2 py-1 rounded-lg border border-sand-300 cursor-pointer outline-none font-bold"
                    style={{ ...(ROLE_COLORS[u.role]||{}) }}
                    value={u.role}
                    onChange={e => changeRole(u.id, e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r} style={{ background:'white', color:'#131f18', fontWeight:400 }}>{r.replace('_',' ')}</option>)}
                  </select>
                  <button className="text-[10px] text-red-400 hover:text-red-600 shrink-0" onClick={() => removeUser(u.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assessments */}
        <div className="card">
          <div className="card-title">📋 Assessments ({assessments.length})</div>
          {assessments.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-forest-400">No assessments yet.</div>
          ) : (
            <div className="space-y-2">
              {assessments.map(a => {
                const ss = STATUS_STYLE[a.status] ?? STATUS_STYLE.draft
                return (
                  <div key={a.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-sand-300">
                    <div className="flex-1">
                      <div className="text-[12.5px] font-semibold text-forest-700">{a.assess_date}</div>
                      <div className="text-[11px] text-forest-400">{new Date(a.updated_at).toLocaleDateString()}</div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background:ss.bg, color:ss.text }}>
                      {a.status.replace('_',' ')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Target Assignment — full width */}
      <div className="card mb-5">
        <div className="card-title mb-1">🎯 KMGBF Target Assignment</div>
        <p className="text-[12.5px] text-forest-400 mb-4">
          Select which of the 23 KMGBF targets apply to this institution. Users will only see and interact with assigned targets. Unassigned targets appear greyed out.
        </p>
        <TargetAssignment institutionId={id}/>
      </div>

      {/* Institution details */}
      <div className="card">
        <div className="card-title">ℹ️ Details</div>
        <div className="grid grid-cols-3 gap-4 text-[13px]">
          {([['Focal Point', inst.focal_name],['Title', inst.focal_title],['Email', inst.focal_email],['Country', inst.country],['Created', new Date(inst.created_at).toLocaleDateString()]] as [string,string|null][]).map(([l,v]) => (
            <div key={l}>
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-forest-400 mb-0.5">{l}</div>
              <div className="text-forest-700">{v||'—'}</div>
            </div>
          ))}
        </div>
        {inst.mandate && (
          <div className="mt-4 pt-4 border-t border-forest-50">
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-forest-400 mb-1">Mandate</div>
            <div className="text-[13px] text-forest-700 leading-relaxed">{inst.mandate}</div>
          </div>
        )}
      </div>
    </div>
  )
}
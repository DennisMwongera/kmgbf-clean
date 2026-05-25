'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Building2, Plus, Loader2, ChevronRight, X, Check, Trash2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Institution {
  id: string; name: string; type: string | null; level: string | null
  status: string | null; answered_count: number; overall_score: number | null
  updated_at: string | null; user_count: number
}

function scoreColor(v: number | null) {
  if (v === null) return '#9ca3af'
  if (v < 2) return '#dc2626'; if (v < 3) return '#ca8a04'
  if (v < 4) return '#16a34a'; return '#047857'
}


export default function CountryAdminInstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [countryId,    setCountryId]    = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [confirmDel,   setConfirmDel]   = useState<Institution | null>(null)
  const [form,         setForm]         = useState({ name:'', type:'', level:'' })
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  async function load(cid: string) {
    try {
    const { data: insts } = await supabase
      .from('institutions')
      .select('id, name, type, level')
      .eq('country_id', cid)
      .order('name')

    if (!insts?.length) { setInstitutions([]); setLoading(false); return }

    const { data: assessments } = await supabase
      .from('assessments')
      .select('id, institution_id, status, updated_at')
      .in('institution_id', insts.map(i => i.id))
      .order('updated_at', { ascending: false })

    const latestByInst: Record<string, any> = {}
    assessments?.forEach(a => {
      if (!latestByInst[a.institution_id]) latestByInst[a.institution_id] = a
    })

    const assessIds = Object.values(latestByInst).map((a: any) => a.id)

    const [{ data: coreRows }, { data: userCounts }] = await Promise.all([
      assessIds.length
        ? supabase.from('core_responses').select('assessment_id, score').in('assessment_id', assessIds)
        : Promise.resolve({ data: [] }),
      supabase.from('user_profiles').select('institution_id').in('institution_id', insts.map(i => i.id)),
    ])

    const countMap: Record<string, number> = {}
    const scoreMap: Record<string, number[]> = {}
    const userMap:  Record<string, number> = {}

    coreRows?.forEach(r => {
      if (r.score !== null && r.score !== -1 && r.score >= 0) {
        countMap[r.assessment_id] = (countMap[r.assessment_id] ?? 0) + 1
        if (!scoreMap[r.assessment_id]) scoreMap[r.assessment_id] = []
        scoreMap[r.assessment_id].push(r.score)
      }
    })
    userCounts?.forEach(r => {
      if (r.institution_id) userMap[r.institution_id] = (userMap[r.institution_id] ?? 0) + 1
    })

    setInstitutions(insts.map(inst => {
      const a = latestByInst[inst.id]; const aid = a?.id
      const scores = aid ? (scoreMap[aid] ?? []) : []
      return {
        ...inst,
        status:         a?.status ?? null,
        updated_at:     a?.updated_at ?? null,
        answered_count: aid ? (countMap[aid] ?? 0) : 0,
        overall_score:  scores.length ? scores.reduce((x,y)=>x+y,0)/scores.length : null,
        user_count:     userMap[inst.id] ?? 0,
      }
    }))
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await supabase.from('user_profiles').select('country_id').eq('id', user.id).single()
      if (!p?.country_id) { setLoading(false); return }
      setCountryId(p.country_id)
      load(p.country_id)
    })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    const { error } = await supabase.from('institutions').insert({
      name: form.name.trim(), type: form.type || null,
      level: form.level || null, country_id: countryId,
    })
    if (error) { setError(error.message); setSaving(false); return }
    setSaving(false); setShowForm(false)
    setForm({ name:'', type:'', level:'' })
    if (countryId) load(countryId)
  }

  async function handleDelete(inst: Institution) {
    if (inst.answered_count > 0 || inst.user_count > 0) {
      setConfirmDel(inst); return
    }
    doDelete(inst.id)
  }

  async function doDelete(id: string) {
    setDeleting(id); setConfirmDel(null)
    await supabase.from('institutions').delete().eq('id', id)
    setInstitutions(prev => prev.filter(i => i.id !== id))
    setDeleting(null)
  }

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'#0f2d1c' }}>
            Institutions
          </h2>
          <p className="text-[13px] text-forest-400 mt-1">{institutions.length} institutions in your country</p>
        </div>
        <button onClick={() => { setShowForm(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white"
          style={{ background:'#1b4332' }}>
          <Plus size={14}/> Add Institution
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color:'#52b788' }}/>
        </div>
      ) : institutions.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 size={32} className="mx-auto mb-3" style={{ color:'#d8f3dc' }}/>
          <div className="text-forest-400 text-[13px] mb-4">No institutions yet.</div>
          <button onClick={() => setShowForm(true)}
            className="btn btn-primary inline-flex items-center gap-2">
            <Plus size={13}/> Add your first institution
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-sand-300 overflow-hidden">
          <table className="rt w-full">
            <thead>
              <tr>
                <th>Institution</th><th>Score</th><th>Progress</th>
                <th>Status</th><th>Users</th><th>Updated</th><th></th>
              </tr>
            </thead>
            <tbody>
              {institutions.map(i => (
                <tr key={i.id}>
                  <td>
                    <div className="font-semibold text-[12.5px] text-forest-700">{i.name}</div>
                    {i.type && <div className="text-[10px] text-forest-400">{i.type}</div>}
                  </td>
                  <td>
                    {i.overall_score !== null
                      ? <span className="font-bold text-[13px]" style={{ fontFamily:'var(--font-mono)', color:scoreColor(i.overall_score) }}>{i.overall_score.toFixed(2)}</span>
                      : <span className="text-forest-300">—</span>}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full" style={{ background:'#e8e3da' }}>
                        <div className="h-full rounded-full" style={{ width:`${(i.answered_count/50)*100}%`, background:'#52b788' }}/>
                      </div>
                      <span className="text-[10.5px] text-forest-400">{i.answered_count}/50</span>
                    </div>
                  </td>
                  <td>
                    {i.status
                      ? <span className="chip text-[10px]" style={{
                          background: i.status==='approved'?'#d8f3dc':i.status==='submitted'?'#dbeafe':i.status==='in_review'?'#ede9fe':'#fef3c7',
                          color:      i.status==='approved'?'#1b4332':i.status==='submitted'?'#1d4ed8':i.status==='in_review'?'#6d28d9':'#d97706',
                        }}>{i.status.replace('_',' ')}</span>
                      : <span className="text-[10px] text-forest-300">Not started</span>}
                  </td>
                  <td className="text-[12px] font-mono">{i.user_count}</td>
                  <td className="text-[11px] text-forest-400">
                    {i.updated_at ? new Date(i.updated_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link href={`/country-admin/institutions/${i.id}`}
                        className="btn btn-ghost btn-sm flex items-center gap-1">
                        View <ChevronRight size={11}/>
                      </Link>
                      <button onClick={() => handleDelete(i)}
                        disabled={deleting === i.id}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 transition-all"
                        style={{ color:'#dc2626' }}>
                        {deleting === i.id
                          ? <Loader2 size={12} className="animate-spin"/>
                          : <Trash2 size={12}/>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add institution modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-md"
            style={{ boxShadow:'0 24px 60px rgba(0,0,0,.25)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#0f2d1c' }}>
                Add Institution
              </h3>
              <button onClick={() => setShowForm(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-sand-100">
                <X size={14} style={{ color:'#9ca3af' }}/>
              </button>
            </div>
            {error && <div className="mb-4 px-3 py-2 rounded-lg text-[12.5px]" style={{ background:'#fee2e2', color:'#dc2626' }}>{error}</div>}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Institution Name *</label>
                <input className="ti w-full" placeholder="e.g. Ministry of Environment"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required/>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Type</label>
                <select className="ti w-full" value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ appearance:'none' }}>
                  <option value="">Select type…</option>
                  <option value="Government Ministry">Government Ministry</option>
                  <option value="Regulatory Agency">Regulatory Agency</option>
                  <option value="Research Institute">Research Institute</option>
                  <option value="NGO / Civil Society">NGO / Civil Society</option>
                  <option value="International Organization">International Organization</option>
                  <option value="Private Sector">Private Sector</option>
                  <option value="Academic Institution">Academic Institution</option>
                  <option value="Protected Area Authority">Protected Area Authority</option>
                  <option value="Local Government">Local Government</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Level</label>
                <select className="ti w-full" value={form.level}
                  onChange={e => setForm(p => ({ ...p, level: e.target.value }))} style={{ appearance:'none' }}>
                  <option value="">Select level…</option>
                  <option value="National">National</option>
                  <option value="Regional">Regional</option>
                  <option value="Local">Local</option>
                  <option value="International">International</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border"
                  style={{ borderColor:'#e8e3da', color:'#5c7566' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-[2] py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: saving ? '#9ca3af' : '#1b4332' }}>
                  {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                  {saving ? 'Saving…' : 'Add Institution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-7 w-full max-w-sm"
            style={{ boxShadow:'0 24px 60px rgba(0,0,0,.25)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background:'#fee2e2' }}>
                <AlertTriangle size={18} style={{ color:'#dc2626' }}/>
              </div>
              <div>
                <div className="font-bold text-forest-800">Delete Institution?</div>
                <div className="text-[12px] text-forest-400 mt-0.5">{confirmDel.name}</div>
              </div>
            </div>
            <p className="text-[12.5px] text-forest-600 mb-5">
              This institution has <strong>{confirmDel.answered_count} assessment responses</strong> and{' '}
              <strong>{confirmDel.user_count} users</strong>. Deleting it will remove all associated data permanently.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border"
                style={{ borderColor:'#e8e3da', color:'#5c7566' }}>Cancel</button>
              <button onClick={() => doDelete(confirmDel.id)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white"
                style={{ background:'#dc2626' }}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
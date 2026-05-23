'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Building2, Plus, Loader2, ChevronRight, X, Check } from 'lucide-react'
import Link from 'next/link'

interface Institution {
  id: string; name: string; type: string | null; level: string | null
  country_id: string | null; country_name: string | null; country_code: string | null
  assessment_count: number; user_count: number
}
interface Country { id: string; name: string; code: string }

export default function SuperAdminInstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [countries,    setCountries]    = useState<Country[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterCountry,setFilterCountry]= useState('')
  const [showForm,     setShowForm]     = useState(false)
  const [form,         setForm]         = useState({ name:'', type:'', level:'', country_id:'' })
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  async function load() {
    setLoading(true)

    // Load all in parallel with separate queries
    const [
      { data: insts },
      { data: ctrs },
      { data: assessCounts },
      { data: userCounts },
    ] = await Promise.all([
      supabase.from('institutions').select('id, name, type, level, country_id').order('name'),
      supabase.from('countries').select('id, name, code').eq('status','active').order('name'),
      supabase.from('assessments').select('institution_id'),
      supabase.from('user_profiles').select('institution_id').not('institution_id','is',null),
    ])

    const countryMap: Record<string, Country> = {}
    ctrs?.forEach(c => { countryMap[c.id] = c })

    const am: Record<string,number> = {}
    const um: Record<string,number> = {}
    assessCounts?.forEach(r => { am[r.institution_id] = (am[r.institution_id]??0)+1 })
    userCounts?.forEach(r => { if(r.institution_id) um[r.institution_id] = (um[r.institution_id]??0)+1 })

    setInstitutions((insts ?? []).map(i => ({
      id: i.id, name: i.name, type: i.type, level: i.level,
      country_id:       i.country_id,
      country_name:     i.country_id ? (countryMap[i.country_id]?.name ?? null) : null,
      country_code:     i.country_id ? (countryMap[i.country_id]?.code ?? null) : null,
      assessment_count: am[i.id] ?? 0,
      user_count:       um[i.id] ?? 0,
    })))
    setCountries(ctrs ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.country_id)  { setError('Country is required'); return }
    setSaving(true)
    const { error } = await supabase.from('institutions').insert({
      name: form.name.trim(), type: form.type || null,
      level: form.level || null, country_id: form.country_id,
    })
    if (error) { setError(error.message); setSaving(false); return }
    setSaving(false); setShowForm(false)
    setForm({ name:'', type:'', level:'', country_id:'' })
    load()
  }

  const filtered = institutions.filter(i => {
    const matchSearch  = !search || i.name.toLowerCase().includes(search.toLowerCase())
    const matchCountry = !filterCountry || i.country_id === filterCountry
    return matchSearch && matchCountry
  })

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'#0f2d1c' }}>
            All Institutions
          </h2>
          <p className="text-[13px] text-forest-400 mt-1">{institutions.length} institutions across all countries</p>
        </div>
        <button onClick={() => { setShowForm(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white"
          style={{ background:'#1b4332' }}>
          <Plus size={14}/> Add Institution
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input className="ti flex-1 min-w-48" placeholder="Search institutions…"
          value={search} onChange={e => setSearch(e.target.value)}/>
        <select className="ti w-52" value={filterCountry}
          onChange={e => setFilterCountry(e.target.value)} style={{ appearance:'none' }}>
          <option value="">All countries</option>
          {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color:'#52b788' }}/>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-sand-300 overflow-hidden">
          <table className="rt w-full">
            <thead>
              <tr>
                <th>Institution</th><th>Country</th><th>Type</th>
                <th>Assessments</th><th>Users</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-forest-300">No institutions found</td></tr>
              ) : filtered.map(i => (
                <tr key={i.id}>
                  <td>
                    <div className="font-semibold text-[12.5px] text-forest-700">{i.name}</div>
                    {i.level && <div className="text-[10px] text-forest-400">{i.level}</div>}
                  </td>
                  <td>
                    {i.country_name ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background:'#f0faf4', color:'#2d6a4f', border:'1px solid #d8f3dc' }}>
                          {i.country_code}
                        </span>
                        <span className="text-[12px] text-forest-600">{i.country_name}</span>
                      </div>
                    ) : <span className="text-forest-300 text-[12px]">—</span>}
                  </td>
                  <td className="text-[12px] text-forest-400">{i.type ?? '—'}</td>
                  <td className="font-mono text-[12px]">{i.assessment_count || '—'}</td>
                  <td className="font-mono text-[12px]">{i.user_count || '—'}</td>
                  <td>
                    <Link href={`/super-admin/institutions/${i.id}`}
                      className="btn btn-ghost btn-sm flex items-center gap-1">
                      View <ChevronRight size={11}/>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Country</label>
                <select className="ti w-full" value={form.country_id}
                  onChange={e => setForm(p => ({ ...p, country_id: e.target.value }))}
                  style={{ appearance:'none' }} required>
                  <option value="">Select country…</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Institution Name</label>
                <input className="ti w-full" placeholder="e.g. Ministry of Environment"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required/>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Type</label>
                <input className="ti w-full" placeholder="e.g. Government Ministry"
                  value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}/>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Level</label>
                <input className="ti w-full" placeholder="e.g. National"
                  value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}/>
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
    </div>
  )
}
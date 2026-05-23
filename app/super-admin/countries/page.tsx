'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Globe, Plus, Building2, Users, BarChart2, Edit2, ToggleLeft, ToggleRight, Loader2, ChevronRight, X, Check } from 'lucide-react'

interface Country {
  id: string; name: string; code: string
  region: string | null; status: 'active' | 'inactive'
  inst_count: number; user_count: number; assessment_count: number
}

interface CountryForm {
  name: string; code: string; region: string; status: 'active' | 'inactive'
}

const REGIONS = [
  'Eastern Africa', 'Western Africa', 'Northern Africa',
  'Southern Africa', 'Middle Africa', 'Other'
]

const BLANK_FORM: CountryForm = { name:'', code:'', region:'', status:'active' }

export default function SuperAdminCountriesPage() {
  const [countries,  setCountries]  = useState<Country[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState<Country | null>(null)
  const [form,       setForm]       = useState<CountryForm>(BLANK_FORM)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [search,     setSearch]     = useState('')
  const [filterRegion, setFilterRegion] = useState('')

  async function load() {
    setLoading(true)
    // Load countries with counts
    const { data: countries } = await supabase
      .from('countries')
      .select('id, name, code, region, status')
      .order('name')

    if (!countries) { setLoading(false); return }

    // Get institution counts per country
    const { data: instCounts } = await supabase
      .from('institutions')
      .select('country_id')

    // Get user counts per country
    const { data: userCounts } = await supabase
      .from('user_profiles')
      .select('country_id')
      .not('country_id', 'is', null)

    // Get assessment counts per country via institutions
    const { data: assessCounts } = await supabase
      .from('assessments')
      .select('institution_id, institutions!inner(country_id)')

    const instMap: Record<string, number>   = {}
    const userMap: Record<string, number>   = {}
    const assessMap: Record<string, number> = {}

    instCounts?.forEach(r => { if (r.country_id) instMap[r.country_id] = (instMap[r.country_id] ?? 0) + 1 })
    userCounts?.forEach(r => { if (r.country_id) userMap[r.country_id] = (userMap[r.country_id] ?? 0) + 1 })
    assessCounts?.forEach((r: any) => {
      const cid = r.institutions?.country_id
      if (cid) assessMap[cid] = (assessMap[cid] ?? 0) + 1
    })

    setCountries(countries.map(c => ({
      ...c,
      inst_count:       instMap[c.id]   ?? 0,
      user_count:       userMap[c.id]   ?? 0,
      assessment_count: assessMap[c.id] ?? 0,
    })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm(BLANK_FORM)
    setError('')
    setShowForm(true)
  }

  function openEdit(c: Country) {
    setEditing(c)
    setForm({ name: c.name, code: c.code, region: c.region ?? '', status: c.status })
    setError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Country name is required'); return }
    if (!form.code.trim() || form.code.length !== 2) { setError('ISO code must be 2 letters'); return }

    setSaving(true)
    const payload = {
      name:   form.name.trim(),
      code:   form.code.toUpperCase().trim(),
      region: form.region || null,
      status: form.status,
    }

    if (editing) {
      const { error } = await supabase.from('countries').update(payload).eq('id', editing.id)
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('countries').insert(payload)
      if (error) { setError(error.message); setSaving(false); return }
    }

    setSaving(false)
    setShowForm(false)
    load()
  }

  async function toggleStatus(c: Country) {
    const next = c.status === 'active' ? 'inactive' : 'active'
    await supabase.from('countries').update({ status: next }).eq('id', c.id)
    setCountries(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x))
  }

  const filtered = countries.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
    const matchRegion = !filterRegion || c.region === filterRegion
    return matchSearch && matchRegion
  })

  const activeCount   = countries.filter(c => c.status === 'active').length
  const totalInsts    = countries.reduce((s, c) => s + c.inst_count, 0)
  const totalUsers    = countries.reduce((s, c) => s + c.user_count, 0)
  const totalAssess   = countries.reduce((s, c) => s + c.assessment_count, 0)

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'#0f2d1c' }}>
            Country Management
          </h2>
          <p className="text-[13px] text-forest-400 mt-1">
            Manage countries participating in the KMGBF CNA programme.
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all"
          style={{ background:'#1b4332' }}>
          <Plus size={14}/> Add Country
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:'Active Countries',  value: activeCount,   accent:'#52b788', Icon: Globe      },
          { label:'Institutions',      value: totalInsts,    accent:'#5b8dee', Icon: Building2  },
          { label:'Users',             value: totalUsers,    accent:'#c8860a', Icon: Users      },
          { label:'Assessments',       value: totalAssess,   accent:'#e07a5f', Icon: BarChart2  },
        ].map(({ label, value, accent, Icon }) => (
          <div key={label} className="bg-white rounded-xl px-5 py-4 border border-sand-300/60"
            style={{ borderTop:`3px solid ${accent}`, boxShadow:'0 2px 12px rgba(15,45,28,.08)' }}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1.5">
              <Icon size={11}/> {label}
            </div>
            <div className="text-[28px] text-forest-700" style={{ fontFamily:'var(--font-mono)', fontWeight:300 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input className="ti flex-1 min-w-48" placeholder="Search countries…"
          value={search} onChange={e => setSearch(e.target.value)}/>
        <select className="ti w-48" value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
          style={{ appearance:'none' }}>
          <option value="">All regions</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Country table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color:'#52b788' }}/>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-sand-300 overflow-hidden"
          style={{ boxShadow:'0 2px 12px rgba(15,45,28,.06)' }}>
          <table className="rt w-full">
            <thead>
              <tr>
                <th>Country</th>
                <th>Region</th>
                <th>Institutions</th>
                <th>Users</th>
                <th>Assessments</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-forest-300">No countries found</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center w-8 h-6 rounded text-[10px] font-bold"
                        style={{ background:'#f0faf4', color:'#2d6a4f', border:'1px solid #d8f3dc' }}>
                        {c.code}
                      </span>
                      <span className="font-semibold text-[12.5px] text-forest-700">{c.name}</span>
                    </div>
                  </td>
                  <td className="text-[12px] text-forest-400">{c.region ?? '—'}</td>
                  <td>
                    <span className="font-semibold text-[13px]" style={{ fontFamily:'var(--font-mono)', color: c.inst_count > 0 ? '#1b4332' : '#9ca3af' }}>
                      {c.inst_count}
                    </span>
                  </td>
                  <td>
                    <span className="font-semibold text-[13px]" style={{ fontFamily:'var(--font-mono)', color: c.user_count > 0 ? '#1b4332' : '#9ca3af' }}>
                      {c.user_count}
                    </span>
                  </td>
                  <td>
                    <span className="font-semibold text-[13px]" style={{ fontFamily:'var(--font-mono)', color: c.assessment_count > 0 ? '#1b4332' : '#9ca3af' }}>
                      {c.assessment_count}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => toggleStatus(c)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all"
                      style={{
                        background: c.status === 'active' ? '#d8f3dc' : '#f3f4f6',
                        color:      c.status === 'active' ? '#1b4332'  : '#9ca3af',
                      }}>
                      {c.status === 'active'
                        ? <><ToggleRight size={13}/> Active</>
                        : <><ToggleLeft  size={13}/> Inactive</>}
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)}
                        className="btn btn-ghost btn-sm flex items-center gap-1">
                        <Edit2 size={11}/> Edit
                      </button>
                      {c.inst_count > 0 && (
                        <a href={`/admin/countries/${c.id}`}
                          className="btn btn-ghost btn-sm flex items-center gap-1">
                          View <ChevronRight size={11}/>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-md"
            style={{ boxShadow:'0 24px 60px rgba(0,0,0,.25)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#0f2d1c' }}>
                {editing ? 'Edit Country' : 'Add Country'}
              </h3>
              <button onClick={() => setShowForm(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-sand-100 transition-colors">
                <X size={14} style={{ color:'#9ca3af' }}/>
              </button>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg text-[12.5px]"
                style={{ background:'#fee2e2', color:'#dc2626' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Country Name</label>
                <input className="ti w-full" placeholder="e.g. Kenya"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required/>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">
                  ISO Code <span className="font-normal text-forest-400">(2 letters)</span>
                </label>
                <input className="ti w-full" placeholder="e.g. KE" maxLength={2}
                  value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} required/>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Region</label>
                <select className="ti w-full" value={form.region}
                  onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                  style={{ appearance:'none' }}>
                  <option value="">Select region…</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Status</label>
                <div className="flex gap-2">
                  {(['active','inactive'] as const).map(s => (
                    <button key={s} type="button"
                      onClick={() => setForm(p => ({ ...p, status: s }))}
                      className="flex-1 py-2 rounded-lg text-[12px] font-semibold border transition-all"
                      style={{
                        background:   form.status === s ? (s === 'active' ? '#d8f3dc' : '#fee2e2') : 'white',
                        borderColor:  form.status === s ? (s === 'active' ? '#52b788' : '#dc2626') : '#e8e3da',
                        color:        form.status === s ? (s === 'active' ? '#1b4332' : '#dc2626') : '#9ca3af',
                      }}>
                      {s === 'active' ? '✓ Active' : '✗ Inactive'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all"
                  style={{ borderColor:'#e8e3da', color:'#5c7566' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-[2] py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: saving ? '#9ca3af' : '#1b4332' }}>
                  {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Country'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Search, Pencil, Trash2, X, Check, AlertTriangle } from 'lucide-react'

interface UserRow {
  id: string; full_name: string | null; email: string | null
  role: string; status: string; country_name: string | null
  institution_name: string | null; institution_id: string | null
  country_id: string | null; created_at: string | null
}

const ROLES = ['super_admin','admin','country_admin','institution_lead','contributor','viewer']
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  super_admin:      { bg:'rgba(139,92,246,.15)', color:'#7c3aed' },
  admin:            { bg:'rgba(220,38,38,.12)',  color:'#dc2626' },
  country_admin:    { bg:'rgba(59,130,246,.12)', color:'#2563eb' },
  institution_lead: { bg:'rgba(251,191,36,.15)', color:'#d97706' },
  contributor:      { bg:'rgba(82,183,136,.15)', color:'#2d6a4f' },
  viewer:           { bg:'rgba(156,163,175,.15)', color:'#6b7280' },
}

export default function SuperAdminUsersPage() {
  const [users,        setUsers]        = useState<UserRow[]>([])
  const [institutions, setInstitutions] = useState<{id:string;name:string;country_id:string}[]>([])
  const [countries,    setCountries]    = useState<{id:string;name:string}[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterRole,   setFilterRole]   = useState('')
  const [filterInst,   setFilterInst]   = useState('')
  const [changing,     setChanging]     = useState<string | null>(null)
  const [editTarget,   setEditTarget]   = useState<UserRow | null>(null)
  const [confirmDel,   setConfirmDel]   = useState<UserRow | null>(null)
  const [editForm,     setEditForm]     = useState({ full_name:'', country_id:'', institution_id:'', role:'', status:'' })
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('user_profiles')
      .select('id, full_name, email, role, status, country_id, institution_id, created_at')
      .order('created_at', { ascending: false })
    const { data: ctrs  } = await supabase.from('countries').select('id, name')
    const { data: insts } = await supabase.from('institutions').select('id, name, country_id')
    setCountries(ctrs ?? [])
    setInstitutions(insts ?? [])
    const cMap: Record<string,string> = {}
    const iMap: Record<string,string> = {}
    ctrs?.forEach(c  => { cMap[c.id] = c.name })
    insts?.forEach(i => { iMap[i.id] = i.name })
    setUsers((data ?? []).map((u: any) => ({
      id:               u.id,
      full_name:        u.full_name,
      email:            u.email,
      role:             u.role,
      status:           u.status ?? 'active',
      country_id:       u.country_id,
      country_name:     u.country_id     ? (cMap[u.country_id]     ?? null) : null,
      institution_name: u.institution_id ? (iMap[u.institution_id] ?? null) : null,
      institution_id:   u.institution_id ?? null,
      created_at:       u.created_at,
    })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function changeRole(userId: string, newRole: string) {
    setChanging(userId)
    await supabase.from('user_profiles').update({ role: newRole }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    setChanging(null)
  }
  async function changeStatus(userId: string, newStatus: string) {
    await supabase.from('user_profiles').update({ status: newStatus }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
  }

  function openEdit(u: UserRow) {
    setEditTarget(u)
    setEditForm({ full_name: u.full_name??'', country_id: u.country_id??'', institution_id: u.institution_id??'', role: u.role, status: u.status })
    setError('')
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!editForm.full_name.trim()) { setError('Name is required'); return }
    setSaving(true)
    const { error } = await supabase.from('user_profiles').update({
      full_name:      editForm.full_name.trim(),
      country_id:     editForm.country_id     || null,
      institution_id: editForm.institution_id || null,
      role:           editForm.role,
      status:         editForm.status,
    }).eq('id', editTarget!.id)
    if (error) { setError(error.message); setSaving(false); return }
    const cMap: Record<string,string> = {}
    const iMap: Record<string,string> = {}
    countries.forEach(c => { cMap[c.id] = c.name })
    institutions.forEach(i => { iMap[i.id] = i.name })
    setUsers(prev => prev.map(u => u.id === editTarget!.id ? {
      ...u,
      full_name:        editForm.full_name.trim(),
      country_id:       editForm.country_id || null,
      country_name:     editForm.country_id ? (cMap[editForm.country_id]??null) : null,
      institution_id:   editForm.institution_id || null,
      institution_name: editForm.institution_id ? (iMap[editForm.institution_id]??null) : null,
      role:             editForm.role,
      status:           editForm.status,
    } : u))
    setSaving(false); setEditTarget(null)
  }

  async function doDelete(id: string) {
    setConfirmDel(null)
    await supabase.from('user_profiles').update({ status:'suspended', institution_id:null, country_id:null }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status:'suspended', institution_id:null, institution_name:null } : u))
  }

  // Filter institutions based on selected country in edit form
  const filteredInsts = editForm.country_id
    ? institutions.filter(i => i.country_id === editForm.country_id)
    : institutions

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole = !filterRole || u.role === filterRole
    const matchInst = !filterInst || u.institution_id === filterInst
    return matchSearch && matchRole && matchInst
  })

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'#0f2d1c' }}>All Users</h2>
        <p className="text-[13px] text-forest-400 mt-1">{users.length} users across all countries</p>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'#9ca3af' }}/>
          <input className="ti w-full pl-8" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="ti w-44" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ appearance:'none' }}>
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
        </select>
        <select className="ti w-52" value={filterInst} onChange={e => setFilterInst(e.target.value)} style={{ appearance:'none' }}>
          <option value="">All institutions</option>
          {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color:'#52b788' }}/></div>
      ) : (
        <div className="bg-white rounded-2xl border border-sand-300 overflow-hidden">
          <table className="rt w-full">
            <thead>
              <tr><th>User</th><th>Country</th><th>Institution</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-forest-300">No users found</td></tr>
              ) : filtered.map(u => {
                const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS.viewer
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ background:'#f0faf4', color:'#2d6a4f' }}>
                          {(u.full_name || u.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[12.5px] text-forest-700">{u.full_name || '—'}</div>
                          <div className="text-[10.5px] text-forest-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-[12px] text-forest-500">{u.country_name ?? '—'}</td>
                    <td className="text-[12px] text-forest-400 max-w-[180px] truncate">{u.institution_name ?? '—'}</td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="relative">
                          <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                            disabled={changing === u.id}
                            className="text-[10.5px] font-bold px-2 py-1 rounded-full border-0 cursor-pointer appearance-none pr-5"
                            style={{ background:rc.bg, color:rc.color }}>
                            {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
                          </select>
                          {changing === u.id && <Loader2 size={10} className="animate-spin absolute right-1.5 top-1/2 -translate-y-1/2" style={{ color:rc.color }}/>}
                        </div>
                        {u.institution_id && u.role !== 'institution_lead' && !['super_admin','country_admin','admin'].includes(u.role) && (
                          <button onClick={() => changeRole(u.id, 'institution_lead')} disabled={changing === u.id}
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full transition-all hover:opacity-80"
                            style={{ background:'#fef3c7', color:'#d97706', border:'1px solid #fde68a', whiteSpace:'nowrap' }}>
                            ★ Make Lead
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      {u.status === 'pending' ? (
                        <button onClick={() => changeStatus(u.id, 'active')}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background:'#fef3c7', color:'#d97706' }}>⚡ Activate</button>
                      ) : u.status === 'suspended' ? (
                        <button onClick={() => changeStatus(u.id, 'active')}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background:'#fee2e2', color:'#dc2626' }}>Suspended</button>
                      ) : (
                        <span className="text-[10px] text-forest-300">Active</span>
                      )}
                    </td>
                    <td className="text-[11px] text-forest-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50 transition-all"
                          style={{ color:'#3b82f6' }} title="Edit user">
                          <Pencil size={12}/>
                        </button>
                        <button onClick={() => setConfirmDel(u)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 transition-all"
                          style={{ color:'#dc2626' }} title="Remove user">
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setEditTarget(null) }}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-md" style={{ boxShadow:'0 24px 60px rgba(0,0,0,.25)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#0f2d1c' }}>Edit User</h3>
              <button onClick={() => setEditTarget(null)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-sand-100">
                <X size={14} style={{ color:'#9ca3af' }}/>
              </button>
            </div>
            <div className="mb-4 px-3 py-2 rounded-lg text-[12px]" style={{ background:'#f0faf4', color:'#2d6a4f' }}>
              {editTarget.email}
            </div>
            {error && <div className="mb-4 px-3 py-2 rounded-lg text-[12.5px]" style={{ background:'#fee2e2', color:'#dc2626' }}>{error}</div>}
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Full Name *</label>
                <input className="ti w-full" value={editForm.full_name}
                  onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} required/>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Country</label>
                <select className="ti w-full" value={editForm.country_id}
                  onChange={e => setEditForm(p => ({ ...p, country_id: e.target.value, institution_id:'' }))} style={{ appearance:'none' }}>
                  <option value="">No country</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Institution</label>
                <select className="ti w-full" value={editForm.institution_id}
                  onChange={e => setEditForm(p => ({ ...p, institution_id: e.target.value }))} style={{ appearance:'none' }}>
                  <option value="">No institution</option>
                  {filteredInsts.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                {editForm.country_id && <p className="text-[10.5px] text-forest-400 mt-1">Showing institutions for selected country.</p>}
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Role</label>
                <select className="ti w-full" value={editForm.role}
                  onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} style={{ appearance:'none' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Status</label>
                <select className="ti w-full" value={editForm.status}
                  onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={{ appearance:'none' }}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border"
                  style={{ borderColor:'#e8e3da', color:'#5c7566' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-[2] py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: saving ? '#9ca3af' : '#1b4332' }}>
                  {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-7 w-full max-w-sm" style={{ boxShadow:'0 24px 60px rgba(0,0,0,.25)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background:'#fee2e2' }}>
                <AlertTriangle size={18} style={{ color:'#dc2626' }}/>
              </div>
              <div>
                <div className="font-bold text-forest-800">Remove User?</div>
                <div className="text-[12px] text-forest-400 mt-0.5">{confirmDel.full_name || confirmDel.email}</div>
              </div>
            </div>
            <p className="text-[12.5px] text-forest-600 mb-5">
              This will suspend the user and remove their country and institution assignment. Their assessment data will be preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border"
                style={{ borderColor:'#e8e3da', color:'#5c7566' }}>Cancel</button>
              <button onClick={() => doDelete(confirmDel.id)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white"
                style={{ background:'#dc2626' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Search, Pencil, Trash2, X, Check, AlertTriangle } from 'lucide-react'

interface UserRow {
  id: string; full_name: string | null; email: string | null
  role: string; status: string; institution_name: string | null
  institution_id: string | null; created_at: string | null
}

const ROLES = ['institution_lead','contributor','viewer']
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  institution_lead: { bg:'rgba(251,191,36,.15)', color:'#d97706' },
  contributor:      { bg:'rgba(82,183,136,.15)', color:'#2d6a4f' },
  viewer:           { bg:'rgba(156,163,175,.15)', color:'#6b7280' },
}

export default function CountryAdminUsersPage() {
  const [users,       setUsers]      = useState<UserRow[]>([])
  const [institutions,setInst]       = useState<{id:string;name:string}[]>([])
  const [loading,     setLoading]    = useState(true)
  const [search,      setSearch]     = useState('')
  const [filterRole,  setFilterRole] = useState('')
  const [changing,    setChanging]   = useState<string | null>(null)
  const [editTarget,  setEditTarget] = useState<UserRow | null>(null)
  const [confirmDel,  setConfirmDel] = useState<UserRow | null>(null)
  const [editForm,    setEditForm]   = useState({ full_name:'', institution_id:'', role:'' })
  const [saving,      setSaving]     = useState(false)
  const [error,       setError]      = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await supabase.from('user_profiles').select('country_id').eq('id', user.id).single()
      if (!p?.country_id) { setLoading(false); return }

      const [{ data: users }, { data: insts }] = await Promise.all([
        supabase.from('user_profiles')
          .select('id, full_name, email, role, status, institution_id, created_at')
          .eq('country_id', p.country_id)
          .not('role', 'in', '("super_admin","country_admin","admin")')
          .order('status', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase.from('institutions').select('id, name').eq('country_id', p.country_id).order('name'),
      ])

      const iMap: Record<string,string> = {}
      insts?.forEach(i => { iMap[i.id] = i.name })
      setInst(insts ?? [])

      setUsers((users ?? []).map(u => ({
        id:               u.id,
        full_name:        u.full_name,
        email:            u.email,
        role:             u.role,
        status:           u.status ?? 'active',
        institution_name: u.institution_id ? (iMap[u.institution_id] ?? null) : null,
        institution_id:   u.institution_id ?? null,
        created_at:       u.created_at,
      })))
      setLoading(false)
    })
  }, [])

  async function activateUser(id: string) {
    await supabase.from('user_profiles').update({ status: 'active' }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'active' } : u))
  }
  async function suspendUser(id: string) {
    await supabase.from('user_profiles').update({ status: 'suspended' }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'suspended' } : u))
  }
  async function changeRole(id: string, role: string) {
    setChanging(id)
    await supabase.from('user_profiles').update({ role }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
    setChanging(null)
  }

  function openEdit(u: UserRow) {
    setEditTarget(u)
    setEditForm({ full_name: u.full_name ?? '', institution_id: u.institution_id ?? '', role: u.role })
    setError('')
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!editForm.full_name.trim()) { setError('Name is required'); return }
    setSaving(true)
    const { error } = await supabase.from('user_profiles').update({
      full_name:      editForm.full_name.trim(),
      institution_id: editForm.institution_id || null,
      role:           editForm.role,
    }).eq('id', editTarget!.id)
    if (error) { setError(error.message); setSaving(false); return }

    const iMap: Record<string,string> = {}
    institutions.forEach(i => { iMap[i.id] = i.name })
    setUsers(prev => prev.map(u => u.id === editTarget!.id ? {
      ...u,
      full_name:        editForm.full_name.trim(),
      institution_id:   editForm.institution_id || null,
      institution_name: editForm.institution_id ? (iMap[editForm.institution_id] ?? null) : null,
      role:             editForm.role,
    } : u))
    setSaving(false); setEditTarget(null)
  }

  async function handleDelete(u: UserRow) {
    setConfirmDel(u)
  }
  async function doDelete(id: string) {
    setConfirmDel(null)
    // Soft delete — set institution to null and suspend
    await supabase.from('user_profiles').update({ status: 'suspended', institution_id: null }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'suspended', institution_id: null, institution_name: null } : u))
  }

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole = !filterRole || u.role === filterRole
    return matchSearch && matchRole
  })

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'#0f2d1c' }}>Users</h2>
        <p className="text-[13px] text-forest-400 mt-1">{users.length} users across your country's institutions</p>
        {users.filter(u => u.status === 'pending').length > 0 && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{ background:'#fef3c7', border:'1px solid #fde68a' }}>
            <span className="text-[13px] font-bold" style={{ color:'#d97706' }}>
              ⚡ {users.filter(u => u.status === 'pending').length} user{users.filter(u => u.status === 'pending').length !== 1 ? 's' : ''} pending activation
            </span>
            <span className="text-[12px]" style={{ color:'#92400e' }}>— they cannot sign in until you activate them</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'#9ca3af' }}/>
          <input className="ti w-full pl-8" placeholder="Search by name or email…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="ti w-44" value={filterRole}
          onChange={e => setFilterRole(e.target.value)} style={{ appearance:'none' }}>
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
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
              <tr><th>User</th><th>Institution</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-forest-300">No users found</td></tr>
              ) : filtered.map(u => {
                const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS.viewer
                return (
                  <tr key={u.id} style={{ background: u.status === 'pending' ? '#fffbeb' : undefined }}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ background: u.status==='pending'?'#fef3c7':'#f0faf4', color: u.status==='pending'?'#d97706':'#2d6a4f' }}>
                          {(u.full_name || u.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[12.5px] text-forest-700">{u.full_name || '—'}</div>
                          <div className="text-[10.5px] text-forest-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-[12px] text-forest-500 max-w-[180px] truncate">{u.institution_name ?? '—'}</td>
                    <td>
                      <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                        disabled={changing === u.id || u.status === 'pending'}
                        className="text-[10.5px] font-bold px-2 py-1 rounded-full border-0 cursor-pointer appearance-none"
                        style={{ background: rc.bg, color: rc.color }}>
                        {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
                      </select>
                    </td>
                    <td>
                      {u.status === 'pending' ? (
                        <button onClick={() => activateUser(u.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold"
                          style={{ background:'#fef3c7', color:'#d97706', border:'1px solid #fde68a' }}>
                          ⚡ Activate
                        </button>
                      ) : u.status === 'suspended' ? (
                        <button onClick={() => activateUser(u.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold"
                          style={{ background:'#fee2e2', color:'#dc2626', border:'1px solid #fecaca' }}>
                          Reinstate
                        </button>
                      ) : (
                        <button onClick={() => suspendUser(u.id)}
                          className="text-[10px] text-forest-300 hover:text-red-400 transition-colors px-2">
                          Suspend
                        </button>
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
                        <button onClick={() => handleDelete(u)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 transition-all"
                          style={{ color:'#dc2626' }} title="Remove user from country">
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
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Institution</label>
                <select className="ti w-full" value={editForm.institution_id}
                  onChange={e => setEditForm(p => ({ ...p, institution_id: e.target.value }))} style={{ appearance:'none' }}>
                  <option value="">No institution</option>
                  {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-forest-600 mb-1.5">Role</label>
                <select className="ti w-full" value={editForm.role}
                  onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} style={{ appearance:'none' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
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

      {/* Confirm delete modal */}
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
              This will suspend the user and remove them from their institution. Their assessment data will be preserved. You can reinstate them later.
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
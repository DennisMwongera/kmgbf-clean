'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Users, Loader2, Search } from 'lucide-react'

interface UserRow {
  id: string; full_name: string | null; email: string | null
  role: string; status: string; institution_name: string | null; created_at: string | null
}

const ROLES = ['institution_lead','contributor','viewer']
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  institution_lead: { bg:'rgba(251,191,36,.15)', color:'#d97706' },
  contributor:      { bg:'rgba(82,183,136,.15)', color:'#2d6a4f' },
  viewer:           { bg:'rgba(156,163,175,.15)', color:'#6b7280' },
}

export default function CountryAdminUsersPage() {
  const [users,      setUsers]      = useState<UserRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [changing,   setChanging]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase
        .from('user_profiles').select('country_id').eq('id', user.id).single()
      if (!p?.country_id) { setLoading(false); return }

      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, status, institution_id, created_at')
        .eq('country_id', p.country_id)
        .not('role', 'in', '("super_admin","country_admin","admin")')
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })

      const { data: insts } = await supabase
        .from('institutions').select('id, name').eq('country_id', p.country_id)

      const iMap: Record<string,string> = {}
      insts?.forEach(i => { iMap[i.id] = i.name })

      setUsers((users ?? []).map(u => ({
        id:               u.id,
        full_name:        u.full_name,
        email:            u.email,
        role:             u.role,
        status:           u.status ?? 'active',
        institution_name: u.institution_id ? (iMap[u.institution_id] ?? null) : null,
        created_at:       u.created_at,
      })))
      setLoading(false)
    }
    load()
  }, [])

  async function activateUser(userId: string) {
    await supabase.from('user_profiles').update({ status: 'active' }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u))
  }

  async function suspendUser(userId: string) {
    await supabase.from('user_profiles').update({ status: 'suspended' }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'suspended' } : u))
  }

  async function changeRole(userId: string, newRole: string) {
    setChanging(userId)
    await supabase.from('user_profiles').update({ role: newRole }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    setChanging(null)
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
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'#0f2d1c' }}>
          Users
        </h2>
        <p className="text-[13px] text-forest-400 mt-1">{users.length} users across your country's institutions</p>
        {users.filter(u => u.status === 'pending').length > 0 && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{ background:'#fef3c7', border:'1px solid #fde68a' }}>
            <span className="text-[13px] font-bold" style={{ color:'#d97706' }}>
              ⚡ {users.filter(u => u.status === 'pending').length} user{users.filter(u => u.status === 'pending').length !== 1 ? 's' : ''} pending activation
            </span>
            <span className="text-[12px]" style={{ color:'#92400e' }}>
              — they cannot sign in until you activate them
            </span>
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
              <tr><th>User</th><th>Institution</th><th>Role</th><th>Status</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-forest-300">No users found</td></tr>
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
                    <td className="text-[12px] text-forest-500 max-w-[180px] truncate">
                      {u.institution_name ?? '—'}
                    </td>
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
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-all"
                          style={{ background:'#fef3c7', color:'#d97706', border:'1px solid #fde68a' }}>
                          ⚡ Activate
                        </button>
                      ) : u.status === 'suspended' ? (
                        <button onClick={() => activateUser(u.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold"
                          style={{ background:'#fee2e2', color:'#dc2626', border:'1px solid #fecaca' }}>
                          Suspended
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
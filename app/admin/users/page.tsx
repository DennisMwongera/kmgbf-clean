'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

const ROLES = ['admin','institution_lead','contributor','viewer']
const ROLE_COLORS: Record<string,{bg:string;text:string}> = {
  admin:            { bg:'#fee2e2', text:'#dc2626' },
  institution_lead: { bg:'#fef3c7', text:'#d97706' },
  contributor:      { bg:'#d8f3dc', text:'#1b4332' },
  viewer:           { bg:'#e0e7ff', text:'#4338ca' },
}

interface User {
  id: string; full_name: string|null; email: string|null
  role: string; institution_id: string|null; created_at: string
  institution_name?: string
}
interface Institution { id: string; name: string }

export default function UsersPage() {
  const [users, setUsers]       = useState<User[]>([])
  const [insts, setInsts]       = useState<Institution[]>([])
  const [loading, setLoading]   = useState(true)
  const [search,  setSearch]    = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [instFilter, setInstFilter] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: userData }, { data: instData }] = await Promise.all([
      supabase.from('user_profiles').select('*').order('created_at', { ascending:false }),
      supabase.from('institutions').select('id, name').order('name'),
    ])
    const instMap: Record<string,string> = {}
    instData?.forEach(i => { instMap[i.id] = i.name })
    setUsers((userData??[]).map(u => ({ ...u, institution_name: u.institution_id ? instMap[u.institution_id] : undefined })))
    setInsts(instData ?? [])
    setLoading(false)
  }

  async function changeRole(userId: string, role: string) {
    await supabase.from('user_profiles').update({ role: role as any }).eq('id', userId)
    await load()
  }

  async function changeInstitution(userId: string, institutionId: string) {
    await supabase.from('user_profiles').update({ institution_id: institutionId || null }).eq('id', userId)
    await load()
  }

  const filtered = users.filter(u => {
    const matchSearch = search === '' || (u.full_name??'').toLowerCase().includes(search.toLowerCase()) || (u.email??'').toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter === '' || u.role === roleFilter
    const matchInst   = instFilter === '' || u.institution_id === instFilter
    return matchSearch && matchRole && matchInst
  })

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c' }}>Users</h2>
          <p className="text-[13.5px] text-forest-400 mt-1">{users.length} total users across all institutions.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input className="form-input flex-1 max-w-xs" placeholder="Search name or email…"
          defaultValue={search}
          onChange={e => setSearch(e.target.value)}/>
        <select className="form-input w-44" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
        </select>
        <select className="form-input w-56" value={instFilter} onChange={e => setInstFilter(e.target.value)}>
          <option value="">All institutions</option>
          <option value="__none__">No institution</option>
          {insts.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-forest-400">Loading…</div>
      ) : (
        <div className="card">
          <div className="rounded-xl overflow-hidden border border-sand-300">
            <table className="rt w-full">
              <thead>
                <tr><th>User</th><th>Role</th><th>Institution</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-forest-400">No users match your filters.</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                          style={{ background:'rgba(82,183,136,.2)', color:'#2d6a4f' }}>
                          {(u.full_name||u.email||'?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-forest-700">{u.full_name || '—'}</div>
                          <div className="text-[11px] text-forest-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-sand-300 cursor-pointer outline-none font-bold"
                        style={{ ...(ROLE_COLORS[u.role]||{}) }}
                        value={u.role}
                        onChange={e => changeRole(u.id, e.target.value)}>
                        {ROLES.map(r => (
                          <option key={r} value={r} style={{ background:'white', color:'#131f18', fontWeight:400 }}>
                            {r.replace('_',' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="form-input text-[12px] py-1.5 max-w-[200px]"
                        value={u.institution_id ?? ''}
                        onChange={e => changeInstitution(u.id, e.target.value)}>
                        <option value="">— No institution —</option>
                        {insts.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </td>
                    <td className="text-[12px] text-forest-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-forest-400 mt-3">
            Role and institution changes take effect immediately.
          </p>
        </div>
      )}
    </div>
  )
}
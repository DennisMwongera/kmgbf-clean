'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  institution_lead: { bg: '#fef3c7', text: '#d97706' },
  contributor:      { bg: '#d8f3dc', text: '#1b4332' },
  viewer:           { bg: '#e0e7ff', text: '#4338ca' },
  admin:            { bg: '#fee2e2', text: '#dc2626' },
}

interface Member {
  id: string
  full_name: string | null
  email: string | null
  role: string
  created_at: string
}

export default function TeamPage() {
  const user        = useStore(s => s.user)
  const [members,   setMembers]   = useState<Member[]>([])
  const [instName,  setInstName]  = useState('')
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!user?.institution_id) { setLoading(false); return }

    async function load() {
      // Load institution name
      const { data: inst } = await supabase
        .from('institutions')
        .select('name')
        .eq('id', user!.institution_id!)
        .single()
      if (inst) setInstName(inst.name)

      // Load ONLY members of this exact institution
      const { data: memberData } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, created_at')
        .eq('institution_id', user!.institution_id!)
        .order('role')
        .order('full_name')

      setMembers(memberData ?? [])
      setLoading(false)
    }
    load()
  }, [user?.institution_id])

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-forest-400">Loading…</div>
  }

  if (!user?.institution_id) {
    return (
      <div className="fade-in">
        <div className="mb-6">
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c' }}>Team</h2>
        </div>
        <div className="card text-center py-14">
          <div className="text-4xl mb-3">🏛️</div>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, color:'#0f2d1c', marginBottom:8 }}>
            No institution linked
          </h3>
          <p className="text-[13px] text-forest-400 max-w-sm mx-auto">
            Your account isn't linked to an institution yet. Contact your country admin.
          </p>
        </div>
      </div>
    )
  }

  const leads        = members.filter(m => m.role === 'institution_lead')
  const contributors = members.filter(m => m.role === 'contributor')
  const viewers      = members.filter(m => m.role === 'viewer')

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c' }}>
          Team
        </h2>
        <p className="text-[13.5px] text-forest-400 mt-1">
          {members.length} member{members.length !== 1 ? 's' : ''} in <strong>{instName}</strong>
        </p>
      </div>

      {/* Role groups */}
      <div className="space-y-5">

        {/* Institution Leads */}
        {leads.length > 0 && (
          <div className="card">
            <div className="card-title mb-3">👑 Institution Lead{leads.length > 1 ? 's' : ''}</div>
            <MemberList members={leads} currentUserId={user.id}/>
          </div>
        )}

        {/* Contributors */}
        <div className="card">
          <div className="card-title mb-3">✏️ Contributors ({contributors.length})</div>
          {contributors.length === 0
            ? <p className="text-[13px] text-forest-400">No contributors yet.</p>
            : <MemberList members={contributors} currentUserId={user.id}/>
          }
        </div>

        {/* Viewers */}
        {viewers.length > 0 && (
          <div className="card">
            <div className="card-title mb-3">👁️ Viewers ({viewers.length})</div>
            <MemberList members={viewers} currentUserId={user.id}/>
          </div>
        )}

      </div>

      {/* Full table */}
      <div className="card mt-5">
        <div className="card-title mb-3">All Members ({members.length})</div>
        <div className="rounded-xl overflow-hidden border border-sand-300">
          <table className="rt w-full">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{ background: m.id === user?.id ? '#f0faf4' : undefined }}>
                  <td className="font-semibold text-[13px]">
                    {m.full_name || '—'}
                    {m.id === user?.id && (
                      <span className="ml-2 text-[10px] text-forest-400">(you)</span>
                    )}
                  </td>
                  <td className="text-[12px] text-forest-400">{m.email}</td>
                  <td>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold"
                      style={{ ...(ROLE_COLORS[m.role] ?? { bg:'#f3f4f6', text:'#6b7280' }) }}>
                      {m.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-[12px] text-forest-400">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MemberList({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  return (
    <div className="space-y-2">
      {members.map(m => (
        <div key={m.id}
          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-sand-300"
          style={{ background: m.id === currentUserId ? '#f0faf4' : '#fafaf8' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
            style={{ background:'rgba(82,183,136,.2)', color:'#2d6a4f' }}>
            {(m.full_name || m.email || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold text-forest-700 truncate">
              {m.full_name || '—'}
              {m.id === currentUserId && (
                <span className="ml-1.5 text-[10px] text-forest-400">(you)</span>
              )}
            </div>
            <div className="text-[11px] text-forest-400 truncate">{m.email}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
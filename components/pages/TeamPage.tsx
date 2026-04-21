'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:            { bg: '#fee2e2', text: '#dc2626' },
  institution_lead: { bg: '#fef3c7', text: '#d97706' },
  contributor:      { bg: '#d8f3dc', text: '#1b4332' },
  viewer:           { bg: '#e0e7ff', text: '#4338ca' },
}

interface Member {
  id: string; full_name: string | null; email: string | null
  role: string; created_at: string
}

interface Institution {
  id: string; name: string; type: string | null; level: string | null
  country: string | null; focal_name: string | null; focal_email: string | null
  mandate: string | null
}

export default function TeamPage() {
  const user = useStore(s => s.user)
  const [members,  setMembers]  = useState<Member[]>([])
  const [inst,     setInst]     = useState<Institution | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user?.institution_id) { setLoading(false); return }
    async function load() {
      const [{ data: instData }, { data: memberData }] = await Promise.all([
        supabase.from('institutions').select('*').eq('id', user!.institution_id!).single(),
        supabase.from('user_profiles').select('id, full_name, email, role, created_at')
          .eq('institution_id', user!.institution_id!)
          .order('role').order('full_name'),
      ])
      if (instData) setInst(instData)
      if (memberData) setMembers(memberData)
      setLoading(false)
    }
    load()
  }, [user])

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
            Your account isn't linked to an institution yet. Contact your administrator to be assigned to one.
          </p>
        </div>
      </div>
    )
  }

  const leads       = members.filter(m => m.role === 'institution_lead')
  const contributors = members.filter(m => m.role === 'contributor')
  const viewers     = members.filter(m => m.role === 'viewer')

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c' }}>Team</h2>
        <p className="text-[13.5px] text-forest-400 mt-1">Members of your institution.</p>
      </div>

      {/* Institution card */}
      {inst && (
        <div className="card mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="card-title mb-2">{inst.name}</div>
              <div className="flex gap-2 flex-wrap">
                {inst.type  && <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background:'#f0faf4', color:'#2d6a4f' }}>{inst.type}</span>}
                {inst.level && <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background:'#dbeafe', color:'#1d4ed8' }}>{inst.level}</span>}
                {inst.country && <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background:'#f3f4f6', color:'#6b7280' }}>{inst.country}</span>}
              </div>
            </div>
            <div className="text-right text-[12px] text-forest-400">
              {inst.focal_name  && <div className="font-medium text-forest-600">{inst.focal_name}</div>}
              {inst.focal_email && <div>{inst.focal_email}</div>}
            </div>
          </div>
          {inst.mandate && (
            <p className="text-[12.5px] text-forest-400 mt-3 pt-3 border-t border-forest-50 leading-relaxed">{inst.mandate}</p>
          )}
        </div>
      )}

      {/* Members by role group */}
      <div className="grid grid-cols-2 gap-5">
        {/* Left: leads + viewers */}
        <div className="space-y-5">
          {leads.length > 0 && (
            <div className="card">
              <div className="card-title">👑 Institution Leads</div>
              <MemberList members={leads}/>
            </div>
          )}
          {viewers.length > 0 && (
            <div className="card">
              <div className="card-title">👁️ Viewers</div>
              <MemberList members={viewers}/>
            </div>
          )}
        </div>

        {/* Right: contributors */}
        <div className="card">
          <div className="card-title">✏️ Contributors ({contributors.length})</div>
          {contributors.length === 0
            ? <p className="text-[13px] text-forest-400">No contributors yet.</p>
            : <MemberList members={contributors}/>
          }
        </div>
      </div>

      {/* Full table */}
      <div className="card mt-5">
        <div className="card-title">All Members ({members.length})</div>
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
                    {m.id === user?.id && <span className="ml-2 text-[10px] text-forest-400">(you)</span>}
                  </td>
                  <td className="text-[12px] text-forest-400">{m.email}</td>
                  <td>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold"
                      style={{ ...(ROLE_COLORS[m.role] ?? {}) }}>
                      {m.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-[12px] text-forest-400">{new Date(m.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MemberList({ members }: { members: Member[] }) {
  return (
    <div className="space-y-2">
      {members.map(m => (
        <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-sand-300 bg-sand-100/50">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
            style={{ background:'rgba(82,183,136,.2)', color:'#2d6a4f' }}>
            {(m.full_name || m.email || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold text-forest-700 truncate">{m.full_name || '—'}</div>
            <div className="text-[11px] text-forest-400 truncate">{m.email}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
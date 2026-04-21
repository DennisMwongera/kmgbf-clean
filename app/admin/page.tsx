'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

interface Stats {
  institutions: number
  users:        number
  assessments:  number
  submitted:    number
}

interface RecentInstitution {
  id:         string
  name:       string
  type:       string | null
  level:      string | null
  created_at: string
  user_count: number
}

export default function AdminPage() {
  const [stats, setStats]   = useState<Stats>({ institutions:0, users:0, assessments:0, submitted:0 })
  const [insts, setInsts]   = useState<RecentInstitution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: instCount },
        { count: userCount },
        { count: assessCount },
        { count: subCount },
        { data: instData },
      ] = await Promise.all([
        supabase.from('institutions').select('*', { count:'exact', head:true }),
        supabase.from('user_profiles').select('*', { count:'exact', head:true }),
        supabase.from('assessments').select('*', { count:'exact', head:true }),
        supabase.from('assessments').select('*', { count:'exact', head:true }).in('status',['submitted','approved']),
        supabase.from('institutions').select('id, name, type, level, created_at').order('created_at', { ascending:false }).limit(8),
      ])

      setStats({ institutions:instCount??0, users:userCount??0, assessments:assessCount??0, submitted:subCount??0 })

      // Get user counts per institution
      if (instData) {
        const counts = await Promise.all(instData.map(async inst => {
          const { count } = await supabase.from('user_profiles').select('*', { count:'exact', head:true }).eq('institution_id', inst.id)
          return { ...inst, user_count: count ?? 0 }
        }))
        setInsts(counts)
      }

      setLoading(false)
    }
    load()
  }, [])

  const SC = ({ label, value, accent }: { label:string; value:number|string; accent:string }) => (
    <div className="bg-white rounded-xl px-5 py-4 border border-sand-300/60"
      style={{ borderTop:`3px solid ${accent}`, boxShadow:'0 2px 12px rgba(15,45,28,.08)' }}>
      <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1.5">{label}</div>
      <div className="text-[28px] text-forest-700" style={{ fontFamily:'var(--font-mono)', fontWeight:300 }}>{value}</div>
    </div>
  )

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c' }}>Admin Overview</h2>
          <p className="text-[13.5px] text-forest-400 mt-1">Global view across all institutions and users.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/institutions" className="btn btn-secondary">🏛️ Manage Institutions</Link>
          <Link href="/admin/users"        className="btn btn-primary">👥 Manage Users</Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-forest-400">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-7">
            <SC label="Institutions" value={stats.institutions} accent="#52b788"/>
            <SC label="Total Users"  value={stats.users}        accent="#5b8dee"/>
            <SC label="Assessments"  value={stats.assessments}  accent="#c8860a"/>
            <SC label="Submitted"    value={stats.submitted}    accent="#e07a5f"/>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="card-title mb-0">🏛️ Institutions</div>
              <Link href="/admin/institutions" className="btn btn-ghost btn-sm">View all →</Link>
            </div>
            {insts.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-3xl mb-2">🏛️</div>
                <p className="text-[13px] text-forest-400 mb-4">No institutions yet.</p>
                <Link href="/admin/institutions" className="btn btn-primary">Create first institution</Link>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-sand-300">
                <table className="rt w-full">
                  <thead><tr><th>Institution</th><th>Type</th><th>Level</th><th>Users</th><th>Created</th><th></th></tr></thead>
                  <tbody>
                    {insts.map(inst => (
                      <tr key={inst.id}>
                        <td className="font-semibold text-[13px]">{inst.name}</td>
                        <td className="text-[12px] text-forest-400">{inst.type ?? '—'}</td>
                        <td className="text-[12px] text-forest-400">{inst.level ?? '—'}</td>
                        <td>
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
                            style={{ background:'#d8f3dc', color:'#1b4332' }}>
                            {inst.user_count}
                          </span>
                        </td>
                        <td className="text-[12px] text-forest-400">{new Date(inst.created_at).toLocaleDateString()}</td>
                        <td>
                          <Link href={`/admin/institutions/${inst.id}`} className="btn btn-ghost btn-sm">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
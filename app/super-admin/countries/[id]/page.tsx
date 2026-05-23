'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Building2, Users, BarChart2, ArrowLeft, Loader2, ChevronRight, FileCheck } from 'lucide-react'
import Link from 'next/link'

interface Props { params: { id: string } }

interface Institution {
  id: string; name: string; type: string | null; level: string | null
  status: string | null; answered_count: number; overall_score: number | null
  updated_at: string | null
}

function scoreColor(v: number | null) {
  if (v === null) return '#9ca3af'
  if (v < 2) return '#dc2626'; if (v < 3) return '#ca8a04'
  if (v < 4) return '#16a34a'; return '#047857'
}

export default function SuperAdminCountryDetailPage({ params }: Props) {
  const [country,      setCountry]      = useState<any>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [users,        setUsers]        = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    async function load() {
      // Country info
      const { data: c } = await supabase
        .from('countries').select('*').eq('id', params.id).single()
      setCountry(c)

      // Institutions
      const { data: insts } = await supabase
        .from('institutions')
        .select('id, name, type, level')
        .eq('country_id', params.id)
        .order('name')

      if (!insts?.length) { setLoading(false); return }

      // Assessments
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

      // Core scores
      const { data: coreRows } = assessIds.length
        ? await supabase.from('core_responses').select('assessment_id, score').in('assessment_id', assessIds)
        : { data: [] }

      const countMap: Record<string, number> = {}
      const scoreMap: Record<string, number[]> = {}
      coreRows?.forEach(r => {
        if (r.score !== null && r.score !== -1 && r.score >= 0) {
          countMap[r.assessment_id] = (countMap[r.assessment_id] ?? 0) + 1
          if (!scoreMap[r.assessment_id]) scoreMap[r.assessment_id] = []
          scoreMap[r.assessment_id].push(r.score)
        }
      })

      setInstitutions(insts.map(inst => {
        const a = latestByInst[inst.id]
        const aid = a?.id
        const scores = aid ? (scoreMap[aid] ?? []) : []
        return {
          ...inst,
          status:         a?.status ?? null,
          updated_at:     a?.updated_at ?? null,
          answered_count: aid ? (countMap[aid] ?? 0) : 0,
          overall_score:  scores.length ? scores.reduce((x,y)=>x+y,0)/scores.length : null,
        }
      }))

      // Users
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, institution_id')
        .eq('country_id', params.id)
        .order('role')

      // Map institution names
      const instNameMap: Record<string,string> = {}
      insts?.forEach(i => { instNameMap[i.id] = i.name })
      setUsers((users ?? []).map(u => ({
        ...u,
        institution_name: u.institution_id ? (instNameMap[u.institution_id] ?? null) : null
      })))
      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin" style={{ color:'#52b788' }}/>
    </div>
  )

  return (
    <div className="fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/super-admin/countries" className="btn btn-ghost btn-sm flex items-center gap-1">
          <ArrowLeft size={12}/> Countries
        </Link>
        <span className="text-sand-300">/</span>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:'#0f2d1c' }}>
            {country?.name}
          </h2>
          <div className="text-[12px] text-forest-400">{country?.region} · {country?.code}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label:'Institutions', value: institutions.length, Icon: Building2 },
          { label:'Users',        value: users.length,        Icon: Users      },
          { label:'With Assessments', value: institutions.filter(i=>i.status).length, Icon: FileCheck },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="bg-white rounded-xl px-5 py-4 border border-sand-300"
            style={{ boxShadow:'0 2px 8px rgba(15,45,28,.06)' }}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1">
              <Icon size={10}/> {label}
            </div>
            <div className="text-[26px] font-light text-forest-700" style={{ fontFamily:'var(--font-mono)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Institutions */}
      <div className="mb-6">
        <h3 className="text-[14px] font-bold text-forest-700 mb-3">Institutions</h3>
        <div className="bg-white rounded-2xl border border-sand-300 overflow-hidden">
          <table className="rt w-full">
            <thead>
              <tr>
                <th>Institution</th><th>Score</th><th>Progress</th><th>Status</th><th>Updated</th><th></th>
              </tr>
            </thead>
            <tbody>
              {institutions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-forest-300">No institutions</td></tr>
              ) : institutions.map(i => (
                <tr key={i.id}>
                  <td>
                    <div className="font-semibold text-[12.5px] text-forest-700">{i.name}</div>
                    {i.type && <div className="text-[10px] text-forest-400">{i.type}</div>}
                  </td>
                  <td>
                    {i.overall_score !== null
                      ? <span className="font-bold" style={{ fontFamily:'var(--font-mono)', color:scoreColor(i.overall_score) }}>{i.overall_score.toFixed(2)}</span>
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
                    {i.status ? (
                      <span className="chip text-[10px]" style={{
                        background: i.status==='approved'?'#d8f3dc':i.status==='submitted'?'#dbeafe':i.status==='in_review'?'#ede9fe':'#fef3c7',
                        color:      i.status==='approved'?'#1b4332':i.status==='submitted'?'#1d4ed8':i.status==='in_review'?'#6d28d9':'#d97706',
                      }}>{i.status.replace('_',' ')}</span>
                    ) : <span className="text-[10px] text-forest-300">Not started</span>}
                  </td>
                  <td className="text-[11px] text-forest-400">
                    {i.updated_at ? new Date(i.updated_at).toLocaleDateString() : '—'}
                  </td>
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
      </div>

      {/* Users */}
      <div>
        <h3 className="text-[14px] font-bold text-forest-700 mb-3">Users ({users.length})</h3>
        <div className="bg-white rounded-2xl border border-sand-300 overflow-hidden">
          <table className="rt w-full">
            <thead><tr><th>User</th><th>Institution</th><th>Role</th></tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-forest-300">No users</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="font-semibold text-[12.5px] text-forest-700">{u.full_name || '—'}</div>
                    <div className="text-[10.5px] text-forest-400">{u.email}</div>
                  </td>
                  <td className="text-[12px] text-forest-500">{(u as any).institution_name ?? '—'}</td>
                  <td>
                    <span className="chip text-[10px]">{u.role?.replace(/_/g,' ')}</span>
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
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Building2, Users, BarChart2, FileCheck, Clock, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Institution {
  id: string; name: string; type: string | null; level: string | null
  assessment_id: string | null; status: string | null
  updated_at: string | null; answered_count: number; overall_score: number | null
}

function scoreColor(v: number | null) {
  if (v === null) return '#9ca3af'
  if (v < 1) return '#dc2626'; if (v < 2) return '#ea580c'
  if (v < 3) return '#ca8a04'; if (v < 4) return '#16a34a'
  return '#047857'
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { bg: string; color: string; label: string; Icon: any }> = {
    submitted:   { bg:'#dbeafe', color:'#1d4ed8', label:'Submitted',   Icon: FileCheck   },
    in_review:   { bg:'#ede9fe', color:'#6d28d9', label:'In Review',   Icon: Clock       },
    approved:    { bg:'#d8f3dc', color:'#1b4332', label:'Approved',    Icon: CheckCircle },
    in_progress: { bg:'#fef3c7', color:'#d97706', label:'In Progress', Icon: Clock       },
  }
  const s = map[status ?? ''] ?? { bg:'#f3f4f6', color:'#9ca3af', label:'Not started', Icon: AlertCircle }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background:s.bg, color:s.color }}>
      <s.Icon size={9}/> {s.label}
    </span>
  )
}

export default function CountryAdminOverviewPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(false)
  const [countryId,    setCountryId]    = useState<string | null>(null)
  const [countryName,  setCountryName]  = useState('')

  useEffect(() => {
    async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('country_id')
        .eq('id', user.id)
        .single()

      if (!profile?.country_id) {
        setLoading(false)
        setCountryId('__none__')
        return
      }
      setCountryId(profile.country_id)

      // Get country name
      const { data: country } = await supabase
        .from('countries').select('name').eq('id', profile.country_id).single()
      setCountryName(country?.name ?? '')

      // Get all institutions in this country
      const { data: insts } = await supabase
        .from('institutions')
        .select('id, name, type, level')
        .eq('country_id', profile.country_id)
        .order('name')

      if (!insts?.length) { setLoading(false); return }

      // Get latest assessment per institution
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

      // Get core response counts
      const { data: coreRows } = assessIds.length
        ? await supabase.from('core_responses').select('assessment_id, score').in('assessment_id', assessIds)
        : { data: [] }

      const countByAssess: Record<string, number> = {}
      coreRows?.forEach(r => {
        if (r.score !== null && r.score !== -1)
          countByAssess[r.assessment_id] = (countByAssess[r.assessment_id] ?? 0) + 1
      })

      // Compute overall score per assessment
      const scoreByAssess: Record<string, number | null> = {}
      const grouped: Record<string, number[]> = {}
      coreRows?.forEach(r => {
        if (r.score !== null && r.score !== -1 && r.score >= 0) {
          if (!grouped[r.assessment_id]) grouped[r.assessment_id] = []
          grouped[r.assessment_id].push(r.score)
        }
      })
      Object.entries(grouped).forEach(([aid, scores]) => {
        scoreByAssess[aid] = scores.reduce((a,b) => a+b, 0) / scores.length
      })

      setInstitutions(insts.map(inst => {
        const assessment = latestByInst[inst.id]
        const aid = assessment?.id
        return {
          ...inst,
          assessment_id:  aid ?? null,
          status:         assessment?.status ?? null,
          updated_at:     assessment?.updated_at ?? null,
          answered_count: aid ? (countByAssess[aid] ?? 0) : 0,
          overall_score:  aid ? (scoreByAssess[aid] ?? null) : null,
        }
      }))
      setLoading(false)
    }
    load()
  }, [])

  const submitted   = institutions.filter(i => i.status === 'submitted').length
  const inReview    = institutions.filter(i => i.status === 'in_review').length
  const approved    = institutions.filter(i => i.status === 'approved').length
  const inProgress  = institutions.filter(i => i.status === 'in_progress').length
  const notStarted  = institutions.filter(i => !i.status).length

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'#0f2d1c' }}>
          {countryName} — Overview
        </h2>
        <p className="text-[13px] text-forest-400 mt-1">
          Monitor all institutions and assessment progress in your country.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label:'Institutions',  value: institutions.length, accent:'#52b788', Icon: Building2  },
          { label:'Submitted',     value: submitted,           accent:'#5b8dee', Icon: FileCheck  },
          { label:'In Review',     value: inReview,            accent:'#7c3aed', Icon: Clock      },
          { label:'Approved',      value: approved,            accent:'#16a34a', Icon: CheckCircle},
          { label:'Not Started',   value: notStarted,          accent:'#9ca3af', Icon: AlertCircle},
        ].map(({ label, value, accent, Icon }) => (
          <div key={label} className="bg-white rounded-xl px-4 py-3.5 border border-sand-300/60"
            style={{ borderTop:`3px solid ${accent}`, boxShadow:'0 2px 8px rgba(15,45,28,.06)' }}>
            <div className="flex items-center gap-1.5 text-[9.5px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1">
              <Icon size={10}/> {label}
            </div>
            <div className="text-[24px] text-forest-700" style={{ fontFamily:'var(--font-mono)', fontWeight:300 }}>
              {loading ? '…' : value}
            </div>
          </div>
        ))}
      </div>

      {/* Institutions table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color:'#52b788' }}/>
        </div>
      ) : institutions.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 size={32} className="mx-auto mb-3" style={{ color:'#d8f3dc' }}/>
          <div className="text-forest-400 text-[13px]">No institutions found for your country.</div>
          <Link href="/admin/institutions" className="btn btn-primary mt-4 inline-flex">
            Add Institution
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-sand-300 overflow-hidden"
          style={{ boxShadow:'0 2px 12px rgba(15,45,28,.06)' }}>
          <table className="rt w-full">
            <thead>
              <tr>
                <th>Institution</th>
                <th>Type</th>
                <th>Overall Score</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {institutions.map(inst => (
                <tr key={inst.id}>
                  <td>
                    <div className="font-semibold text-[12.5px] text-forest-700">{inst.name}</div>
                    {inst.level && <div className="text-[10px] text-forest-400">{inst.level}</div>}
                  </td>
                  <td className="text-[11.5px] text-forest-400">{inst.type ?? '—'}</td>
                  <td>
                    {inst.overall_score !== null ? (
                      <span className="font-bold text-[13px]" style={{ fontFamily:'var(--font-mono)', color:scoreColor(inst.overall_score) }}>
                        {inst.overall_score.toFixed(2)}
                      </span>
                    ) : <span className="text-forest-300 text-[12px]">—</span>}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background:'#e8e3da' }}>
                        <div className="h-full rounded-full" style={{
                          width:`${(inst.answered_count/50)*100}%`,
                          background: inst.answered_count === 50 ? '#52b788' : '#95d5b2'
                        }}/>
                      </div>
                      <span className="text-[11px] font-medium text-forest-400">{inst.answered_count}/50</span>
                    </div>
                  </td>
                  <td><StatusBadge status={inst.status}/></td>
                  <td className="text-[11px] text-forest-400">
                    {inst.updated_at ? new Date(inst.updated_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <Link href={`/country-admin/institutions/${inst.id}`}
                      className="btn btn-ghost btn-sm flex items-center gap-1">
                      Manage <ChevronRight size={11}/>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
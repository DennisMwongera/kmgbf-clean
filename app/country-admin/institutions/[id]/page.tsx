'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, ClipboardList, Target, BookOpen, Building2, Loader2, ChevronRight, Users } from 'lucide-react'
import Link from 'next/link'
import { DIMENSIONS, CORE_QUESTIONS, KMGBF_TARGETS } from '@/lib/constants'

interface Props { params: { id: string } }

function scoreColor(v: number | null) {
  if (v === null) return '#9ca3af'
  if (v < 1) return '#dc2626'; if (v < 2) return '#ea580c'
  if (v < 3) return '#ca8a04'; if (v < 4) return '#16a34a'; return '#047857'
}
function scoreBg(v: number | null) {
  if (v === null) return '#f3f4f6'
  if (v < 1) return '#fee2e2'; if (v < 2) return '#ffedd5'
  if (v < 3) return '#fef9c3'; if (v < 4) return '#dcfce7'; return '#d8f3dc'
}
function interpret(v: number | null) {
  if (v === null) return 'Not assessed'
  if (v < 1) return 'Critical'; if (v < 2) return 'Very limited'
  if (v < 2.5) return 'Basic'; if (v < 3.5) return 'Moderate'
  if (v < 4.5) return 'Strong'; return 'Fully adequate'
}
function ScoreChip({ v }: { v: number | null }) {
  return <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
    style={{ background: scoreBg(v), color: scoreColor(v) }}>{v !== null ? v.toFixed(2) : '—'}</span>
}

type Tab = 'overview' | 'core' | 'targets' | 'cdp' | 'users'

export default function CountryAdminInstitutionDetailPage({ params }: Props) {
  const [institution, setInstitution] = useState<any>(null)
  const [assessment,  setAssessment]  = useState<any>(null)
  const [coreRows,    setCoreRows]    = useState<any[]>([])
  const [targetRows,  setTargetRows]  = useState<any[]>([])
  const [cdpRows,     setCdpRows]     = useState<any[]>([])
  const [instUsers,   setInstUsers]   = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState<Tab>('overview')

  useEffect(() => {
    async function load() {
      const { data: inst } = await supabase.from('institutions').select('*').eq('id', params.id).single()
      setInstitution(inst)

      const { data: assessments } = await supabase.from('assessments').select('*')
        .eq('institution_id', params.id).order('updated_at', { ascending: false }).limit(1)
      const a = assessments?.[0] ?? null
      setAssessment(a)

      const { data: users } = await supabase.from('user_profiles')
        .select('id, full_name, email, role').eq('institution_id', params.id).order('role')
      setInstUsers(users ?? [])

      if (a) {
        const [{ data: core }, { data: targets }, { data: cdp }] = await Promise.all([
          supabase.from('core_responses').select('*').eq('assessment_id', a.id).order('question_index'),
          supabase.from('target_responses').select('*').eq('assessment_id', a.id),
          supabase.from('cdp_rows').select('*').eq('assessment_id', a.id).eq('archived', false).order('sort_order'),
        ])
        setCoreRows(core ?? [])
        setTargetRows(targets ?? [])
        setCdpRows(cdp ?? [])
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  const dimScores: Record<string, number | null> = {}
  DIMENSIONS.forEach(dim => {
    const qIdxs = CORE_QUESTIONS.map((q,i) => ({q,i})).filter(({q}) => q.section === dim).map(({i}) => i)
    const rows  = coreRows.filter(r => qIdxs.includes(r.question_index) && r.score !== null && r.score !== -1)
    dimScores[dim] = rows.length > 0 ? rows.reduce((s,r) => s+(r.score??0),0)/rows.length : null
  })
  const validDims    = Object.values(dimScores).filter((v): v is number => v !== null)
  const overallScore = validDims.length > 0 ? validDims.reduce((a,b) => a+b,0)/validDims.length : null
  const answeredCount = coreRows.filter(r => r.score !== null && r.score !== -1).length

  const TABS: { id: Tab; label: string; Icon: any }[] = [
    { id:'overview', label:'Overview',  Icon: Building2    },
    { id:'core',     label:'Core (50)', Icon: ClipboardList },
    { id:'targets',  label:'Targets',   Icon: Target       },
    { id:'cdp',      label:'Dev. Plan', Icon: BookOpen     },
    { id:'users',    label:'Users',     Icon: Users        },
  ]

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin" style={{ color:'#52b788' }}/></div>

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-[12.5px]">
        <Link href="/country-admin/institutions" className="text-forest-400 hover:text-forest-600 flex items-center gap-1">
          <ArrowLeft size={12}/> Institutions
        </Link>
        <ChevronRight size={12} style={{ color:'#9ca3af' }}/>
        <span className="font-semibold text-forest-700 truncate max-w-xs">{institution?.name}</span>
      </div>

      {/* Header */}
      <div className="card mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'#0f2d1c' }}>
              {institution?.name}
            </h2>
            <div className="text-[12.5px] text-forest-400 mt-1">
              {institution?.type}{institution?.level && ` · ${institution.level}`}
            </div>
            {assessment && (
              <div className="flex items-center gap-2 mt-2">
                <span className="chip text-[10px]" style={{
                  background: assessment.status==='submitted'?'#dbeafe':assessment.status==='approved'?'#d8f3dc':assessment.status==='in_review'?'#ede9fe':'#fef3c7',
                  color:      assessment.status==='submitted'?'#1d4ed8':assessment.status==='approved'?'#1b4332':assessment.status==='in_review'?'#6d28d9':'#d97706',
                }}>{assessment.status?.replace('_',' ')}</span>
                <span className="text-[11px] text-forest-400">Updated {new Date(assessment.updated_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          {overallScore !== null && (
            <div className="text-center px-6 py-4 rounded-2xl" style={{ background:'#f6f3ee' }}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-forest-400 mb-1">Overall</div>
              <div className="text-[36px] font-light" style={{ fontFamily:'var(--font-mono)', color:scoreColor(overallScore) }}>
                {overallScore.toFixed(2)}
              </div>
              <div className="text-[11px]" style={{ color:scoreColor(overallScore) }}>{interpret(overallScore)}</div>
              <div className="text-[10px] text-forest-400 mt-1">{answeredCount}/50</div>
            </div>
          )}
        </div>
      </div>

      {!assessment ? (
        <div className="card text-center py-12 text-forest-400">No assessment started yet.</div>
      ) : (
        <>
          <div className="flex gap-1 mb-5 bg-sand-100 p-1 rounded-xl w-fit flex-wrap">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-all"
                style={{ background: activeTab===id?'white':'transparent', color: activeTab===id?'#1b4332':'#6b7280', boxShadow: activeTab===id?'0 1px 4px rgba(0,0,0,.08)':'none' }}>
                <Icon size={13}/> {label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-5">
              <div className="card">
                <div className="text-[11px] font-bold uppercase tracking-wide text-forest-400 mb-4">Dimension Scores</div>
                <div className="space-y-3">
                  {DIMENSIONS.map(dim => {
                    const v = dimScores[dim]; const pct = v !== null ? (v/5)*100 : 0
                    return (
                      <div key={dim} className="flex items-center gap-3">
                        <div className="text-[11.5px] text-forest-600 w-44 shrink-0 truncate">{dim}</div>
                        <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background:'#e8e3da' }}>
                          <div className="h-full rounded-full flex items-center ps-1.5"
                            style={{ width:`${pct}%`, background:scoreColor(v), minWidth: v!==null?28:0 }}>
                            {v !== null && <span className="text-[9px] text-white font-bold">{v.toFixed(1)}</span>}
                          </div>
                        </div>
                        <span className="text-[10.5px] font-bold w-10 shrink-0 text-right" style={{ color:scoreColor(v) }}>{v?.toFixed(2)??'—'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="card">
                <div className="text-[11px] font-bold uppercase tracking-wide text-forest-400 mb-4">Target Scores</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {KMGBF_TARGETS.map(t => {
                    const rows = targetRows.filter(r => r.target_num===t.num && r.score!==null && r.score!==-1)
                    const avg  = rows.length ? rows.reduce((s,r)=>s+r.score,0)/rows.length : null
                    return (
                      <div key={t.num} className="flex items-center gap-2 py-0.5">
                        <span className="text-[10px] font-bold text-forest-400 w-6 shrink-0">T{t.num}</span>
                        <span className="text-[11px] text-forest-600 truncate flex-1">{t.title}</span>
                        <span className="text-[10.5px] font-bold shrink-0" style={{ color:scoreColor(avg) }}>{avg?.toFixed(1)??'—'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Core */}
          {activeTab === 'core' && (
            <div>
              {DIMENSIONS.map(dim => {
                const qIdxs = CORE_QUESTIONS.map((q,i) => ({q,i})).filter(({q}) => q.section === dim)
                return (
                  <div key={dim} className="mb-5">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                      style={{ background:'#d8f3dc', borderLeft:'3px solid #52b788' }}>
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-forest-700">{dim}</span>
                      <ScoreChip v={dimScores[dim]}/>
                    </div>
                    <div className="bg-white rounded-xl border border-sand-300 overflow-hidden">
                      <table className="rt w-full">
                        <thead><tr><th style={{width:'35%'}}>Indicator</th><th>Score</th><th>Evidence</th><th>Gap</th><th>Support</th></tr></thead>
                        <tbody>
                          {qIdxs.map(({q,i}) => {
                            const r = coreRows.find(x => x.question_index===i)
                            return <tr key={i}>
                              <td className="text-[12px]">{q.q}</td>
                              <td><ScoreChip v={r?.score??null}/></td>
                              <td className="text-[11px] text-forest-400">{r?.evidence||'—'}</td>
                              <td className="text-[11px] text-forest-400">{r?.gap||'—'}</td>
                              <td className="text-[11px] text-forest-400">{r?.suggested_support||'—'}</td>
                            </tr>
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Targets */}
          {activeTab === 'targets' && (
            <div>
              {targetRows.length === 0
                ? <div className="card text-center py-10 text-forest-400">No target assessment data yet.</div>
                : KMGBF_TARGETS.map(t => {
                    const tRows = targetRows.filter(r => r.target_num===t.num)
                    if (!tRows.length) return null
                    const avg = tRows.filter(r=>r.score!==null&&r.score!==-1).reduce((s,r,_,a)=>s+r.score/a.length,0) || null
                    return (
                      <div key={t.num} className="mb-5">
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-2"
                          style={{ background:'#dbeafe', borderLeft:'3px solid #3b82f6' }}>
                          <span className="text-[10.5px] font-bold uppercase tracking-wide text-blue-800">T{t.num}: {t.title}</span>
                          <ScoreChip v={avg}/>
                        </div>
                        <div className="bg-white rounded-xl border border-sand-300 overflow-hidden">
                          <table className="rt w-full">
                            <thead><tr><th>Indicator</th><th>Score</th><th>Evidence</th><th>Gap Identified</th><th>Capacity Need</th></tr></thead>
                            <tbody>
                              {t.indicators.map((ind,i) => {
                                const r = targetRows.find(x => x.target_num===t.num && x.indicator_index===i)
                                return <tr key={i}>
                                  <td className="text-[12px]">{ind}</td>
                                  <td><ScoreChip v={r?.score??null}/></td>
                                  <td className="text-[11px] text-forest-400">{r?.evidence||'—'}</td>
                                  <td className="text-[11px] text-forest-400">{r?.gap_identified||'—'}</td>
                                  <td className="text-[11px] text-forest-400">{r?.capacity_need||'—'}</td>
                                </tr>
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          )}

          {/* CDP */}
          {activeTab === 'cdp' && (
            cdpRows.filter(r=>r.action).length === 0
              ? <div className="card text-center py-10 text-forest-400">No development plan actions yet.</div>
              : <div className="bg-white rounded-2xl border border-sand-300 overflow-hidden">
                  <table className="rt w-full">
                    <thead><tr><th>Capacity Gap</th><th>Action</th><th>Responsible</th><th>Timeline</th><th>Budget</th></tr></thead>
                    <tbody>
                      {cdpRows.filter(r=>r.action).map((r,i) => (
                        <tr key={i}>
                          <td className="text-[11.5px]">{r.capacity_gap||'—'}</td>
                          <td className="text-[11.5px]">{r.action||'—'}</td>
                          <td className="text-[11px] text-forest-400">{r.institution||'—'}</td>
                          <td>{r.timeline?<span className="chip text-[10px]" style={{background:'#d8f3dc',color:'#1b4332'}}>{r.timeline}</span>:'—'}</td>
                          <td className="text-[11px] font-mono">{r.budget_usd||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            instUsers.length === 0
              ? <div className="card text-center py-10 text-forest-400">No users assigned to this institution yet.</div>
              : <div className="bg-white rounded-2xl border border-sand-300 overflow-hidden">
                  <table className="rt w-full">
                    <thead><tr><th>User</th><th>Role</th></tr></thead>
                    <tbody>
                      {instUsers.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="font-semibold text-[12.5px] text-forest-700">{u.full_name||'—'}</div>
                            <div className="text-[10.5px] text-forest-400">{u.email}</div>
                          </td>
                          <td><span className="chip text-[10px]">{u.role?.replace(/_/g,' ')}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          )}
        </>
      )}
    </div>
  )
}
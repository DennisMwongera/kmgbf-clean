'use client'
import { useEffect, useRef, useState } from 'react'
import { loadAllInstitutionReports, buildNationalReport, type InstitutionReport, type NationalReport } from '@/lib/supabase/adminApi'
import { DIMENSIONS, KMGBF_TARGETS } from '@/lib/constants'
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler,
         BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import Link from 'next/link'

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler,
               BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

// ─── Score helpers ─────────────────────────────────────────────
function scoreColor(v: number | null): string {
  if (v === null) return '#9ca3af'
  if (v < 1) return '#dc2626'; if (v < 2) return '#ea580c'
  if (v < 3) return '#ca8a04'; if (v < 4) return '#16a34a'
  return '#047857'
}
function scoreBg(v: number | null): string {
  if (v === null) return '#f3f4f6'
  if (v < 1) return '#fee2e2'; if (v < 2) return '#ffedd5'
  if (v < 3) return '#fef9c3'; if (v < 4) return '#dcfce7'
  return '#d8f3dc'
}
function interpret(v: number | null): string {
  if (v === null) return 'Not assessed'
  if (v < 1) return 'Critical'; if (v < 2) return 'Very limited'
  if (v < 2.5) return 'Basic';  if (v < 3.5) return 'Moderate'
  if (v < 4.5) return 'Strong'; return 'Fully adequate'
}

// ─── Charts ────────────────────────────────────────────────────
function NationalRadar({ scores }: { scores: Record<string, number | null> }) {
  const ref   = useRef<HTMLCanvasElement>(null)
  const chart = useRef<Chart | null>(null)
  const labels = DIMENSIONS.map(d => {
    const w = d.split(' '); const m = Math.ceil(w.length / 2)
    return [w.slice(0, m).join(' '), w.slice(m).join(' ')]
  })

  useEffect(() => {
    if (!ref.current) return; chart.current?.destroy()
    chart.current = new Chart(ref.current, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          data:                Object.values(scores).map(v => v ?? 0),
          backgroundColor:     'rgba(64,145,108,.15)',
          borderColor:         '#2d6a4f',
          borderWidth:         2,
          pointBackgroundColor:'#52b788',
          pointRadius:         4,
        }],
      },
      options: {
        layout: { padding: 28 },
        scales: { r: { min:0, max:5, ticks:{ stepSize:1, font:{size:9}, backdropColor:'transparent', color:'#9ca3af' }, grid:{color:'rgba(0,0,0,.06)'}, angleLines:{color:'rgba(0,0,0,.08)'}, pointLabels:{ font:{size:11,family:'Syne',weight:'500'}, color:'#1b4332', padding:8 } } },
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:(ctx) => ` ${ctx.parsed.r.toFixed(2)} / 5` } } },
        animation:{ duration:600 },
      },
    })
    return () => chart.current?.destroy()
  }, [scores])

  return <div style={{ height:360, position:'relative' }}><canvas ref={ref}/></div>
}

function MultiBarChart({ reports }: { reports: InstitutionReport[] }) {
  const ref   = useRef<HTMLCanvasElement>(null)
  const chart = useRef<Chart | null>(null)
  const COLORS = ['#52b788','#40916c','#74c69d','#95d5b2','#1b4332','#d8f3dc','#2d6a4f','#b7e4c7']

  useEffect(() => {
    if (!ref.current) return; chart.current?.destroy()
    const withData = reports.filter(r => r.overallScore !== null)
    chart.current = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels: DIMENSIONS.map(d => d.replace(' Capacity','').replace(' and ','/')),
        datasets: withData.map((r, i) => ({
          label:           r.institution.name,
          data:            DIMENSIONS.map(d => r.dimScores[d] ?? 0),
          backgroundColor: COLORS[i % COLORS.length] + 'cc',
          borderColor:     COLORS[i % COLORS.length],
          borderWidth:     1,
          borderRadius:    4,
        })),
      },
      options: {
        responsive: true,
        scales: {
          x: { ticks:{ font:{size:9} }, grid:{ display:false } },
          y: { min:0, max:5, ticks:{ stepSize:1 }, grid:{ color:'rgba(0,0,0,.05)' } },
        },
        plugins: { legend:{ position:'bottom', labels:{ font:{size:10}, boxWidth:10 } }, tooltip:{ mode:'index' } },
        animation:{ duration:600 },
      },
    })
    return () => chart.current?.destroy()
  }, [reports])

  return <div style={{ height:320, position:'relative' }}><canvas ref={ref}/></div>
}

// ─── Score cell ─────────────────────────────────────────────────
function ScoreCell({ v }: { v: number | null }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background:scoreBg(v), color:scoreColor(v) }}>
      {v !== null ? v.toFixed(2) : '—'}
    </span>
  )
}

// ─── Export helpers ────────────────────────────────────────────
async function exportNationalXLSX(national: NationalReport) {
  const XLSX = await import('xlsx')
  const wb   = XLSX.utils.book_new()

  // Summary sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['KMGBF National Capacity Assessment Report'],
    ['Generated', national.generatedAt],
    ['Institutions assessed', national.institutions.filter(r => r.overallScore !== null).length],
    [],
    ['NATIONAL AVERAGE SCORES BY DIMENSION'],
    ['Dimension', 'Average Score', 'Interpretation'],
    ...DIMENSIONS.map(d => [d, national.nationalDimScores[d]?.toFixed(2) ?? '—', interpret(national.nationalDimScores[d])]),
    [],
    ['Overall National Score', national.nationalOverall?.toFixed(2) ?? '—'],
  ]), 'National_Summary')

  // Institution comparison sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Institution', 'Type', 'Level', 'Overall', ...DIMENSIONS, 'Answered/50', 'Status'],
    ...national.institutions.map(r => [
      r.institution.name, r.institution.type ?? '', r.institution.level ?? '',
      r.overallScore?.toFixed(2) ?? '—',
      ...DIMENSIONS.map(d => r.dimScores[d]?.toFixed(2) ?? '—'),
      r.answeredCount,
      r.assessment?.status ?? 'No assessment',
    ]),
  ]), 'Institution_Comparison')

  // Target scores sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Target', 'Target Title', 'National Avg', ...national.institutions.map(r => r.institution.name)],
    ...KMGBF_TARGETS.map(t => [
      `T${t.num}`, t.title,
      national.nationalTargets[t.num]?.toFixed(2) ?? '—',
      ...national.institutions.map(r => r.targetScores[t.num]?.toFixed(2) ?? '—'),
    ]),
  ]), 'Target_Readiness')

  XLSX.writeFile(wb, `KMGBF_National_Report_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ─── Main page ─────────────────────────────────────────────────
export default function AdminReportsPage() {
  const [national,    setNational]    = useState<NationalReport | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState<'overview'|'radar'|'comparison'|'targets'>('overview')
  const [selected,    setSelected]    = useState<InstitutionReport | null>(null)
  const [exporting,   setExporting]   = useState(false)

  useEffect(() => {
    loadAllInstitutionReports().then(reports => {
      setNational(buildNationalReport(reports))
      setLoading(false)
    })
  }, [])

  async function handleExport() {
    if (!national) return
    setExporting(true)
    await exportNationalXLSX(national)
    setExporting(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-forest-200 border-t-forest-500 rounded-full animate-spin"/>
        <span className="text-[13px] text-forest-400">Loading all institution reports…</span>
      </div>
    </div>
  )

  if (!national) return null

  const withData    = national.institutions.filter(r => r.overallScore !== null)
  const withoutData = national.institutions.filter(r => r.overallScore === null)
  const TABS = ['overview','radar','comparison','targets'] as const
  const TAB_LABELS: Record<typeof TABS[number], string> = {
    overview:   '📋 Overview',
    radar:      '🕸️ National Radar',
    comparison: '📊 Institution Comparison',
    targets:    '🎯 Target Readiness',
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c' }}>
            National Reports
          </h2>
          <p className="text-[13.5px] text-forest-400 mt-1">
            Aggregate capacity readiness across all {national.institutions.length} institutions.
          </p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={handleExport} disabled={exporting}>
          {exporting
            ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Exporting…</>
            : '⬇ Export National Report (.xlsx)'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:'Institutions',       value: national.institutions.length,         accent:'#52b788' },
          { label:'With Assessments',   value: withData.length,                      accent:'#5b8dee' },
          { label:'National Score',     value: national.nationalOverall?.toFixed(2) ?? '—', accent:'#c8860a' },
          { label:'Avg Indicators',     value: withData.length ? Math.round(withData.reduce((s,r)=>s+r.answeredCount,0)/withData.length) + '/50' : '—', accent:'#e07a5f' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="bg-white rounded-xl px-5 py-4 border border-sand-300/60"
            style={{ borderTop:`3px solid ${accent}`, boxShadow:'0 2px 12px rgba(15,45,28,.08)' }}>
            <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1.5">{label}</div>
            <div className="text-[28px] text-forest-700" style={{ fontFamily:'var(--font-mono)', fontWeight:300 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-sand-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all"
            style={{ background: activeTab===tab ? 'white' : 'transparent', color: activeTab===tab ? '#1b4332' : '#6b7280', boxShadow: activeTab===tab ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* National dimension scores */}
          <div className="card">
            <div className="card-title">🌍 National Average — Capacity by Dimension</div>
            <div className="space-y-3 mt-2">
              {DIMENSIONS.map(dim => {
                const v = national.nationalDimScores[dim]
                const pct = v !== null ? (v / 5) * 100 : 0
                return (
                  <div key={dim} className="flex items-center gap-3">
                    <div className="w-52 text-[12px] font-medium text-forest-600 shrink-0 truncate">{dim}</div>
                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background:'#e8e3da' }}>
                      <div className="h-full rounded-full transition-all duration-700 flex items-center ps-2"
                        style={{ width:`${pct}%`, background:scoreColor(v), minWidth: v !== null ? 32 : 0 }}>
                        {v !== null && <span className="text-[10px] text-white font-bold">{v.toFixed(1)}</span>}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold w-16 shrink-0" style={{ color:scoreColor(v) }}>
                      {interpret(v)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Institution table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="card-title mb-0">🏛️ Institutions ({national.institutions.length})</div>
              {withoutData.length > 0 && (
                <span className="text-[11px] text-forest-400">{withoutData.length} with no assessment yet</span>
              )}
            </div>
            <div className="rounded-xl overflow-hidden border border-sand-300">
              <table className="rt w-full">
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Type</th>
                    <th>Overall</th>
                    {DIMENSIONS.map(d => (
                      <th key={d} style={{ fontSize:10 }}>{d.replace(' Capacity','').replace(' and ','/')}</th>
                    ))}
                    <th>Answered</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {national.institutions.map(r => (
                    <tr key={r.institution.id}
                      style={{ background: selected?.institution.id === r.institution.id ? '#f0faf4' : undefined }}>
                      <td>
                        <div className="font-semibold text-[12.5px] text-forest-700">{r.institution.name}</div>
                        {r.institution.level && <div className="text-[10px] text-forest-400">{r.institution.level}</div>}
                      </td>
                      <td className="text-[11px] text-forest-400">{r.institution.type ?? '—'}</td>
                      <td><ScoreCell v={r.overallScore}/></td>
                      {DIMENSIONS.map(d => <td key={d}><ScoreCell v={r.dimScores[d]}/></td>)}
                      <td>
                        <span className="text-[11px] font-bold" style={{ fontFamily:'var(--font-mono)', color:r.answeredCount>0?'#1b4332':'#9ca3af' }}>
                          {r.answeredCount}/50
                        </span>
                      </td>
                      <td>
                        {r.assessment ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background:r.assessment.status==='submitted'?'#dbeafe':r.assessment.status==='in_progress'?'#fef3c7':'#f3f4f6', color:r.assessment.status==='submitted'?'#1d4ed8':r.assessment.status==='in_progress'?'#d97706':'#6b7280' }}>
                            {r.assessment.status?.replace('_',' ')}
                          </span>
                        ) : <span className="text-[10px] text-forest-300">No data</span>}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(r === selected ? null : r)}>
                          {selected?.institution.id === r.institution.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Institution drill-down */}
          {selected && (
            <div className="card border-2 border-forest-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="card-title mb-0.5">📋 {selected.institution.name}</div>
                  <div className="text-[11.5px] text-forest-400">
                    {selected.institution.type} · {selected.institution.level} ·{' '}
                    {selected.assessment ? `Last updated ${new Date(selected.assessment.updated_at!).toLocaleDateString()}` : 'No assessment'}
                  </div>
                </div>
                <Link href={`/admin/institutions/${selected.institution.id}`} className="btn btn-ghost btn-sm">
                  Manage →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Dim scores for this inst */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-forest-400 mb-3">Dimension Scores</div>
                  <div className="space-y-2">
                    {DIMENSIONS.map(dim => {
                      const v = selected.dimScores[dim]
                      return (
                        <div key={dim} className="flex items-center gap-2.5">
                          <div className="text-[11.5px] text-forest-600 w-44 shrink-0 truncate">{dim}</div>
                          <div className="flex-1 h-3.5 rounded-full overflow-hidden" style={{ background:'#e8e3da' }}>
                            <div className="h-full rounded-full" style={{ width:`${v!==null?(v/5)*100:0}%`, background:scoreColor(v) }}/>
                          </div>
                          <span className="text-[11px] font-bold w-8 text-right shrink-0" style={{ color:scoreColor(v) }}>
                            {v?.toFixed(1) ?? '—'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Target scores */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-forest-400 mb-3">Target Scores</div>
                  <div className="grid grid-cols-2 gap-1">
                    {KMGBF_TARGETS.map(t => {
                      const v = selected.targetScores[t.num]
                      return (
                        <div key={t.num} className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-forest-400 shrink-0">T{t.num}</span>
                          <span className="truncate text-forest-600">{t.title}</span>
                          <span className="ms-auto font-bold shrink-0" style={{ color:scoreColor(v) }}>{v?.toFixed(1) ?? '—'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── National Radar ── */}
      {activeTab === 'radar' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card" style={{ gridColumn:'span 2' }}>
            <div className="card-title">🕸️ National Capacity Radar — Average Across All Institutions</div>
            <p className="text-[12.5px] text-forest-400 mb-3">
              Shows the national average score per dimension. Includes {withData.length} institutions with assessment data.
            </p>
            <div className="max-w-lg mx-auto">
              <NationalRadar scores={national.nationalDimScores}/>
            </div>
          </div>

          {/* Mini radars per institution */}
          {withData.map(r => (
            <div key={r.institution.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="card-title mb-0 text-[14px]">{r.institution.name}</div>
                <span className="text-[12px] font-bold" style={{ fontFamily:'var(--font-mono)', color:scoreColor(r.overallScore) }}>
                  {r.overallScore?.toFixed(2) ?? '—'}
                </span>
              </div>
              <NationalRadar scores={r.dimScores}/>
            </div>
          ))}
        </div>
      )}

      {/* ── Institution Comparison Bar ── */}
      {activeTab === 'comparison' && (
        <div className="card">
          <div className="card-title">📊 Dimension Scores — All Institutions</div>
          <p className="text-[12.5px] text-forest-400 mb-4">Grouped bar chart comparing all institutions across all 8 dimensions.</p>
          {withData.length === 0
            ? <div className="text-center py-10 text-forest-400">No institutions have assessment data yet.</div>
            : <MultiBarChart reports={withData}/>
          }
        </div>
      )}

      {/* ── Target Readiness ── */}
      {activeTab === 'targets' && (
        <div className="card">
          <div className="card-title">🎯 KMGBF Target Readiness — National Overview</div>
          <div className="rounded-xl overflow-hidden border border-sand-300 mt-3">
            <table className="rt w-full">
              <thead>
                <tr>
                  <th style={{ width:40 }}>#</th>
                  <th>Target</th>
                  <th>National Avg</th>
                  {withData.map(r => <th key={r.institution.id} style={{ fontSize:10 }}>{r.institution.name.slice(0,20)}</th>)}
                </tr>
              </thead>
              <tbody>
                {KMGBF_TARGETS.map(t => (
                  <tr key={t.num}>
                    <td className="text-[11px] font-bold text-forest-400">T{t.num}</td>
                    <td className="text-[12px] font-medium text-forest-700">{t.title}</td>
                    <td><ScoreCell v={national.nationalTargets[t.num]}/></td>
                    {withData.map(r => <td key={r.institution.id}><ScoreCell v={r.targetScores[t.num]}/></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
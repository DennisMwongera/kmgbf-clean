'use client'
import { useEffect, useRef, useState } from 'react'
import { loadAllInstitutionReports, buildNationalReport, loadNationalCdpRows, type InstitutionReport, type NationalReport, type NationalCdpRow } from '@/lib/supabase/adminApi'
import { DIMENSIONS, KMGBF_TARGETS } from '@/lib/constants'
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler,
         BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import Link from 'next/link'
import { downloadCanvasAsImage, downloadCSV, downloadXLSX } from '@/lib/exportUtils'
import { exportNationalPDF } from '@/lib/pdfExport'
import ExportMenu from '@/components/ExportMenu'
import {
  Globe, Radar, BarChart2, Target, Download, Loader2,
  Building2, ClipboardList, TrendingUp, ArrowRight, ChevronRight, ChevronDown, Table2, FileDown
} from 'lucide-react'

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
function NationalRadar({ scores, canvasRef }: { scores: Record<string, number | null>; canvasRef?: React.RefObject<HTMLCanvasElement> }) {
  const innerRef = useRef<HTMLCanvasElement>(null)
  const ref      = canvasRef ?? innerRef
  const chart    = useRef<Chart | null>(null)
  const labels   = DIMENSIONS.map(d => {
    const w = d.split(' '); const m = Math.ceil(w.length / 2)
    return [w.slice(0, m).join(' '), w.slice(m).join(' ')]
  })

  useEffect(() => {
    if (!ref.current) return; chart.current?.destroy()
    chart.current = new Chart(ref.current, {
      type: 'radar',
      data: {
        labels,
        datasets: [{ data: Object.values(scores).map(v => v ?? 0), backgroundColor:'rgba(64,145,108,.15)', borderColor:'#2d6a4f', borderWidth:2, pointBackgroundColor:'#52b788', pointRadius:4 }],
      },
      options: {
        layout: { padding:28 },
        scales: { r: { min:0, max:5, ticks:{ stepSize:1, font:{size:9}, backdropColor:'transparent', color:'#9ca3af' }, grid:{color:'rgba(0,0,0,.06)'}, angleLines:{color:'rgba(0,0,0,.08)'}, pointLabels:{ font:{size:13,family:'Syne',weight:'500'}, color:'#1b4332', padding:12 } } },
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:(ctx) => ` ${ctx.parsed.r.toFixed(2)} / 5` } } },
        animation:{ duration:600 },
      },
    })
    return () => chart.current?.destroy()
  }, [scores])

  return <div style={{ height:480, position:'relative' }}><canvas ref={ref}/></div>
}

function MultiBarChart({ reports, canvasRef }: { reports: InstitutionReport[]; canvasRef?: React.RefObject<HTMLCanvasElement> }) {
  const innerRef = useRef<HTMLCanvasElement>(null)
  const ref      = canvasRef ?? innerRef
  const chart    = useRef<Chart | null>(null)
  const COLORS   = ['#52b788','#40916c','#74c69d','#95d5b2','#1b4332','#d8f3dc','#2d6a4f','#b7e4c7']

  useEffect(() => {
    if (!ref.current) return; chart.current?.destroy()
    const withData = reports.filter(r => r.overallScore !== null)
    chart.current = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels: DIMENSIONS.map(d => d.replace(' Capacity','').replace(' and ','/')),
        datasets: withData.map((r, i) => ({
          label: r.institution.name, data: DIMENSIONS.map(d => r.dimScores[d] ?? 0),
          backgroundColor: COLORS[i % COLORS.length] + 'cc', borderColor: COLORS[i % COLORS.length], borderWidth:1, borderRadius:4,
        })),
      },
      options: {
        responsive:true,
        scales: { x:{ ticks:{font:{size:9}}, grid:{display:false} }, y:{ min:0, max:5, ticks:{stepSize:1}, grid:{color:'rgba(0,0,0,.05)'} } },
        plugins: { legend:{ position:'bottom', labels:{font:{size:10},boxWidth:10} }, tooltip:{mode:'index'} },
        animation:{ duration:600 },
      },
    })
    return () => chart.current?.destroy()
  }, [reports])

  return <div style={{ height:320, position:'relative' }}><canvas ref={ref}/></div>
}

function ScoreCell({ v }: { v: number | null }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background:scoreBg(v), color:scoreColor(v) }}>
      {v !== null ? v.toFixed(2) : '—'}
    </span>
  )
}

async function exportNationalXLSX(national: NationalReport) {
  const XLSX = await import('xlsx')
  const wb   = XLSX.utils.book_new()
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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Institution', 'Type', 'Level', 'Overall', ...DIMENSIONS, 'Answered/50', 'Status'],
    ...national.institutions.map(r => [r.institution.name, r.institution.type??'', r.institution.level??'', r.overallScore?.toFixed(2)??'—', ...DIMENSIONS.map(d => r.dimScores[d]?.toFixed(2)??'—'), r.answeredCount, r.assessment?.status??'No assessment']),
  ]), 'Institution_Comparison')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Target', 'Target Title', 'National Avg', ...national.institutions.map(r => r.institution.name)],
    ...KMGBF_TARGETS.map(t => [`T${t.num}`, t.title, national.nationalTargets[t.num]?.toFixed(2)??'—', ...national.institutions.map(r => r.targetScores[t.num]?.toFixed(2)??'—')]),
  ]), 'Target_Readiness')
  XLSX.writeFile(wb, `KMGBF_National_Report_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ─── Tab config ─────────────────────────────────────────────────
const TABS = [
  { id: 'overview'    as const, label: 'Overview',              Icon: Globe      },
  { id: 'radar'       as const, label: 'National Radar',        Icon: Radar      },
  { id: 'comparison'  as const, label: 'Institution Comparison', Icon: BarChart2  },
  { id: 'targets'     as const, label: 'Target Readiness',      Icon: Target     },
  { id: 'cdp'         as const, label: 'Development Plans',     Icon: Table2     },
]

// ─── Section header ─────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 card-title mb-0">
        <Icon size={16} style={{ color:'#40916c', flexShrink:0 }}/>
        {title}
      </div>
      {children}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────
export default function AdminReportsPage() {
  const [allReports,   setAllReports]   = useState<InstitutionReport[]>([])
  const [national,     setNational]     = useState<NationalReport | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState<typeof TABS[number]['id']>('overview')
  const [selected,     setSelected]     = useState<InstitutionReport | null>(null)
  const [exporting,    setExporting]    = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const [filterOpen,   setFilterOpen]   = useState(false)
  const [cdpRows,      setCdpRows]      = useState<NationalCdpRow[]>([])
  const [cdpLoading,   setCdpLoading]   = useState(false)
  const [cdpLoaded,    setCdpLoaded]    = useState(false)

  const nationalRadarRef = useRef<HTMLCanvasElement>(null)
  const multiBarRef      = useRef<HTMLCanvasElement>(null)
  const date             = new Date().toISOString().slice(0,10)

  useEffect(() => {
    loadAllInstitutionReports().then(reports => {
      setAllReports(reports)
      setSelectedIds(new Set(reports.map(r => r.institution.id)))
      setNational(buildNationalReport(reports))
      setLoading(false)
    })
  }, [])

  function toggleInstitution(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) }
      else next.add(id)
      return next
    })
  }

  function applyFilter() {
    const filtered = allReports.filter(r => selectedIds.has(r.institution.id))
    setNational(buildNationalReport(filtered))
    setFilterOpen(false)
    if (activeTab === 'cdp') {
      setCdpLoaded(false)
      loadCdp([...selectedIds])
    }
  }

  async function loadCdp(instIds?: string[]) {
    setCdpLoading(true)
    const rows = await loadNationalCdpRows(instIds?.length ? instIds : undefined)
    setCdpRows(rows)
    setCdpLoading(false)
    setCdpLoaded(true)
  }

  function selectAll() { setSelectedIds(new Set(allReports.map(r => r.institution.id))) }
  function clearAll()  { setSelectedIds(new Set([allReports[0]?.institution.id].filter(Boolean))) }

  async function handleExport() {
    if (!national) return
    setExporting(true)
    await exportNationalXLSX(national)
    setExporting(false)
  }

  async function handlePDFExport() {
    if (!national) return
    setPdfExporting(true)
    await exportNationalPDF(national, nationalRadarRef.current, multiBarRef.current, allReports.length)
    setPdfExporting(false)
  }

  function handleTabClick(id: typeof TABS[number]['id']) {
    setActiveTab(id)
    if (id === 'cdp' && !cdpLoaded) {
      loadCdp([...selectedIds])
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin" style={{ color:'#52b788' }}/>
        <span className="text-[13px] text-forest-400">Loading all institution reports…</span>
      </div>
    </div>
  )

  if (!national) return null

  const withData    = national.institutions.filter(r => r.overallScore !== null)
  const withoutData = national.institutions.filter(r => r.overallScore === null)

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c' }}>
            National Reports
          </h2>
          <p className="text-[13.5px] text-forest-400 mt-1">
            Aggregate capacity readiness across all {national.institutions.length} institutions.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <button className="btn btn-secondary flex items-center gap-2" onClick={handleExport} disabled={exporting}>
            {exporting ? <><Loader2 size={13} className="animate-spin"/> Exporting…</> : <><Download size={13}/> Export XLSX</>}
          </button>
          <button className="btn btn-primary flex items-center gap-2" onClick={handlePDFExport} disabled={pdfExporting}>
            {pdfExporting ? <><Loader2 size={13} className="animate-spin"/> Generating…</> : <><FileDown size={13}/> Download PDF</>}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:'Institutions',     value: national.institutions.length,                                                                                          accent:'#52b788', Icon: Building2    },
          { label:'With Assessments', value: withData.length,                                                                                                       accent:'#5b8dee', Icon: ClipboardList },
          { label:'National Score',   value: national.nationalOverall?.toFixed(2) ?? '—',                                                                           accent:'#c8860a', Icon: TrendingUp    },
          { label:'Avg Indicators',   value: withData.length ? Math.round(withData.reduce((s,r)=>s+r.answeredCount,0)/withData.length)+'/50' : '—',                accent:'#e07a5f', Icon: Target       },
        ].map(({ label, value, accent, Icon }) => (
          <div key={label} className="bg-white rounded-xl px-5 py-4 border border-sand-300/60"
            style={{ borderTop:`3px solid ${accent}`, boxShadow:'0 2px 12px rgba(15,45,28,.08)' }}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1.5">
              <Icon size={11}/> {label}
            </div>
            <div className="text-[28px] text-forest-700" style={{ fontFamily:'var(--font-mono)', fontWeight:300 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Institution filter */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setFilterOpen(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-[12.5px] font-medium transition-all"
            style={{ background: filterOpen ? '#1b4332' : 'white', color: filterOpen ? 'white' : '#374151', borderColor: filterOpen ? '#1b4332' : '#e5e7eb' }}>
            <Building2 size={13}/>
            Filter Institutions
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: filterOpen ? 'rgba(255,255,255,.2)' : '#d8f3dc', color: filterOpen ? 'white' : '#1b4332' }}>
              {selectedIds.size} / {allReports.length}
            </span>
            <ChevronDown size={12} style={{ transform: filterOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
          </button>
          {selectedIds.size < allReports.length && (
            <span className="text-[12px] text-amber-600 font-medium">
              ⚠️ Report filtered — showing {selectedIds.size} of {allReports.length} institutions
            </span>
          )}
        </div>

        {filterOpen && (
          <div className="mt-2 p-4 bg-white rounded-2xl border border-sand-300"
            style={{ boxShadow:'0 8px 24px rgba(0,0,0,.1)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12.5px] text-forest-500">Select which institutions to include in the national report:</p>
              <div className="flex gap-2">
                <button onClick={selectAll} className="btn btn-ghost btn-sm">Select all</button>
                <button onClick={clearAll}  className="btn btn-ghost btn-sm">Clear</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4 max-h-64 overflow-y-auto">
              {allReports.map(r => (
                <label key={r.institution.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all"
                  style={{ borderColor: selectedIds.has(r.institution.id) ? '#2d6a4f' : '#e8e3da', background: selectedIds.has(r.institution.id) ? '#f0faf4' : 'white' }}>
                  <input type="checkbox" checked={selectedIds.has(r.institution.id)}
                    onChange={() => toggleInstitution(r.institution.id)} style={{ accentColor:'#2d6a4f' }}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-forest-700 truncate">{r.institution.name}</div>
                    <div className="text-[10px] text-forest-400">
                      {r.institution.level ?? '—'} · {r.overallScore !== null ? r.overallScore.toFixed(2) : 'No data'}
                    </div>
                  </div>
                  {r.overallScore !== null && (
                    <span className="text-[11px] font-bold shrink-0"
                      style={{ color: r.overallScore >= 3.5 ? '#047857' : r.overallScore >= 2 ? '#ca8a04' : '#dc2626' }}>
                      {r.overallScore.toFixed(1)}
                    </span>
                  )}
                </label>
              ))}
            </div>
            <button onClick={applyFilter} className="btn btn-primary w-full justify-center">
              Apply — Rebuild National Report
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-sand-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => handleTabClick(id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all"
            style={{ background: activeTab===id ? 'white' : 'transparent', color: activeTab===id ? '#1b4332' : '#6b7280', boxShadow: activeTab===id ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
            <Icon size={13}/> {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="card">
            <SectionHeader icon={Globe} title="National Average — Capacity by Dimension"/>
            <div className="space-y-3 mt-2">
              {DIMENSIONS.map(dim => {
                const v   = national.nationalDimScores[dim]
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
                    <span className="text-[11px] font-bold w-16 shrink-0" style={{ color:scoreColor(v) }}>{interpret(v)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 card-title mb-0">
                <Building2 size={16} style={{ color:'#40916c' }}/> Institutions ({national.institutions.length})
              </div>
              <div className="flex items-center gap-3">
                <ExportMenu mini options={[
                  { label:'CSV',  icon:'📋', action:()=> downloadCSV([['Institution','Type','Level','Overall',...DIMENSIONS,'Answered','Status'],...national!.institutions.map(r=>[r.institution.name,r.institution.type??'',r.institution.level??'',r.overallScore?.toFixed(2)??'',...DIMENSIONS.map(d=>r.dimScores[d]?.toFixed(2)??''),r.answeredCount,r.assessment?.status??''])], `National_Institutions_${date}`) },
                  { label:'XLSX', icon:'📊', action:()=> downloadXLSX([{name:'Institutions',rows:[['Institution','Type','Level','Overall',...DIMENSIONS,'Answered','Status'],...national!.institutions.map(r=>[r.institution.name,r.institution.type??'',r.institution.level??'',r.overallScore?.toFixed(2)??'',...DIMENSIONS.map(d=>r.dimScores[d]?.toFixed(2)??''),r.answeredCount,r.assessment?.status??''])]}], `National_Institutions_${date}`) },
                ]}/>
                {withoutData.length > 0 && <span className="text-[11px] text-forest-400">{withoutData.length} with no assessment yet</span>}
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-sand-300">
              <table className="rt" style={{ minWidth:900 }}>
                <thead>
                  <tr>
                    <th>Institution</th><th>Type</th><th>Overall</th>
                    {DIMENSIONS.map(d => <th key={d} style={{ fontSize:10 }}>{d.replace(' Capacity','').replace(' and ','/')}</th>)}
                    <th>Answered</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {national.institutions.map(r => (
                    <tr key={r.institution.id} style={{ background: selected?.institution.id === r.institution.id ? '#f0faf4' : undefined }}>
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
                        {r.assessment
                          ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{ background:r.assessment.status==='submitted'?'#dbeafe':r.assessment.status==='in_progress'?'#fef3c7':'#f3f4f6', color:r.assessment.status==='submitted'?'#1d4ed8':r.assessment.status==='in_progress'?'#d97706':'#6b7280' }}>
                              {r.assessment.status?.replace('_',' ')}
                            </span>
                          : <span className="text-[10px] text-forest-300">No data</span>}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={() => setSelected(r === selected ? null : r)}>
                          {selected?.institution.id === r.institution.id ? 'Hide' : <><span>View</span><ChevronRight size={11}/></>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selected && (
            <div className="card border-2 border-forest-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 card-title mb-0.5">
                    <ClipboardList size={15} style={{ color:'#40916c' }}/> {selected.institution.name}
                  </div>
                  <div className="text-[11.5px] text-forest-400">
                    {selected.institution.type} · {selected.institution.level} ·{' '}
                    {selected.assessment ? `Last updated ${new Date(selected.assessment.updated_at!).toLocaleDateString()}` : 'No assessment'}
                  </div>
                </div>
                <Link href={`/admin/institutions/${selected.institution.id}`} className="btn btn-ghost btn-sm flex items-center gap-1">
                  Manage <ArrowRight size={12}/>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                          <span className="text-[11px] font-bold w-8 text-right shrink-0" style={{ color:scoreColor(v) }}>{v?.toFixed(1) ?? '—'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
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
            <SectionHeader icon={Radar} title="National Capacity Radar — Average Across All Institutions">
              <ExportMenu mini options={[
                { label:'PNG image', icon:'🖼️', action:()=> nationalRadarRef.current && downloadCanvasAsImage(nationalRadarRef.current, `National_Radar_${date}`, 'png') },
                { label:'JPG image', icon:'📷', action:()=> nationalRadarRef.current && downloadCanvasAsImage(nationalRadarRef.current, `National_Radar_${date}`, 'jpg') },
                { label:'CSV data',  icon:'📋', action:()=> downloadCSV([['Dimension','National Avg'],...DIMENSIONS.map(d=>[d, national!.nationalDimScores[d]?.toFixed(2)??''])], `National_Radar_${date}`) },
              ]}/>
            </SectionHeader>
            <p className="text-[12.5px] text-forest-400 mb-3">Includes {withData.length} institutions with assessment data.</p>
            <div className="max-w-lg mx-auto">
              <NationalRadar scores={national.nationalDimScores} canvasRef={nationalRadarRef}/>
            </div>
          </div>
          {withData.map(r => (
            <div key={r.institution.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 card-title mb-0 text-[14px]">
                  <Building2 size={13} style={{ color:'#40916c' }}/> {r.institution.name}
                </div>
                <span className="text-[12px] font-bold" style={{ fontFamily:'var(--font-mono)', color:scoreColor(r.overallScore) }}>
                  {r.overallScore?.toFixed(2) ?? '—'}
                </span>
              </div>
              <NationalRadar scores={r.dimScores}/>
            </div>
          ))}
        </div>
      )}

      {/* ── Institution Comparison ── */}
      {activeTab === 'comparison' && (
        <div className="card">
          <SectionHeader icon={BarChart2} title="Dimension Scores — All Institutions">
            <ExportMenu mini options={[
              { label:'PNG image', icon:'🖼️', action:()=> multiBarRef.current && downloadCanvasAsImage(multiBarRef.current, `National_DimComparison_${date}`, 'png') },
              { label:'JPG image', icon:'📷', action:()=> multiBarRef.current && downloadCanvasAsImage(multiBarRef.current, `National_DimComparison_${date}`, 'jpg') },
              { label:'CSV data',  icon:'📋', action:()=> downloadCSV([['Institution',...DIMENSIONS],...withData.map(r=>[r.institution.name,...DIMENSIONS.map(d=>r.dimScores[d]?.toFixed(2)??'')])], `National_DimComparison_${date}`) },
              { label:'XLSX data', icon:'📊', action:()=> downloadXLSX([{name:'Comparison',rows:[['Institution',...DIMENSIONS],...withData.map(r=>[r.institution.name,...DIMENSIONS.map(d=>r.dimScores[d]?.toFixed(2)??'')])]}], `National_DimComparison_${date}`) },
            ]}/>
          </SectionHeader>
          <p className="text-[12.5px] text-forest-400 mb-4">Grouped bar chart comparing all institutions across all 8 dimensions.</p>
          {withData.length === 0
            ? <div className="text-center py-10 text-forest-400">No institutions have assessment data yet.</div>
            : <MultiBarChart reports={withData} canvasRef={multiBarRef}/>}
        </div>
      )}

      {/* ── Target Readiness ── */}
      {activeTab === 'targets' && (
        <div className="card">
          <SectionHeader icon={Target} title="KMGBF Target Readiness — National Overview">
            <ExportMenu mini options={[
              { label:'CSV data',  icon:'📋', action:()=> downloadCSV([['Target','Title','National Avg',...withData.map(r=>r.institution.name)],...KMGBF_TARGETS.map(t=>[`T${t.num}`,t.title,national!.nationalTargets[t.num]?.toFixed(2)??'',...withData.map(r=>r.targetScores[t.num]?.toFixed(2)??'')])], `National_Targets_${date}`) },
              { label:'XLSX data', icon:'📊', action:()=> downloadXLSX([{name:'Target Readiness',rows:[['Target','Title','National Avg',...withData.map(r=>r.institution.name)],...KMGBF_TARGETS.map(t=>[`T${t.num}`,t.title,national!.nationalTargets[t.num]?.toFixed(2)??'',...withData.map(r=>r.targetScores[t.num]?.toFixed(2)??'')])]}], `National_Targets_${date}`) },
            ]}/>
          </SectionHeader>
          <div className="overflow-x-auto rounded-xl border border-sand-300 mt-3">
            <table className="rt" style={{ minWidth: Math.max(600, withData.length * 120 + 300) }}>
              <thead>
                <tr>
                  <th style={{ width:40 }}>#</th><th>Target</th><th>National Avg</th>
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

      {/* ── Development Plans ── */}
      {activeTab === 'cdp' && (
        <div>
          <SectionHeader icon={Table2} title="National Capacity Development Plans">
            <ExportMenu mini options={[
              { label:'CSV — Core',    icon:'📋', action:() => downloadCSV([
                  ['Institution','Capacity Gap','Action','Responsible','Timeline','Budget (USD)','Indicator','Collaboration','Status'],
                  ...cdpRows.filter(r=>r.source==='core').map(r=>[r.institution_name,r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget_usd??'',r.indicator??'',r.collaboration??'',r.assessment_status??''])
                ], `National_Core_CDP_${date}`) },
              { label:'CSV — Targets', icon:'📋', action:() => downloadCSV([
                  ['Institution','Target','Capacity Gap','Action','Responsible','Timeline','Budget (USD)','Indicator','Collaboration','Status'],
                  ...cdpRows.filter(r=>r.source==='target').map(r=>[r.institution_name,r.target_title??'',r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget_usd??'',r.indicator??'',r.collaboration??'',r.assessment_status??''])
                ], `National_Target_CDP_${date}`) },
              { label:'XLSX — All',   icon:'📊', action:() => downloadXLSX([
                  { name:'Core_CDP', rows:[
                    ['Institution','Capacity Gap','Action','Responsible','Timeline','Budget (USD)','Indicator','Collaboration','Status'],
                    ...cdpRows.filter(r=>r.source==='core').map(r=>[r.institution_name,r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget_usd??'',r.indicator??'',r.collaboration??'',r.assessment_status??''])
                  ]},
                  { name:'Target_CDP', rows:[
                    ['Institution','Target','Capacity Gap','Action','Responsible','Timeline','Budget (USD)','Indicator','Collaboration','Status'],
                    ...cdpRows.filter(r=>r.source==='target').map(r=>[r.institution_name,r.target_title??'',r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget_usd??'',r.indicator??'',r.collaboration??'',r.assessment_status??''])
                  ]},
                ], `National_CDP_${date}`) },
            ]}/>
          </SectionHeader>

          {cdpLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin" style={{ color:'#40916c' }}/>
            </div>
          ) : !cdpLoaded ? (
            <div className="card text-center py-12">
              <div className="text-2xl mb-2">📋</div>
              <div className="text-[13px] text-forest-400 mb-3">Click to load all development plans and target gaps.</div>
              <button className="btn btn-primary" onClick={() => loadCdp([...selectedIds])}>
                Load Plans & Target Gaps
              </button>
            </div>
          ) : cdpRows.length === 0 ? (
            <div className="card text-center py-12 text-forest-400">
              No development plan actions or target gaps found across selected institutions.
            </div>
          ) : (() => {
            const coreRows   = cdpRows.filter(r => r.source === 'core')
            const targetRows = cdpRows.filter(r => r.source === 'target')
            return (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { label:'Core Actions',   value: coreRows.length,                                               color:'#1b4332' },
                    { label:'Target Gaps',    value: targetRows.length,                                             color:'#1d4ed8' },
                    { label:'Institutions',   value: new Set(cdpRows.map(r=>r.institution_id)).size,                color:'#d97706' },
                    { label:'With Budget',    value: cdpRows.filter(r=>r.budget_usd).length,                        color:'#047857' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="card py-3 px-4" style={{ borderTop:`3px solid ${color}` }}>
                      <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1">{label}</div>
                      <div className="text-[26px] font-light" style={{ fontFamily:'var(--font-mono)', color }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Timeline breakdown */}
                {coreRows.some(r=>r.timeline) && (
                  <div className="card mb-5">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-forest-400 mb-3">Core Actions by Timeline</div>
                    <div className="flex flex-wrap gap-2">
                      {['0–6 months','6–12 months','1–2 years','2–5 years','Long-term'].map(tl => {
                        const count = coreRows.filter(r => r.timeline === tl).length
                        if (!count) return null
                        return (
                          <div key={tl} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-sand-300">
                            <span className="text-[12px] font-semibold text-forest-700">{tl}</span>
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:'#d8f3dc', color:'#1b4332' }}>{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Section 1: Core Capacity CDP ── */}
                {coreRows.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <ClipboardList size={15} style={{ color:'#1b4332' }}/>
                      <h3 className="font-bold text-[15px]" style={{ color:'#1b4332' }}>Core Capacity Development Plans</h3>
                      <span className="chip text-[10px]" style={{ background:'#d8f3dc', color:'#1b4332' }}>{coreRows.length} actions</span>
                    </div>
                    <div style={{ overflowX:'auto' }}>
                      <table className="rt w-full" style={{ minWidth:900 }}>
                        <thead>
                          <tr style={{ background:'#1b4332' }}>
                            <th style={{ color:'white' }}>Institution</th>
                            <th style={{ color:'white' }}>Capacity Gap</th>
                            <th style={{ color:'white' }}>Action</th>
                            <th style={{ color:'white' }}>Responsible</th>
                            <th style={{ color:'white' }}>Timeline</th>
                            <th style={{ color:'white' }}>Budget</th>
                            <th style={{ color:'white' }}>Indicator</th>
                            <th style={{ color:'white' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coreRows.map((r, i) => (
                            <tr key={i}>
                              <td><span className="text-[12px] font-semibold text-forest-700">{r.institution_name}</span></td>
                              <td className="text-[11.5px]">{r.capacity_gap||'—'}</td>
                              <td className="text-[11.5px]">{r.action||'—'}</td>
                              <td className="text-[11px] text-forest-400">{r.institution||'—'}</td>
                              <td>{r.timeline ? <span className="chip text-[10px]" style={{ background:'#d8f3dc', color:'#1b4332', whiteSpace:'nowrap' }}>{r.timeline}</span> : <span className="text-forest-300">—</span>}</td>
                              <td className="text-[11.5px] font-mono">{r.budget_usd||'—'}</td>
                              <td className="text-[11px] text-forest-400">{r.indicator||'—'}</td>
                              <td>{r.assessment_status && <span className="chip text-[10px]" style={{ background: r.assessment_status==='approved'?'#d8f3dc':r.assessment_status==='submitted'?'#dbeafe':'#fef3c7', color: r.assessment_status==='approved'?'#1b4332':r.assessment_status==='submitted'?'#1d4ed8':'#d97706' }}>{r.assessment_status.replace('_',' ')}</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Section 2: Target Action Plans ── */}
                {targetRows.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={15} style={{ color:'#1d4ed8' }}/>
                      <h3 className="font-bold text-[15px]" style={{ color:'#1d4ed8' }}>Target-Specific Action Plans</h3>
                      <span className="chip text-[10px]" style={{ background:'#dbeafe', color:'#1d4ed8' }}>{targetRows.length} gaps</span>
                    </div>
                    <div style={{ overflowX:'auto' }}>
                      <table className="rt w-full" style={{ minWidth:960 }}>
                        <thead>
                          <tr style={{ background:'#1d4ed8' }}>
                            <th style={{ color:'white' }}>Institution</th>
                            <th style={{ color:'white' }}>Target</th>
                            <th style={{ color:'white' }}>Capacity Gap</th>
                            <th style={{ color:'white' }}>Action</th>
                            <th style={{ color:'white' }}>Timeline</th>
                            <th style={{ color:'white' }}>Capacity Need</th>
                            <th style={{ color:'white' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {targetRows.map((r, i) => (
                            <tr key={i}>
                              <td><span className="text-[12px] font-semibold text-forest-700">{r.institution_name}</span></td>
                              <td>
                                {r.target_num && (
                                  <div>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-1" style={{ background:'#dbeafe', color:'#1d4ed8' }}>T{r.target_num}</span>
                                    <span className="text-[11px] text-forest-600">{r.target_title}</span>
                                  </div>
                                )}
                              </td>
                              <td className="text-[11.5px]">{r.capacity_gap||'—'}</td>
                              <td className="text-[11.5px]">{r.action||'—'}</td>
                              <td>{r.timeline ? <span className="chip text-[10px]" style={{ background:'#dbeafe', color:'#1d4ed8', whiteSpace:'nowrap' }}>{r.timeline}</span> : <span className="text-forest-300">—</span>}</td>
                              <td className="text-[11px] text-forest-400">{r.indicator||'—'}</td>
                              <td>{r.assessment_status && <span className="chip text-[10px]" style={{ background: r.assessment_status==='approved'?'#d8f3dc':r.assessment_status==='submitted'?'#dbeafe':'#fef3c7', color: r.assessment_status==='approved'?'#1b4332':r.assessment_status==='submitted'?'#1d4ed8':'#d97706' }}>{r.assessment_status.replace('_',' ')}</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

    </div>
  )
}
// 'use client'
// import { useEffect, useRef, useState } from 'react'
// import { loadAllInstitutionReports, buildNationalReport, loadNationalCdpRows, type InstitutionReport, type NationalReport, type NationalCdpRow } from '@/lib/supabase/adminApi'
// import { DIMENSIONS, KMGBF_TARGETS } from '@/lib/constants'
// import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler,
//          BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
// import Link from 'next/link'
// import { downloadCanvasAsImage, downloadCSV, downloadXLSX } from '@/lib/exportUtils'
// import { exportNationalPDF } from '@/lib/pdfExport'
// import ExportMenu from '@/components/ExportMenu'
// import {
//   Globe, Radar, BarChart2, Target, Download, Loader2,
//   Building2, ClipboardList, TrendingUp, ArrowRight, ChevronRight, ChevronDown, Table2, FileDown
// } from 'lucide-react'

// Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler,
//                BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

// // ─── Score helpers ─────────────────────────────────────────────
// function scoreColor(v: number | null): string {
//   if (v === null) return '#9ca3af'
//   if (v < 1) return '#dc2626'; if (v < 2) return '#ea580c'
//   if (v < 3) return '#ca8a04'; if (v < 4) return '#16a34a'
//   return '#047857'
// }
// function scoreBg(v: number | null): string {
//   if (v === null) return '#f3f4f6'
//   if (v < 1) return '#fee2e2'; if (v < 2) return '#ffedd5'
//   if (v < 3) return '#fef9c3'; if (v < 4) return '#dcfce7'
//   return '#d8f3dc'
// }
// function interpret(v: number | null): string {
//   if (v === null) return 'Not assessed'
//   if (v < 1) return 'Critical'; if (v < 2) return 'Very limited'
//   if (v < 2.5) return 'Basic';  if (v < 3.5) return 'Moderate'
//   if (v < 4.5) return 'Strong'; return 'Fully adequate'
// }

// // ─── Charts ────────────────────────────────────────────────────
// function NationalRadar({ scores, canvasRef }: { scores: Record<string, number | null>; canvasRef?: React.RefObject<HTMLCanvasElement> }) {
//   const innerRef = useRef<HTMLCanvasElement>(null)
//   const ref      = canvasRef ?? innerRef
//   const chart    = useRef<Chart | null>(null)
//   const labels   = DIMENSIONS.map(d => {
//     const w = d.split(' '); const m = Math.ceil(w.length / 2)
//     return [w.slice(0, m).join(' '), w.slice(m).join(' ')]
//   })

//   useEffect(() => {
//     if (!ref.current) return; chart.current?.destroy()
//     chart.current = new Chart(ref.current, {
//       type: 'radar',
//       data: {
//         labels,
//         datasets: [{ data: Object.values(scores).map(v => v ?? 0), backgroundColor:'rgba(64,145,108,.15)', borderColor:'#2d6a4f', borderWidth:2, pointBackgroundColor:'#52b788', pointRadius:4 }],
//       },
//       options: {
//         layout: { padding:28 },
//         scales: { r: { min:0, max:5, ticks:{ stepSize:1, font:{size:9}, backdropColor:'transparent', color:'#9ca3af' }, grid:{color:'rgba(0,0,0,.06)'}, angleLines:{color:'rgba(0,0,0,.08)'}, pointLabels:{ font:{size:13,family:'Syne',weight:'500'}, color:'#1b4332', padding:12 } } },
//         plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:(ctx) => ` ${ctx.parsed.r.toFixed(2)} / 5` } } },
//         animation:{ duration:600 },
//       },
//     })
//     return () => chart.current?.destroy()
//   }, [scores])

//   return <div style={{ height:480, position:'relative' }}><canvas ref={ref}/></div>
// }

// function MultiBarChart({ reports, canvasRef }: { reports: InstitutionReport[]; canvasRef?: React.RefObject<HTMLCanvasElement> }) {
//   const innerRef = useRef<HTMLCanvasElement>(null)
//   const ref      = canvasRef ?? innerRef
//   const chart    = useRef<Chart | null>(null)
//   const COLORS   = ['#52b788','#40916c','#74c69d','#95d5b2','#1b4332','#d8f3dc','#2d6a4f','#b7e4c7']

//   useEffect(() => {
//     if (!ref.current) return; chart.current?.destroy()
//     const withData = reports.filter(r => r.overallScore !== null)
//     chart.current = new Chart(ref.current, {
//       type: 'bar',
//       data: {
//         labels: DIMENSIONS.map(d => d.replace(' Capacity','').replace(' and ','/')),
//         datasets: withData.map((r, i) => ({
//           label: r.institution.name, data: DIMENSIONS.map(d => r.dimScores[d] ?? 0),
//           backgroundColor: COLORS[i % COLORS.length] + 'cc', borderColor: COLORS[i % COLORS.length], borderWidth:1, borderRadius:4,
//         })),
//       },
//       options: {
//         responsive:true,
//         scales: { x:{ ticks:{font:{size:9}}, grid:{display:false} }, y:{ min:0, max:5, ticks:{stepSize:1}, grid:{color:'rgba(0,0,0,.05)'} } },
//         plugins: { legend:{ position:'bottom', labels:{font:{size:10},boxWidth:10} }, tooltip:{mode:'index'} },
//         animation:{ duration:600 },
//       },
//     })
//     return () => chart.current?.destroy()
//   }, [reports])

//   return <div style={{ height:320, position:'relative' }}><canvas ref={ref}/></div>
// }

// function ScoreCell({ v }: { v: number | null }) {
//   return (
//     <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold"
//       style={{ background:scoreBg(v), color:scoreColor(v) }}>
//       {v !== null ? v.toFixed(2) : '—'}
//     </span>
//   )
// }

// async function exportNationalXLSX(national: NationalReport) {
//   const XLSX = await import('xlsx')
//   const wb   = XLSX.utils.book_new()
//   XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
//     ['KMGBF National Capacity Assessment Report'],
//     ['Generated', national.generatedAt],
//     ['Institutions assessed', national.institutions.filter(r => r.overallScore !== null).length],
//     [],
//     ['NATIONAL AVERAGE SCORES BY DIMENSION'],
//     ['Dimension', 'Average Score', 'Interpretation'],
//     ...DIMENSIONS.map(d => [d, national.nationalDimScores[d]?.toFixed(2) ?? '—', interpret(national.nationalDimScores[d])]),
//     [],
//     ['Overall National Score', national.nationalOverall?.toFixed(2) ?? '—'],
//   ]), 'National_Summary')
//   XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
//     ['Institution', 'Type', 'Level', 'Overall', ...DIMENSIONS, 'Answered/50', 'Status'],
//     ...national.institutions.map(r => [r.institution.name, r.institution.type??'', r.institution.level??'', r.overallScore?.toFixed(2)??'—', ...DIMENSIONS.map(d => r.dimScores[d]?.toFixed(2)??'—'), r.answeredCount, r.assessment?.status??'No assessment']),
//   ]), 'Institution_Comparison')
//   XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
//     ['Target', 'Target Title', 'National Avg', ...national.institutions.map(r => r.institution.name)],
//     ...KMGBF_TARGETS.map(t => [`T${t.num}`, t.title, national.nationalTargets[t.num]?.toFixed(2)??'—', ...national.institutions.map(r => r.targetScores[t.num]?.toFixed(2)??'—')]),
//   ]), 'Target_Readiness')
//   XLSX.writeFile(wb, `KMGBF_National_Report_${new Date().toISOString().slice(0,10)}.xlsx`)
// }

// // ─── Tab config ─────────────────────────────────────────────────
// const TABS = [
//   { id: 'overview'    as const, label: 'Overview',              Icon: Globe      },
//   { id: 'radar'       as const, label: 'National Radar',        Icon: Radar      },
//   { id: 'comparison'  as const, label: 'Institution Comparison', Icon: BarChart2  },
//   { id: 'targets'     as const, label: 'Target Readiness',      Icon: Target     },
//   { id: 'cdp'         as const, label: 'Development Plans',     Icon: Table2     },
// ]

// // ─── Section header ─────────────────────────────────────────────
// function SectionHeader({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children?: React.ReactNode }) {
//   return (
//     <div className="flex items-center justify-between mb-3">
//       <div className="flex items-center gap-2 card-title mb-0">
//         <Icon size={16} style={{ color:'#40916c', flexShrink:0 }}/>
//         {title}
//       </div>
//       {children}
//     </div>
//   )
// }

// // ─── Main page ─────────────────────────────────────────────────
// export default function AdminReportsPage() {
//   const [allReports,   setAllReports]   = useState<InstitutionReport[]>([])
//   const [national,     setNational]     = useState<NationalReport | null>(null)
//   const [loading,      setLoading]      = useState(true)
//   const [activeTab,    setActiveTab]    = useState<typeof TABS[number]['id']>('overview')
//   const [selected,     setSelected]     = useState<InstitutionReport | null>(null)
//   const [exporting,    setExporting]    = useState(false)
//   const [pdfExporting, setPdfExporting] = useState(false)
//   const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
//   const [filterOpen,   setFilterOpen]   = useState(false)
//   const [cdpRows,      setCdpRows]      = useState<NationalCdpRow[]>([])
//   const [cdpLoading,   setCdpLoading]   = useState(false)
//   const [cdpLoaded,    setCdpLoaded]    = useState(false)
//   const [cdpTab,       setCdpTab]       = useState<'core'|'targets'>('core')

//   const nationalRadarRef = useRef<HTMLCanvasElement>(null)
//   const multiBarRef      = useRef<HTMLCanvasElement>(null)
//   const date             = new Date().toISOString().slice(0,10)

//   useEffect(() => {
//     loadAllInstitutionReports().then(reports => {
//       setAllReports(reports)
//       setSelectedIds(new Set(reports.map(r => r.institution.id)))
//       setNational(buildNationalReport(reports))
//       setLoading(false)
//     })
//   }, [])

//   function toggleInstitution(id: string) {
//     setSelectedIds(prev => {
//       const next = new Set(prev)
//       if (next.has(id)) { if (next.size > 1) next.delete(id) }
//       else next.add(id)
//       return next
//     })
//   }

//   function applyFilter() {
//     const filtered = allReports.filter(r => selectedIds.has(r.institution.id))
//     setNational(buildNationalReport(filtered))
//     setFilterOpen(false)
//     if (activeTab === 'cdp') {
//       setCdpLoaded(false)
//       loadCdp([...selectedIds])
//     }
//   }

//   async function loadCdp(instIds?: string[]) {
//     setCdpLoading(true)
//     const rows = await loadNationalCdpRows(instIds?.length ? instIds : undefined)
//     setCdpRows(rows)
//     setCdpLoading(false)
//     setCdpLoaded(true)
//   }

//   function selectAll() { setSelectedIds(new Set(allReports.map(r => r.institution.id))) }
//   function clearAll()  { setSelectedIds(new Set([allReports[0]?.institution.id].filter(Boolean))) }

//   async function handleExport() {
//     if (!national) return
//     setExporting(true)
//     await exportNationalXLSX(national)
//     setExporting(false)
//   }

//   async function handlePDFExport() {
//     if (!national) return
//     setPdfExporting(true)
//     await exportNationalPDF(national, nationalRadarRef.current, multiBarRef.current, allReports.length)
//     setPdfExporting(false)
//   }

//   function handleTabClick(id: typeof TABS[number]['id']) {
//     setActiveTab(id)
//     if (id === 'cdp' && !cdpLoaded) {
//       loadCdp([...selectedIds])
//     }
//   }

//   if (loading) return (
//     <div className="flex items-center justify-center py-20">
//       <div className="flex flex-col items-center gap-3">
//         <Loader2 size={28} className="animate-spin" style={{ color:'#52b788' }}/>
//         <span className="text-[13px] text-forest-400">Loading all institution reports…</span>
//       </div>
//     </div>
//   )

//   if (!national) return null

//   const withData    = national.institutions.filter(r => r.overallScore !== null)
//   const withoutData = national.institutions.filter(r => r.overallScore === null)

//   return (
//     <div className="fade-in">
//       {/* Header */}
//       <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
//         <div>
//           <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c' }}>
//             National Reports
//           </h2>
//           <p className="text-[13.5px] text-forest-400 mt-1">
//             Aggregate capacity readiness across all {national.institutions.length} institutions.
//           </p>
//         </div>
//         <div className="flex gap-2 flex-wrap shrink-0">
//           <button className="btn btn-secondary flex items-center gap-2" onClick={handleExport} disabled={exporting}>
//             {exporting ? <><Loader2 size={13} className="animate-spin"/> Exporting…</> : <><Download size={13}/> Export XLSX</>}
//           </button>
//           <button className="btn btn-primary flex items-center gap-2" onClick={handlePDFExport} disabled={pdfExporting}>
//             {pdfExporting ? <><Loader2 size={13} className="animate-spin"/> Generating…</> : <><FileDown size={13}/> Download PDF</>}
//           </button>
//         </div>
//       </div>

//       {/* Stat cards */}
//       <div className="grid grid-cols-4 gap-4 mb-6">
//         {[
//           { label:'Institutions',     value: national.institutions.length,                                                                                          accent:'#52b788', Icon: Building2    },
//           { label:'With Assessments', value: withData.length,                                                                                                       accent:'#5b8dee', Icon: ClipboardList },
//           { label:'National Score',   value: national.nationalOverall?.toFixed(2) ?? '—',                                                                           accent:'#c8860a', Icon: TrendingUp    },
//           { label:'Avg Indicators',   value: withData.length ? Math.round(withData.reduce((s,r)=>s+r.answeredCount,0)/withData.length)+'/50' : '—',                accent:'#e07a5f', Icon: Target       },
//         ].map(({ label, value, accent, Icon }) => (
//           <div key={label} className="bg-white rounded-xl px-5 py-4 border border-sand-300/60"
//             style={{ borderTop:`3px solid ${accent}`, boxShadow:'0 2px 12px rgba(15,45,28,.08)' }}>
//             <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1.5">
//               <Icon size={11}/> {label}
//             </div>
//             <div className="text-[28px] text-forest-700" style={{ fontFamily:'var(--font-mono)', fontWeight:300 }}>{value}</div>
//           </div>
//         ))}
//       </div>

//       {/* Institution filter */}
//       <div className="mb-4">
//         <div className="flex items-center gap-3">
//           <button onClick={() => setFilterOpen(v => !v)}
//             className="flex items-center gap-2 px-4 py-2 rounded-xl border text-[12.5px] font-medium transition-all"
//             style={{ background: filterOpen ? '#1b4332' : 'white', color: filterOpen ? 'white' : '#374151', borderColor: filterOpen ? '#1b4332' : '#e5e7eb' }}>
//             <Building2 size={13}/>
//             Filter Institutions
//             <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
//               style={{ background: filterOpen ? 'rgba(255,255,255,.2)' : '#d8f3dc', color: filterOpen ? 'white' : '#1b4332' }}>
//               {selectedIds.size} / {allReports.length}
//             </span>
//             <ChevronDown size={12} style={{ transform: filterOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
//           </button>
//           {selectedIds.size < allReports.length && (
//             <span className="text-[12px] text-amber-600 font-medium">
//               ⚠️ Report filtered — showing {selectedIds.size} of {allReports.length} institutions
//             </span>
//           )}
//         </div>

//         {filterOpen && (
//           <div className="mt-2 p-4 bg-white rounded-2xl border border-sand-300"
//             style={{ boxShadow:'0 8px 24px rgba(0,0,0,.1)' }}>
//             <div className="flex items-center justify-between mb-3">
//               <p className="text-[12.5px] text-forest-500">Select which institutions to include in the national report:</p>
//               <div className="flex gap-2">
//                 <button onClick={selectAll} className="btn btn-ghost btn-sm">Select all</button>
//                 <button onClick={clearAll}  className="btn btn-ghost btn-sm">Clear</button>
//               </div>
//             </div>
//             <div className="grid grid-cols-2 gap-2 mb-4 max-h-64 overflow-y-auto">
//               {allReports.map(r => (
//                 <label key={r.institution.id}
//                   className="flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all"
//                   style={{ borderColor: selectedIds.has(r.institution.id) ? '#2d6a4f' : '#e8e3da', background: selectedIds.has(r.institution.id) ? '#f0faf4' : 'white' }}>
//                   <input type="checkbox" checked={selectedIds.has(r.institution.id)}
//                     onChange={() => toggleInstitution(r.institution.id)} style={{ accentColor:'#2d6a4f' }}/>
//                   <div className="flex-1 min-w-0">
//                     <div className="text-[12px] font-semibold text-forest-700 truncate">{r.institution.name}</div>
//                     <div className="text-[10px] text-forest-400">
//                       {r.institution.level ?? '—'} · {r.overallScore !== null ? r.overallScore.toFixed(2) : 'No data'}
//                     </div>
//                   </div>
//                   {r.overallScore !== null && (
//                     <span className="text-[11px] font-bold shrink-0"
//                       style={{ color: r.overallScore >= 3.5 ? '#047857' : r.overallScore >= 2 ? '#ca8a04' : '#dc2626' }}>
//                       {r.overallScore.toFixed(1)}
//                     </span>
//                   )}
//                 </label>
//               ))}
//             </div>
//             <button onClick={applyFilter} className="btn btn-primary w-full justify-center">
//               Apply — Rebuild National Report
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Tabs */}
//       <div className="flex gap-1 mb-5 bg-sand-100 p-1 rounded-xl w-fit flex-wrap">
//         {TABS.map(({ id, label, Icon }) => (
//           <button key={id} onClick={() => handleTabClick(id)}
//             className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all"
//             style={{ background: activeTab===id ? 'white' : 'transparent', color: activeTab===id ? '#1b4332' : '#6b7280', boxShadow: activeTab===id ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
//             <Icon size={13}/> {label}
//           </button>
//         ))}
//       </div>

//       {/* ── Overview ── */}
//       {activeTab === 'overview' && (
//         <div className="space-y-4">
//           <div className="card">
//             <SectionHeader icon={Globe} title="National Average — Capacity by Dimension"/>
//             <div className="space-y-3 mt-2">
//               {DIMENSIONS.map(dim => {
//                 const v   = national.nationalDimScores[dim]
//                 const pct = v !== null ? (v / 5) * 100 : 0
//                 return (
//                   <div key={dim} className="flex items-center gap-3">
//                     <div className="w-52 text-[12px] font-medium text-forest-600 shrink-0 truncate">{dim}</div>
//                     <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background:'#e8e3da' }}>
//                       <div className="h-full rounded-full transition-all duration-700 flex items-center ps-2"
//                         style={{ width:`${pct}%`, background:scoreColor(v), minWidth: v !== null ? 32 : 0 }}>
//                         {v !== null && <span className="text-[10px] text-white font-bold">{v.toFixed(1)}</span>}
//                       </div>
//                     </div>
//                     <span className="text-[11px] font-bold w-16 shrink-0" style={{ color:scoreColor(v) }}>{interpret(v)}</span>
//                   </div>
//                 )
//               })}
//             </div>
//           </div>

//           <div className="card">
//             <div className="flex items-center justify-between mb-4">
//               <div className="flex items-center gap-2 card-title mb-0">
//                 <Building2 size={16} style={{ color:'#40916c' }}/> Institutions ({national.institutions.length})
//               </div>
//               <div className="flex items-center gap-3">
//                 <ExportMenu mini options={[
//                   { label:'CSV',  icon:'📋', action:()=> downloadCSV([['Institution','Type','Level','Overall',...DIMENSIONS,'Answered','Status'],...national!.institutions.map(r=>[r.institution.name,r.institution.type??'',r.institution.level??'',r.overallScore?.toFixed(2)??'',...DIMENSIONS.map(d=>r.dimScores[d]?.toFixed(2)??''),r.answeredCount,r.assessment?.status??''])], `National_Institutions_${date}`) },
//                   { label:'XLSX', icon:'📊', action:()=> downloadXLSX([{name:'Institutions',rows:[['Institution','Type','Level','Overall',...DIMENSIONS,'Answered','Status'],...national!.institutions.map(r=>[r.institution.name,r.institution.type??'',r.institution.level??'',r.overallScore?.toFixed(2)??'',...DIMENSIONS.map(d=>r.dimScores[d]?.toFixed(2)??''),r.answeredCount,r.assessment?.status??''])]}], `National_Institutions_${date}`) },
//                 ]}/>
//                 {withoutData.length > 0 && <span className="text-[11px] text-forest-400">{withoutData.length} with no assessment yet</span>}
//               </div>
//             </div>
//             <div className="overflow-x-auto rounded-xl border border-sand-300">
//               <table className="rt" style={{ minWidth:900 }}>
//                 <thead>
//                   <tr>
//                     <th>Institution</th><th>Type</th><th>Overall</th>
//                     {DIMENSIONS.map(d => <th key={d} style={{ fontSize:10 }}>{d.replace(' Capacity','').replace(' and ','/')}</th>)}
//                     <th>Answered</th><th>Status</th><th></th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {national.institutions.map(r => (
//                     <tr key={r.institution.id} style={{ background: selected?.institution.id === r.institution.id ? '#f0faf4' : undefined }}>
//                       <td>
//                         <div className="font-semibold text-[12.5px] text-forest-700">{r.institution.name}</div>
//                         {r.institution.level && <div className="text-[10px] text-forest-400">{r.institution.level}</div>}
//                       </td>
//                       <td className="text-[11px] text-forest-400">{r.institution.type ?? '—'}</td>
//                       <td><ScoreCell v={r.overallScore}/></td>
//                       {DIMENSIONS.map(d => <td key={d}><ScoreCell v={r.dimScores[d]}/></td>)}
//                       <td>
//                         <span className="text-[11px] font-bold" style={{ fontFamily:'var(--font-mono)', color:r.answeredCount>0?'#1b4332':'#9ca3af' }}>
//                           {r.answeredCount}/50
//                         </span>
//                       </td>
//                       <td>
//                         {r.assessment
//                           ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
//                               style={{ background:r.assessment.status==='submitted'?'#dbeafe':r.assessment.status==='in_progress'?'#fef3c7':'#f3f4f6', color:r.assessment.status==='submitted'?'#1d4ed8':r.assessment.status==='in_progress'?'#d97706':'#6b7280' }}>
//                               {r.assessment.status?.replace('_',' ')}
//                             </span>
//                           : <span className="text-[10px] text-forest-300">No data</span>}
//                       </td>
//                       <td>
//                         <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={() => setSelected(r === selected ? null : r)}>
//                           {selected?.institution.id === r.institution.id ? 'Hide' : <><span>View</span><ChevronRight size={11}/></>}
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {selected && (
//             <div className="card border-2 border-forest-200">
//               <div className="flex items-center justify-between mb-4">
//                 <div>
//                   <div className="flex items-center gap-2 card-title mb-0.5">
//                     <ClipboardList size={15} style={{ color:'#40916c' }}/> {selected.institution.name}
//                   </div>
//                   <div className="text-[11.5px] text-forest-400">
//                     {selected.institution.type} · {selected.institution.level} ·{' '}
//                     {selected.assessment ? `Last updated ${new Date(selected.assessment.updated_at!).toLocaleDateString()}` : 'No assessment'}
//                   </div>
//                 </div>
//                 <Link href={`/admin/institutions/${selected.institution.id}`} className="btn btn-ghost btn-sm flex items-center gap-1">
//                   Manage <ArrowRight size={12}/>
//                 </Link>
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <div className="text-[11px] font-bold uppercase tracking-wide text-forest-400 mb-3">Dimension Scores</div>
//                   <div className="space-y-2">
//                     {DIMENSIONS.map(dim => {
//                       const v = selected.dimScores[dim]
//                       return (
//                         <div key={dim} className="flex items-center gap-2.5">
//                           <div className="text-[11.5px] text-forest-600 w-44 shrink-0 truncate">{dim}</div>
//                           <div className="flex-1 h-3.5 rounded-full overflow-hidden" style={{ background:'#e8e3da' }}>
//                             <div className="h-full rounded-full" style={{ width:`${v!==null?(v/5)*100:0}%`, background:scoreColor(v) }}/>
//                           </div>
//                           <span className="text-[11px] font-bold w-8 text-right shrink-0" style={{ color:scoreColor(v) }}>{v?.toFixed(1) ?? '—'}</span>
//                         </div>
//                       )
//                     })}
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-[11px] font-bold uppercase tracking-wide text-forest-400 mb-3">Target Scores</div>
//                   <div className="grid grid-cols-2 gap-1">
//                     {KMGBF_TARGETS.map(t => {
//                       const v = selected.targetScores[t.num]
//                       return (
//                         <div key={t.num} className="flex items-center gap-1.5 text-[11px]">
//                           <span className="text-forest-400 shrink-0">T{t.num}</span>
//                           <span className="truncate text-forest-600">{t.title}</span>
//                           <span className="ms-auto font-bold shrink-0" style={{ color:scoreColor(v) }}>{v?.toFixed(1) ?? '—'}</span>
//                         </div>
//                       )
//                     })}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── National Radar ── */}
//       {activeTab === 'radar' && (
//         <div className="grid grid-cols-2 gap-5">
//           <div className="card" style={{ gridColumn:'span 2' }}>
//             <SectionHeader icon={Radar} title="National Capacity Radar — Average Across All Institutions">
//               <ExportMenu mini options={[
//                 { label:'PNG image', icon:'🖼️', action:()=> nationalRadarRef.current && downloadCanvasAsImage(nationalRadarRef.current, `National_Radar_${date}`, 'png') },
//                 { label:'JPG image', icon:'📷', action:()=> nationalRadarRef.current && downloadCanvasAsImage(nationalRadarRef.current, `National_Radar_${date}`, 'jpg') },
//                 { label:'CSV data',  icon:'📋', action:()=> downloadCSV([['Dimension','National Avg'],...DIMENSIONS.map(d=>[d, national!.nationalDimScores[d]?.toFixed(2)??''])], `National_Radar_${date}`) },
//               ]}/>
//             </SectionHeader>
//             <p className="text-[12.5px] text-forest-400 mb-3">Includes {withData.length} institutions with assessment data.</p>
//             <div className="max-w-lg mx-auto">
//               <NationalRadar scores={national.nationalDimScores} canvasRef={nationalRadarRef}/>
//             </div>
//           </div>
//           {withData.map(r => (
//             <div key={r.institution.id} className="card">
//               <div className="flex items-center justify-between mb-2">
//                 <div className="flex items-center gap-1.5 card-title mb-0 text-[14px]">
//                   <Building2 size={13} style={{ color:'#40916c' }}/> {r.institution.name}
//                 </div>
//                 <span className="text-[12px] font-bold" style={{ fontFamily:'var(--font-mono)', color:scoreColor(r.overallScore) }}>
//                   {r.overallScore?.toFixed(2) ?? '—'}
//                 </span>
//               </div>
//               <NationalRadar scores={r.dimScores}/>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* ── Institution Comparison ── */}
//       {activeTab === 'comparison' && (
//         <div className="card">
//           <SectionHeader icon={BarChart2} title="Dimension Scores — All Institutions">
//             <ExportMenu mini options={[
//               { label:'PNG image', icon:'🖼️', action:()=> multiBarRef.current && downloadCanvasAsImage(multiBarRef.current, `National_DimComparison_${date}`, 'png') },
//               { label:'JPG image', icon:'📷', action:()=> multiBarRef.current && downloadCanvasAsImage(multiBarRef.current, `National_DimComparison_${date}`, 'jpg') },
//               { label:'CSV data',  icon:'📋', action:()=> downloadCSV([['Institution',...DIMENSIONS],...withData.map(r=>[r.institution.name,...DIMENSIONS.map(d=>r.dimScores[d]?.toFixed(2)??'')])], `National_DimComparison_${date}`) },
//               { label:'XLSX data', icon:'📊', action:()=> downloadXLSX([{name:'Comparison',rows:[['Institution',...DIMENSIONS],...withData.map(r=>[r.institution.name,...DIMENSIONS.map(d=>r.dimScores[d]?.toFixed(2)??'')])]}], `National_DimComparison_${date}`) },
//             ]}/>
//           </SectionHeader>
//           <p className="text-[12.5px] text-forest-400 mb-4">Grouped bar chart comparing all institutions across all 8 dimensions.</p>
//           {withData.length === 0
//             ? <div className="text-center py-10 text-forest-400">No institutions have assessment data yet.</div>
//             : <MultiBarChart reports={withData} canvasRef={multiBarRef}/>}
//         </div>
//       )}

//       {/* ── Target Readiness ── */}
//       {activeTab === 'targets' && (
//         <div className="card">
//           <SectionHeader icon={Target} title="KMGBF Target Readiness — National Overview">
//             <ExportMenu mini options={[
//               { label:'CSV data',  icon:'📋', action:()=> downloadCSV([['Target','Title','National Avg',...withData.map(r=>r.institution.name)],...KMGBF_TARGETS.map(t=>[`T${t.num}`,t.title,national!.nationalTargets[t.num]?.toFixed(2)??'',...withData.map(r=>r.targetScores[t.num]?.toFixed(2)??'')])], `National_Targets_${date}`) },
//               { label:'XLSX data', icon:'📊', action:()=> downloadXLSX([{name:'Target Readiness',rows:[['Target','Title','National Avg',...withData.map(r=>r.institution.name)],...KMGBF_TARGETS.map(t=>[`T${t.num}`,t.title,national!.nationalTargets[t.num]?.toFixed(2)??'',...withData.map(r=>r.targetScores[t.num]?.toFixed(2)??'')])]}], `National_Targets_${date}`) },
//             ]}/>
//           </SectionHeader>
//           <div className="overflow-x-auto rounded-xl border border-sand-300 mt-3">
//             <table className="rt" style={{ minWidth: Math.max(600, withData.length * 120 + 300) }}>
//               <thead>
//                 <tr>
//                   <th style={{ width:40 }}>#</th><th>Target</th><th>National Avg</th>
//                   {withData.map(r => <th key={r.institution.id} style={{ fontSize:10 }}>{r.institution.name.slice(0,20)}</th>)}
//                 </tr>
//               </thead>
//               <tbody>
//                 {KMGBF_TARGETS.map(t => (
//                   <tr key={t.num}>
//                     <td className="text-[11px] font-bold text-forest-400">T{t.num}</td>
//                     <td className="text-[12px] font-medium text-forest-700">{t.title}</td>
//                     <td><ScoreCell v={national.nationalTargets[t.num]}/></td>
//                     {withData.map(r => <td key={r.institution.id}><ScoreCell v={r.targetScores[t.num]}/></td>)}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

//       {/* ── Development Plans ── */}
//       {activeTab === 'cdp' && (
//         <div>
//           <SectionHeader icon={Table2} title="National Capacity Development Plans">
//             <ExportMenu mini options={[
//               { label:'CSV — Core',    icon:'📋', action:() => downloadCSV([
//                   ['Institution','Dimension','Capacity Gap','Action','Responsible','Timeline','Budget (USD)','Indicator','Collaboration','Status'],
//                   ...cdpRows.filter(r=>r.source==='core').map(r=>[r.institution_name,r.dimension??'',r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget_usd??'',r.indicator??'',r.collaboration??'',r.assessment_status??''])
//                 ], `National_Core_CDP_${date}`) },
//               { label:'CSV — Targets', icon:'📋', action:() => downloadCSV([
//                   ['Institution','Target','Capacity Gap','Action','Responsible','Timeline','Budget (USD)','Indicator','Collaboration','Status'],
//                   ...cdpRows.filter(r=>r.source==='target').map(r=>[r.institution_name,r.target_title??'',r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget_usd??'',r.indicator??'',r.collaboration??'',r.assessment_status??''])
//                 ], `National_Target_CDP_${date}`) },
//               { label:'XLSX — All',   icon:'📊', action:() => downloadXLSX([
//                   { name:'Core_CDP', rows:[
//                     ['Institution','Dimension','Capacity Gap','Action','Responsible','Timeline','Budget (USD)','Indicator','Collaboration','Status'],
//                     ...cdpRows.filter(r=>r.source==='core').map(r=>[r.institution_name,r.dimension??'',r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget_usd??'',r.indicator??'',r.collaboration??'',r.assessment_status??''])
//                   ]},
//                   { name:'Target_CDP', rows:[
//                     ['Institution','Target','Capacity Gap','Action','Responsible','Timeline','Budget (USD)','Indicator','Collaboration','Status'],
//                     ...cdpRows.filter(r=>r.source==='target').map(r=>[r.institution_name,r.target_title??'',r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget_usd??'',r.indicator??'',r.collaboration??'',r.assessment_status??''])
//                   ]},
//                 ], `National_CDP_${date}`) },
//             ]}/>
//           </SectionHeader>

//           {cdpLoading ? (
//             <div className="flex items-center justify-center py-16">
//               <Loader2 size={24} className="animate-spin" style={{ color:'#40916c' }}/>
//             </div>
//           ) : !cdpLoaded ? (
//             <div className="card text-center py-12">
//               <div className="text-2xl mb-2">📋</div>
//               <div className="text-[13px] text-forest-400 mb-3">Click to load all development plans and target gaps.</div>
//               <button className="btn btn-primary" onClick={() => loadCdp([...selectedIds])}>
//                 Load Plans & Target Gaps
//               </button>
//             </div>
//           ) : cdpRows.length === 0 ? (
//             <div className="card text-center py-12 text-forest-400">
//               No development plan actions or target gaps found across selected institutions.
//             </div>
//           ) : (() => {
//             // Detect target gaps by source field OR T-prefix pattern in gap text
//             // This handles rows where source='core' but gap is actually a target gap
//             const isTargetRow = (r: NationalCdpRow) =>
//               r.source === 'target' ||
//               /^T\d+:/.test(r.capacity_gap ?? '') ||
//               (r.target_num !== null && r.target_num > 0)

//             const coreRows   = cdpRows.filter(r => !isTargetRow(r))
//             const targetRows = cdpRows.filter(r =>  isTargetRow(r))

//             // ── Group core rows by DIMENSION first, then institution, then gap ──
//             const DIMENSION_ORDER = [
//               'Policy and Legal Capacity',
//               'Institutional Capacity',
//               'Technical Capacity',
//               'Financial Capacity',
//               'Coordination and Governance',
//               'Knowledge and Information Management',
//               'Infrastructure and Equipment',
//               'Awareness and Capacity Development',
//             ]
//             // dim → instId → gap → rows[]
//             type GapRows  = { rows: NationalCdpRow[] }
//             type InstGaps = { instName: string; gaps: Record<string, GapRows>; status: string|null }
//             type DimData  = { instMap: Record<string, InstGaps> }
//             const byDim: Record<string, DimData> = {}

//             coreRows.forEach(r => {
//               const dim    = r.dimension ?? 'Unclassified'
//               const instId = r.institution_id
//               const gap    = r.capacity_gap ?? '—'
//               if (!byDim[dim]) byDim[dim] = { instMap:{} }
//               if (!byDim[dim].instMap[instId]) byDim[dim].instMap[instId] = {
//                 instName: r.institution_name, gaps:{}, status: r.assessment_status
//               }
//               if (!byDim[dim].instMap[instId].gaps[gap])
//                 byDim[dim].instMap[instId].gaps[gap] = { rows:[] }
//               byDim[dim].instMap[instId].gaps[gap].rows.push(r)
//             })

//             // Sort dims in KMGBF order
//             const activeDims      = DIMENSION_ORDER.filter(d => byDim[d])
//             const unclassifiedDims = Object.keys(byDim).filter(d => !DIMENSION_ORDER.includes(d))

//             // ── Group target rows by target number, then institution ──
//             const byTarget: Record<number, { title:string; insts: Record<string,{name:string;rows:NationalCdpRow[]}> }> = {}
//             targetRows.forEach(r => {
//               const n = r.target_num ?? 0
//               if (!byTarget[n]) byTarget[n] = { title: r.target_title??`Target ${n}`, insts:{} }
//               if (!byTarget[n].insts[r.institution_id])
//                 byTarget[n].insts[r.institution_id] = { name:r.institution_name, rows:[] }
//               byTarget[n].insts[r.institution_id].rows.push(r)
//             })

//             const instIds   = [...new Set(cdpRows.map(r => r.institution_id))]
//             const statusBadge = (s: string | null) => s ? (
//               <span className="chip text-[10px]" style={{
//                 background: s==='approved'?'#d8f3dc':s==='submitted'?'#dbeafe':s==='in_review'?'#ede9fe':'#fef3c7',
//                 color:      s==='approved'?'#1b4332':s==='submitted'?'#1d4ed8':s==='in_review'?'#6d28d9':'#d97706',
//               }}>{s.replace('_',' ')}</span>
//             ) : null

//             return (
//               <>
//                 {/* Summary cards */}
//                 <div className="grid grid-cols-4 gap-3 mb-6">
//                   {[
//                     { label:'Dimensions',    value: activeDims.length,                          color:'#2d6a4f' },
//                     { label:'Institutions',  value: instIds.length,                             color:'#1b4332' },
//                     { label:'Core Actions',  value: coreRows.length,                            color:'#40916c' },
//                     { label:'Target Gaps',   value: targetRows.length,                          color:'#1d4ed8' },
//                   ].map(({ label, value, color }) => (
//                     <div key={label} className="card py-3 px-4" style={{ borderTop:`3px solid ${color}` }}>
//                       <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1">{label}</div>
//                       <div className="text-[26px] font-light" style={{ fontFamily:'var(--font-mono)', color }}>{value}</div>
//                     </div>
//                   ))}
//                 </div>

//                 {/* ══ Inner tabs: Core / Targets ══ */}
//                 <div className="flex gap-1 mb-5 bg-sand-100 p-1 rounded-xl w-fit">
//                   <button onClick={() => setCdpTab('core')}
//                     className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all"
//                     style={{ background: cdpTab==='core'?'white':'transparent', color: cdpTab==='core'?'#1b4332':'#6b7280', boxShadow: cdpTab==='core'?'0 1px 4px rgba(0,0,0,.08)':'none' }}>
//                     <ClipboardList size={13}/> Core Capacity
//                     <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1"
//                       style={{ background: cdpTab==='core'?'#d8f3dc':'#e5e7eb', color: cdpTab==='core'?'#1b4332':'#6b7280' }}>
//                       {coreRows.length}
//                     </span>
//                   </button>
//                   <button onClick={() => setCdpTab('targets')}
//                     className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all"
//                     style={{ background: cdpTab==='targets'?'white':'transparent', color: cdpTab==='targets'?'#1d4ed8':'#6b7280', boxShadow: cdpTab==='targets'?'0 1px 4px rgba(0,0,0,.08)':'none' }}>
//                     <Target size={13}/> Target Plans
//                     <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1"
//                       style={{ background: cdpTab==='targets'?'#dbeafe':'#e5e7eb', color: cdpTab==='targets'?'#1d4ed8':'#6b7280' }}>
//                       {targetRows.length}
//                     </span>
//                   </button>
//                 </div>

//                 {/* ══ SECTION 1: CORE CAPACITY — by dimension ══ */}
//                 {cdpTab === 'core' && (activeDims.length > 0 || unclassifiedDims.length > 0) && (
//                   <div className="mb-8">
//                     <div className="flex items-center gap-3 mb-5">
//                       <ClipboardList size={16} style={{ color:'#1b4332' }}/>
//                       <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#1b4332' }}>
//                         Core Capacity Development Plans
//                       </h3>
//                       <span className="chip text-[10px]" style={{ background:'#d8f3dc', color:'#1b4332' }}>
//                         {coreRows.length} actions across {activeDims.length} dimensions
//                       </span>
//                     </div>

//                     {[...activeDims, ...unclassifiedDims].map(dim => {
//                       const dimData   = byDim[dim]
//                       const dimInsts  = Object.entries(dimData.instMap)
//                       const shortDim  = dim.replace(' Capacity','').replace(' and ','/')
//                       const totalActs = coreRows.filter(r => (r.dimension ?? 'Other') === dim).length

//                       return (
//                         <div key={dim} className="mb-6 rounded-2xl overflow-hidden"
//                           style={{ border: `2px solid ${dim === 'Unclassified' ? '#d97706' : '#2d6a4f'}`, boxShadow:'0 2px 12px rgba(15,45,28,.1)' }}>

//                           {/* Dimension header */}
//                           <div className="flex items-center justify-between px-5 py-3.5"
//                             style={{ background:'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)' }}>
//                             <div className="flex items-center gap-3">
//                               <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
//                                 style={{ background:'rgba(255,255,255,.15)', color:'white' }}>
//                                 {shortDim.charAt(0)}
//                               </div>
//                               <div>
//                                 <div className="text-[14px] font-bold text-white">{dim}</div>
//                                 <div className="text-[10px]" style={{ color:'rgba(149,213,178,.7)' }}>
//                                   {dimInsts.length} institution{dimInsts.length!==1?'s':''} · {totalActs} action{totalActs!==1?'s':''}
//                                 </div>
//                               </div>
//                             </div>
//                           </div>

//                           {/* Institutions within this dimension */}
//                           <div style={{ background:'white' }}>
//                             {dimInsts.map(([instId, instData], instIdx) => (
//                               <div key={instId}
//                                 style={{ borderTop: instIdx > 0 ? '1px solid #e8e3da' : 'none' }}>

//                                 {/* Institution sub-header */}
//                                 <div className="flex items-center justify-between px-4 py-2.5"
//                                   style={{ background:'#f6f3ee' }}>
//                                   <div className="flex items-center gap-2">
//                                     <Building2 size={12} style={{ color:'#40916c' }}/>
//                                     <span className="text-[12.5px] font-bold text-forest-700">{instData.instName}</span>
//                                   </div>
//                                   <div className="flex items-center gap-2">
//                                     <span className="text-[10px] text-forest-400">
//                                       {Object.keys(instData.gaps).length} gap{Object.keys(instData.gaps).length!==1?'s':''}
//                                     </span>
//                                     {statusBadge(instData.status)}
//                                   </div>
//                                 </div>

//                                 {/* Gaps within this institution for this dimension */}
//                                 <div className="px-4 py-3 space-y-3">
//                                   {Object.entries(instData.gaps).map(([gap, { rows }]) => (
//                                     <div key={gap} className="rounded-xl overflow-hidden border border-sand-200">
//                                       {/* Gap label */}
//                                       <div className="flex items-center gap-2 px-3 py-2"
//                                         style={{ background:'#f0faf4', borderBottom:'1px solid #d8f3dc' }}>
//                                         <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:'#52b788' }}/>
//                                         <span className="text-[12px] font-semibold text-forest-700">{gap}</span>
//                                         <span className="text-[10px] text-forest-400 ml-auto">
//                                           {rows.length} action{rows.length!==1?'s':''}
//                                         </span>
//                                       </div>
//                                       {/* Actions */}
//                                       <table className="rt w-full" style={{ fontSize:11 }}>
//                                         <thead>
//                                           <tr>
//                                             <th>Action</th>
//                                             <th>Responsible</th>
//                                             <th>Timeline</th>
//                                             <th>Budget (USD)</th>
//                                             <th>Indicator</th>
//                                             <th>Collaboration</th>
//                                           </tr>
//                                         </thead>
//                                         <tbody>
//                                           {rows.map((r, i) => (
//                                             <tr key={i}>
//                                               <td>{r.action||'—'}</td>
//                                               <td className="text-forest-400">{r.institution||'—'}</td>
//                                               <td>{r.timeline ? <span className="chip text-[10px]" style={{ background:'#d8f3dc', color:'#1b4332', whiteSpace:'nowrap' }}>{r.timeline}</span> : '—'}</td>
//                                               <td className="font-mono">{r.budget_usd||'—'}</td>
//                                               <td className="text-forest-400">{r.indicator||'—'}</td>
//                                               <td className="text-forest-400">{r.collaboration||'—'}</td>
//                                             </tr>
//                                           ))}
//                                         </tbody>
//                                       </table>
//                                     </div>
//                                   ))}
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       )
//                     })}
//                   </div>
//                 )}

//                 {/* ══ SECTION 2: TARGET GAPS — by target, then institution ══ */}
//                 {cdpTab === 'targets' && Object.keys(byTarget).length > 0 && (
//                   <div className="mb-6">
//                     <div className="flex items-center gap-3 mb-5">
//                       <Target size={16} style={{ color:'#1d4ed8' }}/>
//                       <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#1d4ed8' }}>
//                         Target-Specific Action Plans
//                       </h3>
//                       <span className="chip text-[10px]" style={{ background:'#dbeafe', color:'#1d4ed8' }}>
//                         {targetRows.length} gaps across {Object.keys(byTarget).length} targets
//                       </span>
//                     </div>

//                     {Object.entries(byTarget)
//                       .sort(([a],[b]) => Number(a)-Number(b))
//                       .map(([tNum, { title, insts }]) => (
//                       <div key={tNum} className="mb-5 rounded-2xl overflow-hidden"
//                         style={{ border:'2px solid #3b82f6', boxShadow:'0 2px 12px rgba(29,78,216,.08)' }}>

//                         {/* Target header */}
//                         <div className="flex items-center gap-3 px-5 py-3.5"
//                           style={{ background:'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' }}>
//                           <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
//                             style={{ background:'rgba(255,255,255,.2)', color:'white' }}>
//                             T{tNum}
//                           </span>
//                           <div>
//                             <div className="text-[14px] font-bold text-white">{title}</div>
//                             <div className="text-[10px]" style={{ color:'rgba(191,219,254,.7)' }}>
//                               {Object.keys(insts).length} institution{Object.keys(insts).length!==1?'s':''} · {targetRows.filter(r=>r.target_num===Number(tNum)).length} gap{targetRows.filter(r=>r.target_num===Number(tNum)).length!==1?'s':''}
//                             </div>
//                           </div>
//                         </div>

//                         {/* Institutions within this target */}
//                         <div style={{ background:'white' }}>
//                           {Object.entries(insts).map(([instId, { name, rows }], instIdx) => (
//                             <div key={instId}
//                               style={{ borderTop: instIdx > 0 ? '1px solid #e8e3da' : 'none' }}>
//                               <div className="flex items-center gap-2 px-4 py-2.5" style={{ background:'#eff6ff' }}>
//                                 <Building2 size={12} style={{ color:'#3b82f6' }}/>
//                                 <span className="text-[12.5px] font-bold text-blue-800">{name}</span>
//                               </div>
//                               <div className="px-4 py-3">
//                                 <table className="rt w-full" style={{ fontSize:11 }}>
//                                   <thead>
//                                     <tr>
//                                       <th>Capacity Gap</th>
//                                       <th>Action</th>
//                                       <th>Timeline</th>
//                                       <th>Budget (USD)</th>
//                                       <th>Capacity Need</th>
//                                     </tr>
//                                   </thead>
//                                   <tbody>
//                                     {rows.map((r, i) => (
//                                       <tr key={i}>
//                                         <td className="font-medium">{r.capacity_gap||'—'}</td>
//                                         <td>{r.action||'—'}</td>
//                                         <td>{r.timeline ? <span className="chip text-[10px]" style={{ background:'#dbeafe', color:'#1d4ed8', whiteSpace:'nowrap' }}>{r.timeline}</span> : '—'}</td>
//                                         <td className="font-mono">{r.budget_usd||'—'}</td>
//                                         <td className="text-forest-400">{r.indicator||'—'}</td>
//                                       </tr>
//                                     ))}
//                                   </tbody>
//                                 </table>
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </>
//             )
//           })()}
//         </div>
//       )}

//     </div>
//   )
// }




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
  const [cdpTab,       setCdpTab]       = useState<'core'|'targets'>('core')

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
                  ['Institution','Dimension','Capacity Gap','Action','Responsible','Timeline','Budget (USD)','Indicator','Collaboration','Status'],
                  ...cdpRows.filter(r=>r.source==='core').map(r=>[r.institution_name,r.dimension??'',r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget_usd??'',r.indicator??'',r.collaboration??'',r.assessment_status??''])
                ], `National_Core_CDP_${date}`) },
              { label:'CSV — Targets', icon:'📋', action:() => downloadCSV([
                  ['Institution','Target','Capacity Gap','Action','Responsible','Timeline','Budget (USD)','Indicator','Collaboration','Status'],
                  ...cdpRows.filter(r=>r.source==='target').map(r=>[r.institution_name,r.target_title??'',r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget_usd??'',r.indicator??'',r.collaboration??'',r.assessment_status??''])
                ], `National_Target_CDP_${date}`) },
              { label:'XLSX — All',   icon:'📊', action:() => downloadXLSX([
                  { name:'Core_CDP', rows:[
                    ['Institution','Dimension','Capacity Gap','Action','Responsible','Timeline','Budget (USD)','Indicator','Collaboration','Status'],
                    ...cdpRows.filter(r=>r.source==='core').map(r=>[r.institution_name,r.dimension??'',r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget_usd??'',r.indicator??'',r.collaboration??'',r.assessment_status??''])
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
                Load Development Plans
              </button>
            </div>
          ) : cdpRows.length === 0 ? (
            <div className="card text-center py-12 text-forest-400">
              No development plan actions or target gaps found across selected institutions.
            </div>
          ) : (() => {
            // Detect target gaps by source field OR T-prefix pattern in gap text
            // This handles rows where source='core' but gap is actually a target gap
            const isTargetRow = (r: NationalCdpRow) =>
              r.source === 'target' ||
              /^T\d+:/.test(r.capacity_gap ?? '') ||
              (r.target_num !== null && r.target_num > 0)

            const coreRows   = cdpRows.filter(r => !isTargetRow(r))
            const targetRows = cdpRows.filter(r =>  isTargetRow(r))

            // ── Group core rows by DIMENSION first, then institution, then gap ──
            const DIMENSION_ORDER = [
              'Policy and Legal Capacity',
              'Institutional Capacity',
              'Technical Capacity',
              'Financial Capacity',
              'Coordination and Governance',
              'Knowledge and Information Management',
              'Infrastructure and Equipment',
              'Awareness and Capacity Development',
            ]
            // dim → instId → gap → rows[]
            type GapRows  = { rows: NationalCdpRow[] }
            type InstGaps = { instName: string; gaps: Record<string, GapRows>; status: string|null }
            type DimData  = { instMap: Record<string, InstGaps> }
            const byDim: Record<string, DimData> = {}

            coreRows.forEach(r => {
              const dim    = r.dimension ?? 'Unclassified'
              const instId = r.institution_id
              const gap    = r.capacity_gap ?? '—'
              if (!byDim[dim]) byDim[dim] = { instMap:{} }
              if (!byDim[dim].instMap[instId]) byDim[dim].instMap[instId] = {
                instName: r.institution_name, gaps:{}, status: r.assessment_status
              }
              if (!byDim[dim].instMap[instId].gaps[gap])
                byDim[dim].instMap[instId].gaps[gap] = { rows:[] }
              byDim[dim].instMap[instId].gaps[gap].rows.push(r)
            })

            // Sort dims in KMGBF order
            const activeDims      = DIMENSION_ORDER.filter(d => byDim[d])
            const unclassifiedDims = Object.keys(byDim).filter(d => !DIMENSION_ORDER.includes(d))

            // ── Group target rows by target number, then institution ──
            const byTarget: Record<number, { title:string; insts: Record<string,{name:string;rows:NationalCdpRow[]}> }> = {}
            targetRows.forEach(r => {
              const n = r.target_num ?? 0
              if (!byTarget[n]) byTarget[n] = { title: r.target_title??`Target ${n}`, insts:{} }
              if (!byTarget[n].insts[r.institution_id])
                byTarget[n].insts[r.institution_id] = { name:r.institution_name, rows:[] }
              byTarget[n].insts[r.institution_id].rows.push(r)
            })

            const instIds   = [...new Set(cdpRows.map(r => r.institution_id))]
            const statusBadge = (s: string | null) => s ? (
              <span className="chip text-[10px]" style={{
                background: s==='approved'?'#d8f3dc':s==='submitted'?'#dbeafe':s==='in_review'?'#ede9fe':'#fef3c7',
                color:      s==='approved'?'#1b4332':s==='submitted'?'#1d4ed8':s==='in_review'?'#6d28d9':'#d97706',
              }}>{s.replace('_',' ')}</span>
            ) : null

            return (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { label:'Dimensions',    value: activeDims.length,                          color:'#2d6a4f' },
                    { label:'Institutions',  value: instIds.length,                             color:'#1b4332' },
                    { label:'Core Actions',  value: coreRows.length,                            color:'#40916c' },
                    { label:'Target Gaps',    value: targetRows.length,                         color:'#1d4ed8' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="card py-3 px-4" style={{ borderTop:`3px solid ${color}` }}>
                      <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1">{label}</div>
                      <div className="text-[26px] font-light" style={{ fontFamily:'var(--font-mono)', color }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* ══ Inner tabs: Core / Targets ══ */}
                <div className="flex gap-1 mb-5 bg-sand-100 p-1 rounded-xl w-fit">
                  <button onClick={() => setCdpTab('core')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all"
                    style={{ background: cdpTab==='core'?'white':'transparent', color: cdpTab==='core'?'#1b4332':'#6b7280', boxShadow: cdpTab==='core'?'0 1px 4px rgba(0,0,0,.08)':'none' }}>
                    <ClipboardList size={13}/> Core Capacity
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1"
                      style={{ background: cdpTab==='core'?'#d8f3dc':'#e5e7eb', color: cdpTab==='core'?'#1b4332':'#6b7280' }}>
                      {coreRows.length}
                    </span>
                  </button>
                  <button onClick={() => setCdpTab('targets')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all"
                    style={{ background: cdpTab==='targets'?'white':'transparent', color: cdpTab==='targets'?'#1d4ed8':'#6b7280', boxShadow: cdpTab==='targets'?'0 1px 4px rgba(0,0,0,.08)':'none' }}>
                    <Target size={13}/> Target Plans
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1"
                      style={{ background: cdpTab==='targets'?'#dbeafe':'#e5e7eb', color: cdpTab==='targets'?'#1d4ed8':'#6b7280' }}>
                      {targetRows.length}
                    </span>
                  </button>
                </div>

                {/* ══ SECTION 1: CORE CAPACITY — by dimension ══ */}
                {cdpTab === 'core' && (activeDims.length > 0 || unclassifiedDims.length > 0) && (
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-5">
                      <ClipboardList size={16} style={{ color:'#1b4332' }}/>
                      <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#1b4332' }}>
                        Core Capacity Development Plans
                      </h3>
                      <span className="chip text-[10px]" style={{ background:'#d8f3dc', color:'#1b4332' }}>
                        {coreRows.length} actions across {activeDims.length} dimensions
                      </span>
                    </div>

                    {[...activeDims, ...unclassifiedDims].map(dim => {
                      const dimData   = byDim[dim]
                      const dimInsts  = Object.entries(dimData.instMap)
                      const shortDim  = dim.replace(' Capacity','').replace(' and ','/')
                      const totalActs = coreRows.filter(r => (r.dimension ?? 'Other') === dim).length

                      return (
                        <div key={dim} className="mb-6 rounded-2xl overflow-hidden"
                          style={{ border: `2px solid ${dim === 'Unclassified' ? '#d97706' : '#2d6a4f'}`, boxShadow:'0 2px 12px rgba(15,45,28,.1)' }}>

                          {/* Dimension header */}
                          <div className="flex items-center justify-between px-5 py-3.5"
                            style={{ background:'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)' }}>
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                                style={{ background:'rgba(255,255,255,.15)', color:'white' }}>
                                {shortDim.charAt(0)}
                              </div>
                              <div>
                                <div className="text-[14px] font-bold text-white">{dim}</div>
                                <div className="text-[10px]" style={{ color:'rgba(149,213,178,.7)' }}>
                                  {dimInsts.length} institution{dimInsts.length!==1?'s':''} · {totalActs} action{totalActs!==1?'s':''}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Institutions within this dimension */}
                          <div style={{ background:'white' }}>
                            {dimInsts.map(([instId, instData], instIdx) => (
                              <div key={instId}
                                style={{ borderTop: instIdx > 0 ? '1px solid #e8e3da' : 'none' }}>

                                {/* Institution sub-header */}
                                <div className="flex items-center justify-between px-4 py-2.5"
                                  style={{ background:'#f6f3ee' }}>
                                  <div className="flex items-center gap-2">
                                    <Building2 size={12} style={{ color:'#40916c' }}/>
                                    <span className="text-[12.5px] font-bold text-forest-700">{instData.instName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-forest-400">
                                      {Object.keys(instData.gaps).length} gap{Object.keys(instData.gaps).length!==1?'s':''}
                                    </span>
                                    {statusBadge(instData.status)}
                                  </div>
                                </div>

                                {/* Gaps within this institution for this dimension */}
                                <div className="px-4 py-3 space-y-3">
                                  {Object.entries(instData.gaps).map(([gap, { rows }]) => (
                                    <div key={gap} className="rounded-xl overflow-hidden border border-sand-200">
                                      {/* Gap label */}
                                      <div className="flex items-center gap-2 px-3 py-2"
                                        style={{ background:'#f0faf4', borderBottom:'1px solid #d8f3dc' }}>
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:'#52b788' }}/>
                                        <span className="text-[12px] font-semibold text-forest-700">{gap}</span>
                                        <span className="text-[10px] text-forest-400 ml-auto">
                                          {rows.length} action{rows.length!==1?'s':''}
                                        </span>
                                      </div>
                                      {/* Actions */}
                                      <table className="rt w-full" style={{ fontSize:11 }}>
                                        <thead>
                                          <tr>
                                            <th>Action</th>
                                            <th>Responsible</th>
                                            <th>Timeline</th>
                                            <th>Budget (USD)</th>
                                            <th>Indicator</th>
                                            <th>Collaboration</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {rows.map((r, i) => (
                                            <tr key={i}>
                                              <td>{r.action||'—'}</td>
                                              <td className="text-forest-400">{r.institution||'—'}</td>
                                              <td>{r.timeline ? <span className="chip text-[10px]" style={{ background:'#d8f3dc', color:'#1b4332', whiteSpace:'nowrap' }}>{r.timeline}</span> : '—'}</td>
                                              <td className="font-mono">{r.budget_usd||'—'}</td>
                                              <td className="text-forest-400">{r.indicator||'—'}</td>
                                              <td className="text-forest-400">{r.collaboration||'—'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ══ SECTION 2: TARGET GAPS — by target, then institution ══ */}
                {cdpTab === 'targets' && Object.keys(byTarget).length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-5">
                      <Target size={16} style={{ color:'#1d4ed8' }}/>
                      <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#1d4ed8' }}>
                        Target-Specific Action Plans
                      </h3>
                      <span className="chip text-[10px]" style={{ background:'#dbeafe', color:'#1d4ed8' }}>
                        {targetRows.length} action{targetRows.length!==1?'s':''} across {Object.keys(byTarget).length} target{Object.keys(byTarget).length!==1?'s':''}
                      </span>
                    </div>

                    {Object.entries(byTarget)
                      .sort(([a],[b]) => Number(a)-Number(b))
                      .map(([tNum, { title, insts }]) => (
                      <div key={tNum} className="mb-5 rounded-2xl overflow-hidden"
                        style={{ border:'2px solid #3b82f6', boxShadow:'0 2px 12px rgba(29,78,216,.08)' }}>

                        {/* Target header */}
                        <div className="flex items-center gap-3 px-5 py-3.5"
                          style={{ background:'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' }}>
                          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{ background:'rgba(255,255,255,.2)', color:'white' }}>
                            T{tNum}
                          </span>
                          <div>
                            <div className="text-[14px] font-bold text-white">{title}</div>
                            <div className="text-[10px]" style={{ color:'rgba(191,219,254,.7)' }}>
                              {Object.keys(insts).length} institution{Object.keys(insts).length!==1?'s':''} · {targetRows.filter(r=>r.target_num===Number(tNum)).length} gap{targetRows.filter(r=>r.target_num===Number(tNum)).length!==1?'s':''}
                            </div>
                          </div>
                        </div>

                        {/* Institutions within this target */}
                        <div style={{ background:'white' }}>
                          {Object.entries(insts).map(([instId, { name, rows }], instIdx) => (
                            <div key={instId}
                              style={{ borderTop: instIdx > 0 ? '1px solid #e8e3da' : 'none' }}>
                              <div className="flex items-center gap-2 px-4 py-2.5" style={{ background:'#eff6ff' }}>
                                <Building2 size={12} style={{ color:'#3b82f6' }}/>
                                <span className="text-[12.5px] font-bold text-blue-800">{name}</span>
                              </div>
                              <div className="px-4 py-3">
                                <table className="rt w-full" style={{ fontSize:11 }}>
                                  <thead>
                                    <tr>
                                      <th>Capacity Gap</th>
                                      <th>Action</th>
                                      <th>Timeline</th>
                                      <th>Budget (USD)</th>
                                      <th>Capacity Need</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.map((r, i) => (
                                      <tr key={i} style={{ background: !r.action ? '#fffbeb' : undefined }}>
                                        <td className="font-medium">{r.capacity_gap||'—'}</td>
                                        <td>
                                          {r.action
                                            ? r.action
                                            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:'#fef3c7', color:'#d97706' }}>No action planned</span>
                                          }
                                        </td>
                                        <td>{r.timeline ? <span className="chip text-[10px]" style={{ background:'#dbeafe', color:'#1d4ed8', whiteSpace:'nowrap' }}>{r.timeline}</span> : '—'}</td>
                                        <td className="font-mono">{r.budget_usd||'—'}</td>
                                        <td className="text-forest-400">{r.indicator||'—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
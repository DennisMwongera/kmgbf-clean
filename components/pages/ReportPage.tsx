'use client'
import { useStore } from '@/lib/store'
import { DIMENSIONS, KMGBF_TARGETS } from '@/lib/constants'
import { getDimScores, getOverall, getTargetAvg, groupedQuestions, interpret, scoreColor, gapBadge } from '@/lib/utils'
import { PageHeader, ScoreChip, GapBadge, EmptyState, Tabs } from '@/components/ui'
import { getT } from '@/lib/i18n'
import { supabase } from '@/lib/supabase/client'
import { useState, useEffect, useRef } from 'react'
import { downloadCanvasAsImage, downloadCSV, downloadXLSX } from '@/lib/exportUtils'
import ExportMenu from '@/components/ExportMenu'
import { Printer, BarChart2, Radar, Target, ClipboardList, FileText, PieChart, Table2, CheckCircle2, Send, Eye } from 'lucide-react'
import { Chart, BarController, CategoryScale, LinearScale, BarElement, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, PieController, ArcElement, Legend } from 'chart.js'

Chart.register(BarController, CategoryScale, LinearScale, BarElement, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, PieController, ArcElement, Legend)

// ─── Charts ───────────────────────────────────────────────────
function HBarChart({ scores, canvasRef }: { scores: Record<string, number | null>; canvasRef?: React.RefObject<HTMLCanvasElement> }) {
  const ref = canvasRef ?? useRef<HTMLCanvasElement>(null)
  const ch  = useRef<Chart | null>(null)
  useEffect(() => {
    if (!ref.current) return; ch.current?.destroy()
    ch.current = new Chart(ref.current, {
      type: 'bar',
      data: { labels: DIMENSIONS.map(d => d.length > 22 ? d.slice(0,20)+'…' : d), datasets: [{ data: DIMENSIONS.map(d => { const v=scores[d]; return (v!==null&&v!==-1) ? v : 0 }), backgroundColor: DIMENSIONS.map(d => scoreColor(scores[d])), borderRadius: 5 }] },
      options: { indexAxis:'y', scales:{ x:{min:0,max:5,ticks:{stepSize:1}}, y:{ticks:{font:{size:10,family:'Syne'}}} }, plugins:{legend:{display:false}}, animation:{duration:700} },
    })
    return () => ch.current?.destroy()
  }, [scores])
  return <canvas ref={ref}/>
}

function TargetHBarChart({ assessment, assignedNums, canvasRef }: {
  assessment: any; assignedNums: number[] | null; canvasRef?: React.RefObject<HTMLCanvasElement>
}) {
  const innerRef = useRef<HTMLCanvasElement>(null)
  const ref      = canvasRef ?? innerRef
  const ch       = useRef<Chart | null>(null)

  useEffect(() => {
    if (!ref.current) return; ch.current?.destroy()
    const targets = assignedNums ? KMGBF_TARGETS.filter(t => assignedNums.includes(t.num)) : KMGBF_TARGETS
    const scores  = targets.map(t => { const v = getTargetAvg(assessment, t.num, t.indicators); return (v !== null && v !== -1) ? v : 0 })
    const labels  = targets.map(t => `T${t.num}: ${t.title.length > 28 ? t.title.slice(0,26)+'…' : t.title}`)
    ch.current = new Chart(ref.current, {
      type: 'bar',
      data: { labels, datasets: [{ data: scores, backgroundColor: scores.map(v => scoreColor(v > 0 ? v : null)), borderRadius: 4, barThickness: 18 }] },
      options: {
        indexAxis: 'y',
        scales: { x:{ min:0, max:5, ticks:{stepSize:1,font:{size:10}}, grid:{color:'rgba(0,0,0,.05)'} }, y:{ ticks:{font:{size:10,family:'Syne'}} } },
        plugins: { legend:{display:false}, tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.x.toFixed(1)} / 5`}} },
        animation: { duration:700 },
      },
    })
    return () => ch.current?.destroy()
  }, [assessment, assignedNums])
  return <canvas ref={ref}/>
}

const PIE_COLORS = ['#dc2626','#ea580c','#ca8a04','#16a34a','#047857','#94a3b8']
const PIE_LABELS = ['Critical (0–1)','Very limited (1–2)','Basic (2–2.5)','Moderate (2.5–3.5)','Strong (3.5–4.5)','Fully adequate (4.5–5)']

function TargetPieChart({ assessment, assignedNums, canvasRef }: {
  assessment: any; assignedNums: number[] | null; canvasRef?: React.RefObject<HTMLCanvasElement>
}) {
  const innerRef = useRef<HTMLCanvasElement>(null)
  const ref      = canvasRef ?? innerRef
  const ch       = useRef<Chart | null>(null)

  useEffect(() => {
    if (!ref.current) return; ch.current?.destroy()
    const targets = assignedNums ? KMGBF_TARGETS.filter(t => assignedNums.includes(t.num)) : KMGBF_TARGETS
    const scores  = targets.map(t => getTargetAvg(assessment, t.num, t.indicators)).filter(v => v !== null) as number[]
    if (scores.length === 0) return
    const buckets = [0,0,0,0,0,0]
    scores.forEach(v => {
      if (v < 1) buckets[0]++; else if (v < 2) buckets[1]++; else if (v < 2.5) buckets[2]++
      else if (v < 3.5) buckets[3]++; else if (v < 4.5) buckets[4]++; else buckets[5]++
    })
    const active = buckets.map((v,i) => ({ v, color:PIE_COLORS[i], label:PIE_LABELS[i] })).filter(b => b.v > 0)
    ch.current = new Chart(ref.current, {
      type: 'pie',
      data: {
        labels: active.map(b => b.label),
        datasets: [{ data: active.map(b => b.v), backgroundColor: active.map(b => b.color), borderColor:'#ffffff', borderWidth:2, hoverOffset:8 }],
      },
      options: {
        animation: { duration:700 },
        plugins: { legend:{position:'right',labels:{font:{size:11},padding:12,boxWidth:14}}, tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.parsed} target${ctx.parsed!==1?'s':''}`}} },
      },
    })
    return () => ch.current?.destroy()
  }, [assessment, assignedNums])
  return <canvas ref={ref}/>
}

function ReportRadarChart({ assessment, canvasRef }: { assessment: any; canvasRef?: React.RefObject<HTMLCanvasElement> }) {
  const lang      = useStore(s => s.lang)
  const t         = getT(lang ?? 'en')
  const innerRef  = useRef<HTMLCanvasElement>(null)
  const ref       = canvasRef ?? innerRef
  const chart     = useRef<Chart | null>(null)
  const dimScores = getDimScores(assessment)
  const labels    = t.dimensions
  const data      = Object.values(dimScores).map(v => (v !== null && v !== -1) ? v : 0)

  useEffect(() => {
    if (!ref.current) return
    chart.current?.destroy()
    chart.current = new Chart(ref.current, {
      type: 'radar',
      data: {
        labels: labels.map(d => { const w = d.split(' '); if (w.length <= 2) return d; const m = Math.ceil(w.length/2); return [w.slice(0,m).join(' '), w.slice(m).join(' ')] }),
        datasets: [{ data, backgroundColor:'rgba(64,145,108,.15)', borderColor:'#2d6a4f', borderWidth:2, pointBackgroundColor:'#52b788', pointRadius:4, pointHoverRadius:6 }],
      },
      options: {
        layout:{ padding:28 },
        scales:{ r:{ min:0, max:5, ticks:{stepSize:1,font:{size:9},backdropColor:'transparent',color:'#9ca3af'}, grid:{color:'rgba(0,0,0,.06)'}, angleLines:{color:'rgba(0,0,0,.08)'}, pointLabels:{font:{size:11,family:'Syne',weight:'500'},color:'#1b4332',padding:8} } },
        plugins:{ legend:{display:false}, tooltip:{callbacks:{label:(ctx)=>` ${ctx.parsed.r.toFixed(1)} / 5`}} },
        animation:{duration:600},
      },
    })
    return () => chart.current?.destroy()
  }, [assessment, labels])
  return <div style={{ height:380, position:'relative' }}><canvas ref={ref} style={{ maxHeight:380 }}/></div>
}

// ─── Export helpers ────────────────────────────────────────────
function useReportExports(assessment: any, dimScores: Record<string, number | null>, assignedNums: number[] | null = null) {
  const barRef    = useRef<HTMLCanvasElement>(null)
  const radarRef  = useRef<HTMLCanvasElement>(null)
  const targetRef = useRef<HTMLCanvasElement>(null)
  const slug = (assessment.profile.name || 'Assessment').replace(/[^a-zA-Z0-9]/g,'_').slice(0,30)
  const date = new Date().toISOString().slice(0,10)

  const dimBarExports = [
    { label:'PNG image', icon:'🖼️', action: () => barRef.current && downloadCanvasAsImage(barRef.current, `${slug}_DimScores_${date}`, 'png') },
    { label:'JPG image', icon:'📷', action: () => barRef.current && downloadCanvasAsImage(barRef.current, `${slug}_DimScores_${date}`, 'jpg') },
    { label:'CSV data',  icon:'📋', action: () => downloadCSV([['Dimension','Score','Required','Gap','Interpretation'],...DIMENSIONS.map(d => { const s=dimScores[d]; const req=assessment.required[d]; return [d,s?.toFixed(2)??'',String(req),s!==null?(s-req).toFixed(2):'',interpret(s)] })], `${slug}_DimScores_${date}`) },
    { label:'XLSX data', icon:'📊', action: () => downloadXLSX([{name:'Dimension Scores',rows:[['Dimension','Score','Required','Gap','Interpretation'],...DIMENSIONS.map(d => { const s=dimScores[d]; const req=assessment.required[d]; return [d,s?.toFixed(2)??'',req,s!==null?(s-req).toFixed(2):'',interpret(s)] })]}], `${slug}_DimScores_${date}`) },
  ]
  const radarExports = [
    { label:'PNG image', icon:'🖼️', action: () => radarRef.current && downloadCanvasAsImage(radarRef.current, `${slug}_Radar_${date}`, 'png') },
    { label:'JPG image', icon:'📷', action: () => radarRef.current && downloadCanvasAsImage(radarRef.current, `${slug}_Radar_${date}`, 'jpg') },
    { label:'CSV data',  icon:'📋', action: () => downloadCSV([['Dimension','Score'],...DIMENSIONS.map(d=>[d,dimScores[d]?.toFixed(2)??''])], `${slug}_Radar_${date}`) },
  ]
  const assignedTargets = assignedNums ? KMGBF_TARGETS.filter(t => assignedNums.includes(t.num)) : KMGBF_TARGETS
  const targetBarExports = [
    { label:'PNG image', icon:'🖼️', action: () => targetRef.current && downloadCanvasAsImage(targetRef.current, `${slug}_Targets_${date}`, 'png') },
    { label:'JPG image', icon:'📷', action: () => targetRef.current && downloadCanvasAsImage(targetRef.current, `${slug}_Targets_${date}`, 'jpg') },
    { label:'CSV data',  icon:'📋', action: () => downloadCSV([['Target','Title','Score'],...assignedTargets.map(t=>[`T${t.num}`,t.title,getTargetAvg(assessment,t.num,t.indicators)?.toFixed(2)??''])], `${slug}_Targets_${date}`) },
    { label:'XLSX data', icon:'📊', action: () => downloadXLSX([{name:'Target Scores',rows:[['Target','Title','Score'],...assignedTargets.map(t=>[`T${t.num}`,t.title,getTargetAvg(assessment,t.num,t.indicators)?.toFixed(2)??''])]}], `${slug}_Targets_${date}`) },
  ]
  const coreExports = [
    { label:'CSV',  icon:'📋', action: () => downloadCSV([['Section','Indicator','Score','Evidence','Gap','Capacity Type','Priority','Suggested Support'],...assessment.coreRows.map((r: any,i: number)=>{ const q=require('@/lib/constants').CORE_QUESTIONS[i]; return [q.section,q.q,r.score??'',r.evidence,r.gap,r.capacityType,r.priority,r.suggestedSupport] })], `${slug}_CoreAssessment_${date}`) },
    { label:'XLSX', icon:'📊', action: () => downloadXLSX([{name:'Core Assessment',rows:[['Section','Indicator','Score','Evidence','Gap','Capacity Type','Priority','Suggested Support'],...assessment.coreRows.map((r: any,i: number)=>{ const q=require('@/lib/constants').CORE_QUESTIONS[i]; return [q.section,q.q,r.score??'',r.evidence,r.gap,r.capacityType,r.priority,r.suggestedSupport] })]}], `${slug}_CoreAssessment_${date}`) },
  ]
  const targetTableExports = [
    { label:'CSV',  icon:'📋', action: () => downloadCSV([['Target','Title','Indicator','Score','Evidence','Gap Identified','Capacity Need'],...KMGBF_TARGETS.flatMap(t=>t.indicators.map((ind,i)=>{ const r=assessment.targetRows[`t${t.num}_${i}`]; return [`T${t.num}`,t.title,ind,r?.score??'',r?.evidence??'',r?.gapIdentified??'',r?.capacityNeed??''] }))], `${slug}_Targets_${date}`) },
    { label:'XLSX', icon:'📊', action: () => downloadXLSX([{name:'Target Assessment',rows:[['Target','Title','Indicator','Score','Evidence','Gap Identified','Capacity Need'],...KMGBF_TARGETS.flatMap(t=>t.indicators.map((ind,i)=>{ const r=assessment.targetRows[`t${t.num}_${i}`]; return [`T${t.num}`,t.title,ind,r?.score??'',r?.evidence??'',r?.gapIdentified??'',r?.capacityNeed??''] }))]}], `${slug}_Targets_${date}`) },
  ]
  const cdpExports = [
    { label:'CSV',  icon:'📋', action: () => downloadCSV([['Capacity Gap','Action','Responsible','Timeline','Budget','Indicator','Collaboration'],...assessment.cdpRows.map((r: any)=>[r.capacityGap,r.action,r.institution,r.timeline,r.budget,r.indicator,r.collaboration])], `${slug}_CDP_${date}`) },
    { label:'XLSX', icon:'📊', action: () => downloadXLSX([{name:'Development Plan',rows:[['Capacity Gap','Action','Responsible','Timeline','Budget','Indicator','Collaboration'],...assessment.cdpRows.map((r: any)=>[r.capacityGap,r.action,r.institution,r.timeline,r.budget,r.indicator,r.collaboration])]}], `${slug}_CDP_${date}`) },
  ]
  const summaryTableExports = [
    { label:'CSV',  icon:'📋', action: () => downloadCSV([['Dimension','Score','Required','Gap','Interpretation'],...DIMENSIONS.map(d=>{ const s=dimScores[d]; const req=assessment.required[d]; return [d,s?.toFixed(2)??'',req,s!==null?(s-req).toFixed(2):'',interpret(s)] })], `${slug}_Summary_${date}`) },
    { label:'XLSX', icon:'📊', action: () => downloadXLSX([{name:'Summary',rows:[['Dimension','Score','Required','Gap','Interpretation'],...DIMENSIONS.map(d=>{ const s=dimScores[d]; const req=assessment.required[d]; return [d,s?.toFixed(2)??'',req,s!==null?(s-req).toFixed(2):'',interpret(s)] })]}], `${slug}_Summary_${date}`) },
  ]
  return { barRef, radarRef, targetRef, dimBarExports, radarExports, targetBarExports, coreExports, targetTableExports, cdpExports, summaryTableExports }
}

// ─── Section header with icon + export menu ───────────────────
function SectionHeader({ icon: Icon, title, exports }: { icon: React.ElementType; title: string; exports: any[] }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 card-title mb-0">
        <Icon size={16} style={{ color:'#40916c', flexShrink:0 }}/>
        {title}
      </div>
      <ExportMenu options={exports} mini/>
    </div>
  )
}

const TABS = [
  { id:'summary', label:'Summary',    Icon: FileText     },
  { id:'charts',  label:'Charts',     Icon: BarChart2    },
  { id:'core',    label:'Core Scores',Icon: ClipboardList },
  { id:'targets', label:'Targets',    Icon: Target       },
  { id:'cdp',     label:'Dev. Plan',  Icon: Table2       },
]

export default function ReportPage() {
  const { assessment, activeTab, setActiveTab, user } = useStore()
  const dimScores = getDimScores(assessment)
  const overall   = getOverall(assessment)
  const p         = assessment.profile
  const grouped   = groupedQuestions()
  const PC: Record<string,any> = { Low:{bg:'#dcfce7',color:'#15803d'}, Med:{bg:'#fef3c7',color:'#d97706'}, High:{bg:'#fee2e2',color:'#dc2626'} }

  const [assignedNums, setAssignedNums] = useState<number[] | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const pieRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!user?.institution_id) return
    supabase.from('institution_targets').select('target_num')
      .eq('institution_id', user.institution_id)
      .then(({ data }) => { if (data && data.length > 0) setAssignedNums(data.map(r => r.target_num)) })
  }, [user?.institution_id])

  async function submitAssessment() {
    if (!assessment.id) { alert('Please save your assessment first before submitting.'); return }
    if (!confirm('Submit this assessment? It will be marked as submitted and locked from further edits.')) return
    setSubmitting(true)
    await supabase.from('assessments').update({ status: 'submitted' }).eq('id', assessment.id)
    setAssessment({ ...assessment, status: 'submitted' })
    setSubmitting(false)
  }

  async function reopenAssessment() {
    if (!assessment.id) return
    await supabase.from('assessments').update({ status: 'in_progress' }).eq('id', assessment.id)
    setAssessment({ ...assessment, status: 'in_progress' })
  }

  const isSubmitted = ['submitted','in_review','approved'].includes(assessment.status ?? '')

  const { barRef, radarRef, targetRef, dimBarExports, radarExports, targetBarExports, coreExports, targetTableExports, cdpExports, summaryTableExports } = useReportExports(assessment, dimScores, assignedNums)

  return (
    <div className="fade-in">
      <PageHeader title="Reports & Analytics" desc="Charts, tables and data exports."/>

      {/* Tab bar with Lucide icons */}
      <div className="flex gap-1 mb-5 bg-sand-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-all"
            style={{ background: activeTab===id ? 'white' : 'transparent', color: activeTab===id ? '#1b4332' : '#6b7280', boxShadow: activeTab===id ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
            <Icon size={13}/>
            {label}
          </button>
        ))}
      </div>

      {/* ── Summary ── */}
      {activeTab==='summary' && (
        <div>
          <div className="card mb-5">
            <div className="flex justify-between items-start mb-5 flex-wrap gap-4">
              <div>
                <h3 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:700,color:'#0f2d1c',marginBottom:4}}>KMGBF Capacity Assessment Summary</h3>
                <p className="text-[13px] text-forest-400">{p.name||'—'} · {p.level||'—'} · {p.assessDate||'—'}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status badge */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
                  style={{
                    background: assessment.status==='approved' ? '#d8f3dc' : assessment.status==='in_review' ? '#ede9fe' : assessment.status==='submitted' ? '#dbeafe' : assessment.status==='in_progress' ? '#fef3c7' : '#f3f4f6',
                    color:      assessment.status==='approved' ? '#1b4332' : assessment.status==='in_review' ? '#6d28d9' : assessment.status==='submitted' ? '#1d4ed8' : assessment.status==='in_progress' ? '#d97706' : '#6b7280',
                  }}>
                  {assessment.status==='approved'    && <><CheckCircle2 size={12}/> Approved</>}
                  {assessment.status==='in_review'   && <><Eye size={12}/> In Review</>}
                  {assessment.status==='submitted'   && <><Send size={12}/> Submitted</>}
                  {assessment.status==='in_progress' && '⏳ In Progress'}
                  {assessment.status==='completed'   && '✓ Completed'}
                  {!assessment.status                && '— Draft'}
                </span>
                {/* Submit / Reopen */}
                {!isSubmitted ? (
                  <button className="btn btn-primary flex items-center gap-1.5"
                    onClick={submitAssessment} disabled={submitting || !assessment.id}>
                    {submitting ? 'Submitting…' : <><Send size={13}/> Submit Assessment</>}
                  </button>
                ) : (
                  <button className="btn btn-ghost btn-sm flex items-center gap-1.5"
                    onClick={reopenAssessment} style={{color:'#d97706'}}>
                    ↩ Reopen
                  </button>
                )}
                <button className="btn btn-ghost flex items-center gap-1.5" onClick={()=>setTimeout(()=>window.print(),50)}>
                  <Printer size={13}/> Print
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <table className="w-full text-[13px]"><tbody>
                {[['Institution',p.name],['Type',p.type],['Level',p.level],['Scope',p.scope],['Focal Point',p.focalName+(p.focalTitle?`, ${p.focalTitle}`:'')],['Email',p.focalEmail],['Date',p.assessDate]].map(([l,v])=>(
                  <tr key={l}><td className="text-forest-400 py-1 w-[40%] align-top">{l}:</td><td className="font-medium text-forest-700">{v||'—'}</td></tr>
                ))}
              </tbody></table>
              <div className="flex flex-col items-center justify-center text-center rounded-2xl py-7" style={{background:'#f6f3ee'}}>
                <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-3">Overall Readiness</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:56,fontWeight:300,lineHeight:1,color:scoreColor(overall)}}>{overall!==null?overall.toFixed(2):'—'}</div>
                <div className="text-[12px] text-forest-400 mt-1">out of 5.00</div>
                <div className="mt-2.5 px-4 py-1.5 rounded-full text-[12px] font-semibold" style={{background:scoreColor(overall)+'20',color:scoreColor(overall)}}>{interpret(overall)}</div>
                <div className="mt-3 text-[11px] text-forest-400">{assessment.coreRows.filter((r: any)=>r.score!==null&&r.score!==-1).length}/50 indicators scored</div>
              </div>
            </div>
          </div>
          <div className="card">
            <SectionHeader icon={BarChart2} title="Dimension Scores" exports={summaryTableExports}/>
            <div className="rounded-xl overflow-hidden border border-sand-300">
              <table className="rt w-full">
                <thead><tr><th>Dimension</th><th>Score</th><th>Required</th><th>Gap</th><th>Priority</th><th>Interpretation</th></tr></thead>
                <tbody>
                  {DIMENSIONS.map(d=>{
                    const s=dimScores[d]; const req=assessment.required[d]; const gap=(s!==null&&s!==-1)?s-req:null; const gb=gapBadge(gap)
                    return (<tr key={d}><td className="font-semibold text-[12.5px]">{d}</td><td><ScoreChip value={s}/></td>
                      <td><span className="chip" style={{background:'#e8e3da',color:'#5c7566'}}>{req}</span></td>
                      <td className="font-bold" style={{fontFamily:'var(--font-mono)',color:gap!==null&&gap<0?'#dc2626':'#15803d'}}>{gap!==null?(gap>=0?`+${gap.toFixed(1)}`:gap.toFixed(1)):'—'}</td>
                      <td><span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold" style={{background:gb.bg,color:gb.text}}>{gb.label}</span></td>
                      <td className="text-[12px]" style={{color:scoreColor(s)}}>{interpret(s)}</td></tr>)
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      {activeTab==='charts' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card">
            <SectionHeader icon={BarChart2} title="Dimension Bar Chart" exports={dimBarExports}/>
            <div style={{height:300}}><HBarChart scores={dimScores} canvasRef={barRef}/></div>
          </div>
          <div className="card">
            <SectionHeader icon={Radar} title="Capacity Radar" exports={radarExports}/>
            <ReportRadarChart assessment={assessment} canvasRef={radarRef}/>
          </div>
          <div className="card" style={{gridColumn:'span 2'}}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 card-title mb-0">
                <Target size={16} style={{ color:'#40916c' }}/>
                Target Scores & Distribution
                {assignedNums !== null && (
                  <span className="text-[11px] font-normal text-forest-400 ms-1">({assignedNums.length} assigned)</span>
                )}
              </div>
              <div className="flex gap-2">
                <ExportMenu mini label="Bar" options={targetBarExports}/>
                <ExportMenu mini label="Pie" options={[
                  { label:'PNG image', icon:'🖼️', action:()=> pieRef.current && downloadCanvasAsImage(pieRef.current, `${p.name||'Assessment'}_TargetDistribution`, 'png') },
                  { label:'JPG image', icon:'📷', action:()=> pieRef.current && downloadCanvasAsImage(pieRef.current, `${p.name||'Assessment'}_TargetDistribution`, 'jpg') },
                ]}/>
              </div>
            </div>
            {assignedNums !== null && (
              <p className="text-[11.5px] text-forest-400 mb-3">Showing {assignedNums.length} of 23 targets assigned to your institution.</p>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:24, alignItems:'start' }}>
              <div style={{ height: Math.max(200, (assignedNums?.length ?? 23) * 28 + 40) }}>
                <TargetHBarChart assessment={assessment} assignedNums={assignedNums} canvasRef={targetRef}/>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-forest-400 mb-2 justify-center">
                  <PieChart size={12}/> Score distribution
                </div>
                <div style={{ height:280 }}>
                  <TargetPieChart assessment={assessment} assignedNums={assignedNums} canvasRef={pieRef}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Core Scores ── */}
      {activeTab==='core' && (
        <div>
          <div className="flex justify-end mb-3">
            <ExportMenu options={coreExports} label="Export Core Data" mini/>
          </div>
          {Object.entries(grouped).map(([section, qs]) => (
            <div key={section} className="mb-5">
              <div className="flex items-center gap-2 text-[10.5px] font-bold tracking-[1px] uppercase px-3 py-2 rounded-lg mb-2" style={{color:'#2d6a4f',background:'#d8f3dc',borderLeft:'3px solid #52b788'}}>
                <ClipboardList size={12}/> {section}
              </div>
              <div className="rounded-xl overflow-hidden border border-sand-300">
                <table className="rt w-full">
                  <thead><tr><th style={{width:'28%'}}>Indicator</th><th>Score</th><th>Evidence</th><th>Gap</th><th>Type</th><th>Priority</th><th>Suggested Support</th></tr></thead>
                  <tbody>
                    {(qs as any[]).map(({q,idx}: any)=>{
                      const r=assessment.coreRows[idx]
                      return (<tr key={idx}>
                        <td className="text-[12px]">{q}</td><td><ScoreChip value={r.score}/></td>
                        <td className="text-[11.5px] text-forest-400">{r.evidence||'—'}</td>
                        <td className="text-[11.5px] text-forest-400">{r.gap||'—'}</td>
                        <td className="text-[11.5px] text-forest-400">{r.capacityType||'—'}</td>
                        <td>{PC[r.priority]?<span className="chip" style={PC[r.priority]}>{r.priority}</span>:<span className="text-forest-400 text-[11px]">—</span>}</td>
                        <td className="text-[11.5px] text-forest-400">{r.suggestedSupport||'—'}</td>
                      </tr>)
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Targets ── */}
      {activeTab==='targets' && (
        KMGBF_TARGETS.filter(t=>t.indicators.some((_,i)=>assessment.targetRows[`t${t.num}_${i}`]?.score!=null)).length > 0
          ? <div>
              <div className="flex justify-end mb-3">
                <ExportMenu options={targetTableExports} label="Export Targets Data" mini/>
              </div>
              {KMGBF_TARGETS.map(t => {
                const avg=getTargetAvg(assessment,t.num,t.indicators)
                if (!t.indicators.some((_,i)=>assessment.targetRows[`t${t.num}_${i}`]?.score!=null)) return null
                return (<div key={t.num} className="mb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-1 text-[10.5px] font-bold tracking-[1px] uppercase px-3 py-2 rounded-lg" style={{color:'#2d6a4f',background:'#d8f3dc',borderLeft:'3px solid #52b788'}}>
                      <Target size={12}/> T{t.num}: {t.title}
                    </div>
                    <ScoreChip value={avg}/>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-sand-300">
                    <table className="rt w-full">
                      <thead><tr><th>Indicator</th><th>Score</th><th>Evidence</th><th>Gap</th><th>Capacity Need</th></tr></thead>
                      <tbody>{t.indicators.map((ind,i)=>{const r=assessment.targetRows[`t${t.num}_${i}`];return(<tr key={i}><td className="text-[12.5px]">{ind}</td><td><ScoreChip value={r?.score??null}/></td><td className="text-[11.5px] text-forest-400">{r?.evidence||'—'}</td><td className="text-[11.5px] text-forest-400">{r?.gapIdentified||'—'}</td><td className="text-[11.5px] text-forest-400">{r?.capacityNeed||'—'}</td></tr>)})}</tbody>
                    </table>
                  </div>
                </div>)
              })}
            </div>
          : <div className="card"><EmptyState emoji="🎯" msg="No targets scored yet."/></div>
      )}

      {/* ── CDP ── */}
      {activeTab==='cdp' && (
        assessment.cdpRows.filter((r: any)=>r.capacityGap||r.action).length > 0
          ? <div>
              <div className="flex justify-end mb-3">
                <ExportMenu options={cdpExports} label="Export CDP Data" mini/>
              </div>
              <div className="rounded-xl overflow-hidden border border-sand-300">
                <table className="rt w-full">
                  <thead><tr><th>Capacity Gap</th><th>Action</th><th>Responsible</th><th>Timeline</th><th>Budget</th><th>Indicator</th><th>Collaboration</th></tr></thead>
                  <tbody>{assessment.cdpRows.filter((r: any)=>r.capacityGap||r.action).map((r: any,i: number)=>(
                    <tr key={i}><td>{r.capacityGap||'—'}</td><td>{r.action||'—'}</td><td>{r.institution||'—'}</td>
                      <td>{r.timeline?<span className="chip" style={{background:'#d8f3dc',color:'#1b4332'}}>{r.timeline}</span>:'—'}</td>
                      <td>{r.budget||'—'}</td><td>{r.indicator||'—'}</td><td>{r.collaboration||'—'}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          : <div className="card"><EmptyState emoji="📋" msg="No development plan actions defined."/></div>
      )}
    </div>
  )
}
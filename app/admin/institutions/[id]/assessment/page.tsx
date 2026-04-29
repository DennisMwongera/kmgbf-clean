'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart2, ClipboardList, Target, Table2, Radar, Printer, FileDown } from 'lucide-react'
import { loadInstitutionAssessmentDetail, type InstitutionAssessmentDetail } from '@/lib/supabase/adminApi'
import { DIMENSIONS, KMGBF_TARGETS } from '@/lib/constants'
import { scoreColor, interpret, isNA, isScorable } from '@/lib/utils'
import { downloadCanvasAsImage, downloadCSV, downloadXLSX } from '@/lib/exportUtils'
import ExportMenu from '@/components/ExportMenu'
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler,
         BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler,
               BarController, BarElement, CategoryScale, LinearScale, Tooltip)

// ─── Helpers ──────────────────────────────────────────────────
function ScoreCell({ v }: { v: number | null }) {
  if (v === null) return <span className="text-[11px] text-forest-300">—</span>
  if (isNA(v))   return <span className="chip" style={{ background:'#f3f4f6', color:'#9ca3af' }}>N/A</span>
  return (
    <span className="chip" style={{ background: scoreColor(v) + '22', color: scoreColor(v) }}>
      {v.toFixed(2)}
    </span>
  )
}

const PC: Record<string,any> = {
  Low:  { bg:'#dcfce7', color:'#15803d' },
  Med:  { bg:'#fef3c7', color:'#d97706' },
  High: { bg:'#fee2e2', color:'#dc2626' },
}

// ─── Charts ───────────────────────────────────────────────────
function RadarChart({ dimScores, canvasRef }: { dimScores: Record<string, number|null>; canvasRef: React.RefObject<HTMLCanvasElement> }) {
  const ch = useRef<Chart|null>(null)
  useEffect(() => {
    if (!canvasRef.current) return; ch.current?.destroy()
    const labels = DIMENSIONS.map(d => { const w=d.split(' '); const m=Math.ceil(w.length/2); return [w.slice(0,m).join(' '),w.slice(m).join(' ')] })
    const data   = DIMENSIONS.map(d => Math.max(0, dimScores[d] ?? 0))
    ch.current = new Chart(canvasRef.current, {
      type: 'radar',
      data: { labels, datasets: [{ data, backgroundColor:'rgba(64,145,108,.15)', borderColor:'#2d6a4f', borderWidth:2, pointBackgroundColor:'#52b788', pointRadius:4 }] },
      options: {
        layout:{ padding:36 },
        scales:{ r:{ min:0,max:5,ticks:{stepSize:1,font:{size:9},backdropColor:'transparent',color:'#9ca3af'},grid:{color:'rgba(0,0,0,.06)'},angleLines:{color:'rgba(0,0,0,.08)'},pointLabels:{font:{size:13,family:'Syne',weight:'600'},color:'#1b4332',padding:14} } },
        plugins:{ legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.r.toFixed(2)}/5`}} },
        animation:{duration:500},
      },
    })
    return () => ch.current?.destroy()
  }, [dimScores])
  return <canvas ref={canvasRef}/>
}

function DimBarChart({ dimScores, canvasRef }: { dimScores: Record<string,number|null>; canvasRef: React.RefObject<HTMLCanvasElement> }) {
  const ch = useRef<Chart|null>(null)
  useEffect(() => {
    if (!canvasRef.current) return; ch.current?.destroy()
    const data = DIMENSIONS.map(d => dimScores[d] ?? 0)
    ch.current = new Chart(canvasRef.current, {
      type:'bar',
      data:{ labels: DIMENSIONS.map(d=>d.replace(' Capacity','').replace(' and ','/')), datasets:[{ data, backgroundColor:data.map((_,i)=>scoreColor(DIMENSIONS.map(d=>dimScores[d])[i])), borderRadius:4 }] },
      options:{ indexAxis:'y',scales:{ x:{min:0,max:5,ticks:{stepSize:1}},y:{ticks:{font:{size:9}}} },plugins:{legend:{display:false}},animation:{duration:500} },
    })
    return () => ch.current?.destroy()
  }, [dimScores])
  return <canvas ref={canvasRef}/>
}

// ─── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { id:'overview',  label:'Overview',     Icon: BarChart2     },
  { id:'core',      label:'Core (50)',     Icon: ClipboardList },
  { id:'targets',   label:'Targets',      Icon: Target        },
  { id:'cdp',       label:'Dev. Plan',    Icon: Table2        },
]

// ─── Main page ────────────────────────────────────────────────
export default function AdminInstitutionAssessmentPage() {
  const { id } = useParams<{ id: string }>()
  const [data,     setData]     = useState<InstitutionAssessmentDetail|null>(null)
  const [loading,  setLoading]  = useState(true)
  const [activeTab,setActiveTab]= useState('overview')
  const [xlsxBusy, setXlsxBusy]   = useState(false)
  const [pdfBusy,  setPdfBusy]    = useState(false)

  const radarRef = useRef<HTMLCanvasElement>(null)
  const barRef   = useRef<HTMLCanvasElement>(null)
  const date     = new Date().toISOString().slice(0,10)

  useEffect(() => {
    loadInstitutionAssessmentDetail(id).then(d => { setData(d); setLoading(false) })
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-7 h-7 border-2 border-forest-200 border-t-forest-500 rounded-full animate-spin"/>
    </div>
  )
  if (!data) return <div className="card">Institution not found.</div>

  const slug  = data.profile.name.replace(/[^a-zA-Z0-9]/g,'_').slice(0,30)
  const naCount   = data.coreRows.filter(r => r.score === -1).length
  const scoredCount = data.coreRows.filter(r => isScorable(r.score)).length

  const coreExports = [
    { label:'CSV',  icon:'📋', action:()=>downloadCSV([['#','Section','Indicator','Score','Evidence','Gap','Type','Priority','Support'],...data.coreRows.map((r,i)=>[i+1,r.section,r.question,r.score===-1?'N/A':r.score??'',r.evidence??'',r.gap??'',r.capacityType??'',r.priority??'',r.suggestedSupport??''])],`${slug}_Core_${date}`) },
    { label:'XLSX', icon:'📊', action:()=>downloadXLSX([{name:'Core',rows:[['#','Section','Indicator','Score','Evidence','Gap','Type','Priority','Support'],...data!.coreRows.map((r,i)=>[i+1,r.section,r.question,r.score===-1?'N/A':r.score??'',r.evidence??'',r.gap??'',r.capacityType??'',r.priority??'',r.suggestedSupport??''])]}],`${slug}_Core_${date}`) },
  ]
  const targetExports = [
    { label:'CSV',  icon:'📋', action:()=>downloadCSV([['Target #','Title','Indicator','Score','Evidence','Gap','Need'],...data.targetRows.map(r=>[r.target_num,KMGBF_TARGETS.find(t=>t.num===r.target_num)?.title??'',r.indicator,r.score===-1?'N/A':r.score??'',r.evidence??'',r.gapIdentified??'',r.capacityNeed??''])],`${slug}_Targets_${date}`) },
    { label:'XLSX', icon:'📊', action:()=>downloadXLSX([{name:'Targets',rows:[['Target #','Title','Indicator','Score','Evidence','Gap','Need'],...data!.targetRows.map(r=>[r.target_num,KMGBF_TARGETS.find(t=>t.num===r.target_num)?.title??'',r.indicator,r.score===-1?'N/A':r.score??'',r.evidence??'',r.gapIdentified??'',r.capacityNeed??''])]}],`${slug}_Targets_${date}`) },
  ]
  const cdpExports = [
    { label:'CSV',  icon:'📋', action:()=>downloadCSV([['Gap','Action','Responsible','Timeline','Budget','Indicator','Collaboration'],...data.cdpRows.map(r=>[r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget??'',r.indicator??'',r.collaboration??''])],`${slug}_CDP_${date}`) },
    { label:'XLSX', icon:'📊', action:()=>downloadXLSX([{name:'CDP',rows:[['Gap','Action','Responsible','Timeline','Budget','Indicator','Collaboration'],...data!.cdpRows.map(r=>[r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget??'',r.indicator??'',r.collaboration??''])]}],`${slug}_CDP_${date}`) },
  ]

  // ── Full XLSX (6 sheets) ────────────────────────────────────
  async function handleFullXLSX() {
    if (!data) return
    setXlsxBusy(true)
    await downloadXLSX([
      {
        name: 'Institutional_Profile',
        rows: [
          ['KMGBF Capacity Needs Assessment'],
          ['Institution', data.profile.name ?? ''],
          ['Type',        data.profile.type  ?? ''],
          ['Level',       data.profile.level ?? ''],
          ['Scope',       data.profile.scope ?? ''],
          ['Mandate',     data.profile.mandate ?? ''],
          [],
          ['Focal Point', data.profile.focalName  ?? ''],
          ['Title',       data.profile.focalTitle ?? ''],
          ['Email',       data.profile.focalEmail ?? ''],
          ['Assess Date', data.profile.assessDate ?? ''],
        ]
      },
      {
        name: 'Core_Assessment',
        rows: [
          ['#','Section','Indicator','Score','Evidence','Gap','Capacity Type','Priority','Suggested Support'],
          ...data.coreRows.map((r,i) => [
            i+1, r.section, r.question,
            r.score === -1 ? 'N/A' : r.score ?? '',
            r.evidence ?? '', r.gap ?? '', r.capacityType ?? '',
            r.priority ?? '', r.suggestedSupport ?? '',
          ])
        ]
      },
      {
        name: 'Target_Assessment',
        rows: [
          ['Target #','Target Title','Indicator','Score','Evidence','Gap Identified','Capacity Need'],
          ...data.targetRows.map(r => [
            r.target_num,
            KMGBF_TARGETS.find(t => t.num === r.target_num)?.title ?? '',
            r.indicator,
            r.score === -1 ? 'N/A' : r.score ?? '',
            r.evidence ?? '', r.gapIdentified ?? '', r.capacityNeed ?? '',
          ])
        ]
      },
      {
        name: 'Gap_Analysis',
        rows: [
          ['Dimension','Score','Scored Indicators','N/A','Interpretation'],
          ...DIMENSIONS.map(dim => {
            const rows   = data!.coreRows.filter(r => r.section === dim)
            const scored = rows.filter(r => r.score !== null && r.score !== -1).length
            const na     = rows.filter(r => r.score === -1).length
            const v      = data!.dimScores[dim]
            return [dim, v?.toFixed(2) ?? '—', `${scored}/${rows.length}`, na, interpret(v)]
          })
        ]
      },
      {
        name: 'Target_Summary',
        rows: [
          ['Target #','Title','Avg Score','Interpretation'],
          ...KMGBF_TARGETS.map(t => {
            const v = data!.targetScores[t.num]
            return [t.num, t.title, v?.toFixed(2) ?? '—', interpret(v)]
          })
        ]
      },
      {
        name: 'Development_Plan',
        rows: [
          ['Capacity Gap','Action','Responsible Institution','Timeline','Budget (USD)','Progress Indicator','Collaboration'],
          ...data.cdpRows
            .filter(r => r.capacity_gap || r.action)
            .map(r => [r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget??'',r.indicator??'',r.collaboration??''])
        ]
      },
    ], `KMGBF_CNA_${slug}_${date}`)
    setXlsxBusy(false)
  }

  // ── Full CSV (6 files) ──────────────────────────────────────
  async function handleFullCSV() {
    if (!data) return
    // Profile
    downloadCSV([
      ['Field','Value'],
      ['Institution', data.profile.name??''], ['Type',data.profile.type??''], ['Level',data.profile.level??''],
      ['Scope',data.profile.scope??''], ['Mandate',data.profile.mandate??''],
      ['Focal Point',data.profile.focalName??''], ['Title',data.profile.focalTitle??''],
      ['Email',data.profile.focalEmail??''], ['Assess Date',data.profile.assessDate??''],
    ], `${slug}_1_Profile_${date}`)
    await new Promise(r => setTimeout(r, 200))
    // Core
    downloadCSV([
      ['#','Section','Indicator','Score','Evidence','Gap','Capacity Type','Priority','Support'],
      ...data.coreRows.map((r,i) => [i+1,r.section,r.question,r.score===-1?'N/A':r.score??'',r.evidence??'',r.gap??'',r.capacityType??'',r.priority??'',r.suggestedSupport??''])
    ], `${slug}_2_CoreAssessment_${date}`)
    await new Promise(r => setTimeout(r, 200))
    // Targets
    downloadCSV([
      ['Target #','Title','Indicator','Score','Evidence','Gap Identified','Capacity Need'],
      ...data.targetRows.map(r=>[r.target_num,KMGBF_TARGETS.find(t=>t.num===r.target_num)?.title??'',r.indicator,r.score===-1?'N/A':r.score??'',r.evidence??'',r.gapIdentified??'',r.capacityNeed??''])
    ], `${slug}_3_Targets_${date}`)
    await new Promise(r => setTimeout(r, 200))
    // Gap Analysis
    downloadCSV([
      ['Dimension','Score','Scored','N/A','Interpretation'],
      ...DIMENSIONS.map(dim => {
        const rows=data!.coreRows.filter(r=>r.section===dim)
        const scored=rows.filter(r=>r.score!==null&&r.score!==-1).length
        const na=rows.filter(r=>r.score===-1).length
        const v=data!.dimScores[dim]
        return [dim,v?.toFixed(2)??'—',`${scored}/${rows.length}`,na,interpret(v)]
      })
    ], `${slug}_4_GapAnalysis_${date}`)
    await new Promise(r => setTimeout(r, 200))
    // CDP
    downloadCSV([
      ['Capacity Gap','Action','Responsible','Timeline','Budget','Indicator','Collaboration'],
      ...data.cdpRows.filter(r=>r.capacity_gap||r.action).map(r=>[r.capacity_gap??'',r.action??'',r.institution??'',r.timeline??'',r.budget??'',r.indicator??'',r.collaboration??''])
    ], `${slug}_5_DevelopmentPlan_${date}`)
  }

  // ── PDF (print) ─────────────────────────────────────────────
  function handlePDF() {
    setTimeout(() => window.print(), 50)
  }

  return (
    <div className="fade-in">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/admin/institutions/${id}`} className="btn btn-ghost btn-sm flex items-center gap-1">
              <ArrowLeft size={12}/> Back to Institution
            </Link>
          </div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'#0f2d1c' }}>
            {data.profile.name}
          </h2>
          <p className="text-[13px] text-forest-400 mt-0.5">
            {data.profile.type} · {data.profile.level} · Assessment view
            {data.assessment && <span className="ml-2 text-[11px]">Updated {new Date(data.assessment.updated_at!).toLocaleDateString()}</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportMenu label="CSV (6 files)" options={[
            { label:'Download all 6 CSV files', icon:'📋', action: handleFullCSV },
          ]}/>
          <button className="btn btn-secondary flex items-center gap-2"
            onClick={handleFullXLSX} disabled={xlsxBusy}>
            {xlsxBusy
              ? <><span className="w-3 h-3 border-2 border-forest-300 border-t-forest-600 rounded-full animate-spin"/>Exporting…</>
              : <><FileDown size={13}/> XLSX (6 sheets)</>}
          </button>
          <button className="btn btn-ghost flex items-center gap-1.5"
            onClick={handlePDF}>
            <Printer size={13}/> Print / PDF
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label:'Overall Score',  value: data.overallScore?.toFixed(2) ?? '—', color: scoreColor(data.overallScore) },
          { label:'Scored',         value: `${scoredCount}/50`,                   color: '#40916c' },
          { label:'N/A rows',       value: String(naCount),                       color: '#9ca3af' },
          { label:'Status',         value: data.assessment?.status?.replace('_',' ') ?? 'No data', color: '#5b8dee' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-3 px-4" style={{ borderTop:`3px solid ${color}` }}>
            <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1">{label}</div>
            <div className="text-[24px] font-light text-forest-700" style={{ fontFamily:'var(--font-mono)', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-sand-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(({ id: tid, label, Icon }) => (
          <button key={tid} onClick={() => setActiveTab(tid)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-all"
            style={{ background: activeTab===tid?'white':'transparent', color: activeTab===tid?'#1b4332':'#6b7280', boxShadow: activeTab===tid?'0 1px 4px rgba(0,0,0,.08)':'none' }}>
            <Icon size={13}/> {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab==='overview' && (
        <div className="space-y-5">
          {/* Profile */}
          <div className="card">
            <div className="card-title">🏛️ Institutional Profile</div>
            <div className="grid grid-cols-2 gap-4 text-[13px]">
              {[
                ['Institution',   data.profile.name],
                ['Type',          data.profile.type],
                ['Level',         data.profile.level],
                ['Scope',         data.profile.scope],
                ['Focal Point',   data.profile.focalName],
                ['Title',         data.profile.focalTitle],
                ['Email',         data.profile.focalEmail],
                ['Assess Date',   data.profile.assessDate],
              ].map(([l,v]) => (
                <div key={l} className="flex gap-2">
                  <span className="text-forest-400 w-28 shrink-0">{l}:</span>
                  <span className="font-medium text-forest-700">{v || '—'}</span>
                </div>
              ))}
            </div>
            {data.profile.mandate && (
              <div className="mt-3 pt-3 border-t border-sand-300">
                <span className="text-forest-400 text-[12px]">Mandate: </span>
                <span className="text-[12px] text-forest-600">{data.profile.mandate}</span>
              </div>
            )}
          </div>

          {/* Charts */}
          {/* Radar — full width, centred */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 card-title mb-0"><Radar size={15} style={{color:'#40916c'}}/>Capacity Radar</div>
              <ExportMenu mini options={[
                { label:'PNG', icon:'🖼️', action:()=>radarRef.current&&downloadCanvasAsImage(radarRef.current,`${slug}_Radar_${date}`,'png') },
                { label:'JPG', icon:'📷', action:()=>radarRef.current&&downloadCanvasAsImage(radarRef.current,`${slug}_Radar_${date}`,'jpg') },
              ]}/>
            </div>
            <div style={{ height:520, maxWidth:680, margin:'0 auto' }}>
              <RadarChart dimScores={data.dimScores} canvasRef={radarRef}/>
            </div>
          </div>

          {/* Bar chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 card-title mb-0"><BarChart2 size={15} style={{color:'#40916c'}}/>Dimension Scores</div>
              <ExportMenu mini options={[
                { label:'PNG',  icon:'🖼️', action:()=>barRef.current&&downloadCanvasAsImage(barRef.current,`${slug}_Dims_${date}`,'png') },
                { label:'JPG',  icon:'📷', action:()=>barRef.current&&downloadCanvasAsImage(barRef.current,`${slug}_Dims_${date}`,'jpg') },
                { label:'CSV',  icon:'📋', action:()=>downloadCSV([['Dimension','Score','Interpretation'],...DIMENSIONS.map(d=>[d,data!.dimScores[d]?.toFixed(2)??'',interpret(data!.dimScores[d])])],`${slug}_Dims_${date}`) },
              ]}/>
            </div>
            <div style={{height:300}}><DimBarChart dimScores={data.dimScores} canvasRef={barRef}/></div>
          </div>

          {/* Dimension summary table */}
          <div className="card">
            <div className="card-title">📊 Dimension Summary</div>
            <div className="rounded-xl overflow-hidden border border-sand-300">
              <table className="rt w-full">
                <thead><tr><th>Dimension</th><th>Score</th><th>Scored</th><th>N/A</th><th>Interpretation</th></tr></thead>
                <tbody>
                  {DIMENSIONS.map(dim => {
                    const dimRows = data.coreRows.filter(r => r.section === dim)
                    const scored  = dimRows.filter(r => isScorable(r.score)).length
                    const naCount = dimRows.filter(r => r.score === -1).length
                    const v       = data.dimScores[dim]
                    return (
                      <tr key={dim}>
                        <td className="font-semibold text-[12.5px]">{dim}</td>
                        <td><ScoreCell v={v}/></td>
                        <td><span className="text-[11px] font-mono">{scored}/{dimRows.length}</span></td>
                        <td>{naCount > 0 ? <span className="chip" style={{background:'#f3f4f6',color:'#9ca3af'}}>{naCount} N/A</span> : <span className="text-forest-300 text-[11px]">—</span>}</td>
                        <td className="text-[12px]" style={{color:scoreColor(v)}}>{interpret(v)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Target summary */}
          <div className="card">
            <div className="card-title">🎯 Target Scores</div>
            <div className="grid grid-cols-4 gap-2">
              {KMGBF_TARGETS.map(t => {
                const v = data.targetScores[t.num]
                return (
                  <div key={t.num} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-sand-300 bg-white">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: v!==null?scoreColor(v)+'22':'#f3f4f6', color: v!==null?scoreColor(v):'#9ca3af' }}>
                      {t.num}
                    </span>
                    <span className="text-[11px] text-forest-600 truncate flex-1">{t.title}</span>
                    <span className="text-[11px] font-bold shrink-0" style={{ color: v!==null?scoreColor(v):'#9ca3af', fontFamily:'var(--font-mono)' }}>
                      {v!==null?v.toFixed(1):'—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Core ── */}
      {activeTab==='core' && (
        <div>
          <div className="flex justify-end mb-3">
            <ExportMenu options={coreExports} label="Export Core" mini/>
          </div>
          {DIMENSIONS.map((dim, sIdx) => {
            const rows = data.coreRows.filter(r => r.section === dim)
            if (!rows.length) return null
            return (
              <div key={dim} className="mb-5">
                <div className="flex items-center gap-2 text-[10.5px] font-bold tracking-[1px] uppercase px-3 py-2 rounded-lg mb-2"
                  style={{ color:'#2d6a4f', background:'#d8f3dc', borderLeft:'3px solid #52b788' }}>
                  <ClipboardList size={12}/> {dim}
                </div>
                <div className="rounded-xl overflow-hidden border border-sand-300">
                  <table className="rt w-full">
                    <thead><tr><th style={{width:'30%'}}>Indicator</th><th>Score</th><th>Evidence</th><th>Gap</th><th>Type</th><th>Priority</th><th>Support</th></tr></thead>
                    <tbody>
                      {rows.map((r,i) => (
                        <tr key={i} style={r.score===-1?{opacity:0.55}:{}}>
                          <td className="text-[12px]">{r.question}</td>
                          <td><ScoreCell v={r.score}/></td>
                          <td className="text-[11.5px] text-forest-400">{r.evidence||'—'}</td>
                          <td className="text-[11.5px] text-forest-400">{r.gap||'—'}</td>
                          <td>
                            <span className="chip" style={{background:'#d8f3dc',color:'#1b4332',fontSize:10}}>
                              {r.capacityType||'—'}
                            </span>
                          </td>
                          <td>{PC[r.priority!]?<span className="chip" style={PC[r.priority!]}>{r.priority}</span>:<span className="text-forest-300 text-[11px]">—</span>}</td>
                          <td className="text-[11.5px] text-forest-400">{r.suggestedSupport||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Targets ── */}
      {activeTab==='targets' && (
        <div>
          <div className="flex justify-end mb-3">
            <ExportMenu options={targetExports} label="Export Targets" mini/>
          </div>
          {KMGBF_TARGETS.map(t => {
            const rows = data.targetRows.filter(r => r.target_num === t.num)
            if (!rows.length) return null
            const avg = data.targetScores[t.num]
            return (
              <div key={t.num} className="mb-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-1 text-[10.5px] font-bold tracking-[1px] uppercase px-3 py-2 rounded-lg"
                    style={{ color:'#2d6a4f', background:'#d8f3dc', borderLeft:'3px solid #52b788' }}>
                    <Target size={12}/> T{t.num}: {t.title}
                  </div>
                  <ScoreCell v={avg}/>
                </div>
                <div className="rounded-xl overflow-hidden border border-sand-300">
                  <table className="rt w-full">
                    <thead><tr><th style={{width:'35%'}}>Indicator</th><th>Score</th><th>Evidence</th><th>Gap Identified</th><th>Capacity Need</th></tr></thead>
                    <tbody>
                      {rows.map((r,i) => (
                        <tr key={i} style={r.score===-1?{opacity:0.55}:{}}>
                          <td className="text-[12px]">{r.indicator}</td>
                          <td><ScoreCell v={r.score}/></td>
                          <td className="text-[11.5px] text-forest-400">{r.evidence||'—'}</td>
                          <td className="text-[11.5px] text-forest-400">{r.gapIdentified||'—'}</td>
                          <td className="text-[11.5px] text-forest-400">{r.capacityNeed||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
          {!data.targetRows.length && (
            <div className="card text-center py-10 text-forest-400">No target data submitted yet.</div>
          )}
        </div>
      )}

      {/* ── CDP ── */}
      {activeTab==='cdp' && (
        data.cdpRows.filter(r=>r.capacity_gap||r.action).length > 0
          ? <div>
              <div className="flex justify-end mb-3">
                <ExportMenu options={cdpExports} label="Export CDP" mini/>
              </div>
              <div className="rounded-xl overflow-hidden border border-sand-300">
                <table className="rt w-full">
                  <thead><tr><th>Capacity Gap</th><th>Action</th><th>Responsible</th><th>Timeline</th><th>Budget</th><th>Indicator</th><th>Collaboration</th></tr></thead>
                  <tbody>
                    {data.cdpRows.filter(r=>r.capacity_gap||r.action).map((r,i) => (
                      <tr key={i}>
                        <td>{r.capacity_gap||'—'}</td><td>{r.action||'—'}</td><td>{r.institution||'—'}</td>
                        <td>{r.timeline?<span className="chip" style={{background:'#d8f3dc',color:'#1b4332'}}>{r.timeline}</span>:'—'}</td>
                        <td>{r.budget||'—'}</td><td>{r.indicator||'—'}</td><td>{r.collaboration||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          : <div className="card text-center py-10 text-forest-400">No development plan actions submitted yet.</div>
      )}
    </div>
  )
}
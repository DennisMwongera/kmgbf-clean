'use client'
import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { DIMENSIONS, KMGBF_TARGETS } from '@/lib/constants'
import { getT } from '@/lib/i18n'
import { getDimScores, getOverall, getTargetAvg, groupedQuestions, interpret, scoreColor, gapBadge, chipStyle } from '@/lib/utils'
import { PageHeader, ScoreChip, GapBadge, EmptyState, Tabs } from '@/components/ui'
import { Chart, BarController, CategoryScale, LinearScale, BarElement, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'

Chart.register(BarController, CategoryScale, LinearScale, BarElement, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

function HBarChart({ scores }: { scores: Record<string, number | null> }) {
  const ref = useRef<HTMLCanvasElement>(null); const ch = useRef<Chart|null>(null)
  useEffect(() => {
    if (!ref.current) return; ch.current?.destroy()
    ch.current = new Chart(ref.current, {
      type:'bar',
      data:{ labels:DIMENSIONS.map(d=>d.length>22?d.slice(0,20)+'…':d), datasets:[{ data:DIMENSIONS.map(d=>scores[d]??0), backgroundColor:DIMENSIONS.map(d=>scoreColor(scores[d])), borderRadius:5 }] },
      options:{ indexAxis:'y', scales:{x:{min:0,max:5,ticks:{stepSize:1}},y:{ticks:{font:{size:10,family:'Syne'}}}}, plugins:{legend:{display:false}}, animation:{duration:700} },
    })
    return () => ch.current?.destroy()
  }, [scores])
  return <canvas ref={ref}/>
}

function TargetBar({ assessment }: { assessment: any }) {
  const ref = useRef<HTMLCanvasElement>(null); const ch = useRef<Chart|null>(null)
  useEffect(() => {
    if (!ref.current) return; ch.current?.destroy()
    const data = KMGBF_TARGETS.map(t => getTargetAvg(assessment,t.num,t.indicators)??0)
    ch.current = new Chart(ref.current, {
      type:'bar',
      data:{ labels:KMGBF_TARGETS.map(t=>`T${t.num}`), datasets:[{ data, backgroundColor:data.map(v=>scoreColor(v>0?v:null)), borderRadius:3 }] },
      options:{ scales:{y:{min:0,max:5,ticks:{stepSize:1}},x:{ticks:{font:{size:9}}}}, plugins:{legend:{display:false},tooltip:{callbacks:{title:ctx=>KMGBF_TARGETS[ctx[0].dataIndex].title,label:ctx=>` ${ctx.parsed.y.toFixed(1)}/5`}}}, animation:{duration:700} },
    })
    return () => ch.current?.destroy()
  }, [assessment])
  return <canvas ref={ref}/>
}

function ReportRadarChart({ assessment }: { assessment: any }) {
  const lang       = useStore(s => s.lang)
  const t          = getT(lang ?? 'en')
  const ref        = useRef<HTMLCanvasElement>(null)
  const chart      = useRef<Chart | null>(null)
  const dimScores  = getDimScores(assessment)
  const labels     = t.dimensions
  const data       = Object.values(dimScores).map(v => v ?? 0)

  useEffect(() => {
    if (!ref.current) return
    chart.current?.destroy()
    chart.current = new Chart(ref.current, {
      type: 'radar',
      data: {
        labels: labels.map(d => {
          const words = d.split(' ')
          if (words.length <= 2) return d
          const mid = Math.ceil(words.length / 2)
          return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
        }),
        datasets: [{
          data,
          backgroundColor:      'rgba(64,145,108,.15)',
          borderColor:          '#2d6a4f',
          borderWidth:          2,
          pointBackgroundColor: '#52b788',
          pointRadius:          4,
          pointHoverRadius:     6,
        }],
      },
      options: {
        layout: { padding: 28 },
        scales: {
          r: {
            min: 0, max: 5,
            ticks: { stepSize:1, font:{size:9}, backdropColor:'transparent', color:'#9ca3af' },
            grid:        { color:'rgba(0,0,0,.06)' },
            angleLines:  { color:'rgba(0,0,0,.08)' },
            pointLabels: {
              font: { size:11, family:'Syne', weight:'500' },
              color: '#1b4332',
              padding: 8,
            },
          },
        },
        plugins: { legend:{ display:false }, tooltip:{ callbacks:{ label:(ctx) => ` ${ctx.parsed.r.toFixed(1)} / 5` } } },
        animation: { duration:600 },
      },
    })
    return () => chart.current?.destroy()
  }, [assessment, labels])

  return <div style={{ height:380, position:'relative' }}><canvas ref={ref} style={{ maxHeight:380 }}/></div>
}


const TABS = [{id:'summary',label:'📋 Summary'},{id:'charts',label:'📊 Charts'},{id:'core',label:'🔍 Core Scores'},{id:'targets',label:'🎯 Targets'},{id:'cdp',label:'📄 Dev. Plan'}]

export default function ReportPage() {
  const { assessment, activeTab, setActiveTab } = useStore()
  const dimScores = getDimScores(assessment)
  const overall   = getOverall(assessment)
  const p         = assessment.profile
  const grouped   = groupedQuestions()
  const PC: Record<string,any> = { Low:{bg:'#dcfce7',color:'#15803d'}, Med:{bg:'#fef3c7',color:'#d97706'}, High:{bg:'#fee2e2',color:'#dc2626'} }

  return (
    <div className="fade-in">
      <PageHeader title="Reports & Analytics" desc="Interactive charts, full data tables and multi-format exports."/>
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab}/>

      {/* ── Summary ── */}
      {activeTab==='summary' && (
        <div>
          <div className="card mb-5">
            <div className="flex justify-between items-start mb-5 flex-wrap gap-4">
              <div>
                <h3 style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:700,color:'#0f2d1c',marginBottom:4}}>KMGBF Capacity Assessment Summary</h3>
                <p className="text-[13px] text-forest-400">{p.name||'—'} · {p.level||'—'} · {p.assessDate||'—'}</p>
              </div>
              <button className="btn btn-ghost" onClick={()=>window.print()}>🖨️ Print</button>
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
                <div className="mt-3 text-[11px] text-forest-400">{assessment.coreRows.filter(r=>r.score!==null).length}/50 indicators scored</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-title">📊 Dimension Scores</div>
            <div className="rounded-xl overflow-hidden border border-sand-300">
              <table className="rt w-full">
                <thead><tr><th>Dimension</th><th>Score</th><th>Required</th><th>Gap</th><th>Priority</th><th>Interpretation</th></tr></thead>
                <tbody>
                  {DIMENSIONS.map(d=>{
                    const s=dimScores[d]; const req=assessment.required[d]; const gap=s!==null?s-req:null; const gb=gapBadge(gap)
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
          <div className="card"><div className="card-title">📊 Dimension Bar Chart</div><div style={{height:300}}><HBarChart scores={dimScores}/></div></div>
          <div className="card"><div className="card-title">🕸️ Capacity Radar</div>
            <ReportRadarChart assessment={assessment}/>
          </div>
          <div className="card" style={{gridColumn:'span 2'}}><div className="card-title">🎯 All 23 KMGBF Target Scores</div><div style={{height:240}}><TargetBar assessment={assessment}/></div></div>
        </div>
      )}

      {/* ── Core Scores ── */}
      {activeTab==='core' && Object.entries(grouped).map(([section, qs]) => (
        <div key={section} className="mb-5">
          <div className="text-[10.5px] font-bold tracking-[1px] uppercase px-3 py-2 rounded-lg mb-2" style={{color:'#2d6a4f',background:'#d8f3dc',borderLeft:'3px solid #52b788'}}>{section}</div>
          <div className="rounded-xl overflow-hidden border border-sand-300">
            <table className="rt w-full">
              <thead><tr><th style={{width:'28%'}}>Indicator</th><th>Score</th><th>Evidence</th><th>Gap</th><th>Type</th><th>Priority</th><th>Suggested Support</th></tr></thead>
              <tbody>
                {qs.map(({q,idx})=>{
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

      {/* ── Targets ── */}
      {activeTab==='targets' && (
        KMGBF_TARGETS.filter(t=>t.indicators.some((_,i)=>assessment.targetRows[`t${t.num}_${i}`]?.score!=null)).length > 0
          ? KMGBF_TARGETS.map(t => {
              const avg=getTargetAvg(assessment,t.num,t.indicators)
              if (!t.indicators.some((_,i)=>assessment.targetRows[`t${t.num}_${i}`]?.score!=null)) return null
              return (<div key={t.num} className="mb-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 text-[10.5px] font-bold tracking-[1px] uppercase px-3 py-2 rounded-lg" style={{color:'#2d6a4f',background:'#d8f3dc',borderLeft:'3px solid #52b788'}}>T{t.num}: {t.title}</div>
                  <ScoreChip value={avg}/>
                </div>
                <div className="rounded-xl overflow-hidden border border-sand-300">
                  <table className="rt w-full">
                    <thead><tr><th>Indicator</th><th>Score</th><th>Evidence</th><th>Gap</th><th>Capacity Need</th></tr></thead>
                    <tbody>{t.indicators.map((ind,i)=>{const r=assessment.targetRows[`t${t.num}_${i}`];return(<tr key={i}><td className="text-[12.5px]">{ind}</td><td><ScoreChip value={r?.score??null}/></td><td className="text-[11.5px] text-forest-400">{r?.evidence||'—'}</td><td className="text-[11.5px] text-forest-400">{r?.gapIdentified||'—'}</td><td className="text-[11.5px] text-forest-400">{r?.capacityNeed||'—'}</td></tr>)})}</tbody>
                  </table>
                </div>
              </div>)
            })
          : <div className="card"><EmptyState emoji="🎯" msg="No targets scored yet."/></div>
      )}

      {/* ── CDP ── */}
      {activeTab==='cdp' && (
        assessment.cdpRows.filter(r=>r.capacityGap||r.action).length > 0
          ? <div className="rounded-xl overflow-hidden border border-sand-300">
              <table className="rt w-full">
                <thead><tr><th>Capacity Gap</th><th>Action</th><th>Responsible</th><th>Timeline</th><th>Budget</th><th>Indicator</th><th>Collaboration</th></tr></thead>
                <tbody>{assessment.cdpRows.filter(r=>r.capacityGap||r.action).map((r,i)=>(
                  <tr key={i}><td>{r.capacityGap||'—'}</td><td>{r.action||'—'}</td><td>{r.institution||'—'}</td>
                    <td>{r.timeline?<span className="chip" style={{background:'#d8f3dc',color:'#1b4332'}}>{r.timeline}</span>:'—'}</td>
                    <td>{r.budget||'—'}</td><td>{r.indicator||'—'}</td><td>{r.collaboration||'—'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          : <div className="card"><EmptyState emoji="📋" msg="No development plan actions defined."/></div>
      )}
    </div>
  )
}
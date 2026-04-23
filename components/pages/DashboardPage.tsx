'use client'
import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { DIMENSIONS, KMGBF_TARGETS } from '@/lib/constants'
import { getDimScores, getOverall, getTargetAvg, scoreColor, interpret } from '@/lib/utils'
import { getT } from '@/lib/i18n'
import { StatCard, ScoreBar, ScoreChip } from '@/components/ui'
import { BarChart2, Radar, Target, AlertTriangle, CheckCircle2, TrendingUp, Activity } from 'lucide-react'
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js'

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

function RadarChart({ scores, labels }: { scores: Record<string, number | null>; labels: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null); const chart = useRef<Chart | null>(null)
  useEffect(() => {
    if (!ref.current) return; chart.current?.destroy()
    chart.current = new Chart(ref.current, {
      type: 'radar',
      data: {
        labels: labels.map(d => {
          // Wrap long labels into two lines for readability
          const words = d.split(' ')
          if (words.length <= 2) return d
          const mid = Math.ceil(words.length / 2)
          return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
        }),
        datasets: [{
          data: Object.values(scores).map(v => v ?? 0),
          backgroundColor: 'rgba(64,145,108,.15)',
          borderColor:     '#2d6a4f',
          borderWidth:     2,
          pointBackgroundColor: '#52b788',
          pointRadius:     4,
          pointHoverRadius:6,
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
  }, [scores, labels])
  // Increased height from 240 to 380 so labels have room
  return <div style={{ height:380, position:'relative' }}><canvas ref={ref} style={{ maxHeight:380 }}/></div>
}

export default function DashboardPage() {
  const assessment = useStore(s => s.assessment)
  const navigate   = useStore(s => s.navigate)
  const lang       = useStore(s => s.lang)
  const t          = getT(lang ?? 'en')
  const d          = t.dashboard

  const dimScores = getDimScores(assessment)
  const overall   = getOverall(assessment)
  const answered  = assessment.coreRows.filter(r => r.score !== null).length
  const gapCount  = DIMENSIONS.filter(d => { const s=dimScores[d]; return s!==null && s<assessment.required[d] }).length
  const tCount    = KMGBF_TARGETS.filter(tg => tg.indicators.some((_,i) => assessment.targetRows[`t${tg.num}_${i}`]?.score != null)).length

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c', lineHeight:1.1 }}>{d.title}</h2>
        <p className="text-[13.5px] text-forest-400 mt-1.5">{d.desc}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard label={d.overallScore}    value={overall!==null?overall.toFixed(2):'—'} sub={interpret(overall, t)} accent="green" valueColor={scoreColor(overall)}/>
        <StatCard label={d.coreIndicators}  value={`${answered}/50`}          sub={d.answered}        accent="amber"/>
        <StatCard label={d.capacityGaps}    value={gapCount}                   sub={d.belowThreshold}  accent="coral"/>
        <StatCard label={d.targetsAssessed} value={`${tCount}/23`}             sub={d.kmgbfTargets}    accent="blue"/>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="card">
          <div className="card-title">{d.byDimension}</div>
          {DIMENSIONS.map((dim, i) => <ScoreBar key={dim} label={t.dimensions[i] || dim} value={dimScores[dim]}/>)}
        </div>
        <div className="card">
          <div className="card-title">{d.radar}</div>
          <RadarChart scores={dimScores} labels={t.dimensions}/>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="card">
          <div className="card-title">{d.targetReadiness}</div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {t.targets.targets.map(tg => <ScoreBar key={tg.num} label={`T${tg.num}: ${tg.title}`} value={getTargetAvg(assessment, tg.num, tg.indicators)}/>)}
          </div>
        </div>
        <div className="card">
          <div className="card-title">{d.gapSummary}</div>
          {DIMENSIONS.some(dim => dimScores[dim] !== null) ? (
            <div className="rounded-xl overflow-hidden border border-sand-300">
              <table className="rt w-full">
                <thead><tr><th>{d.dimension}</th><th>{t.common.score}</th><th>{d.required}</th><th>{d.status}</th></tr></thead>
                <tbody>
                  {DIMENSIONS.map((dim, i) => {
                    const s=dimScores[dim]; const req=assessment.required[dim]; const gap=s!==null?s-req:null
                    return (
                      <tr key={dim}>
                        <td className="text-[12px] font-medium">{t.dimensions[i] || dim}</td>
                        <td><ScoreChip value={s}/></td>
                        <td className="text-[11px] text-forest-400">{req}</td>
                        <td>{gap===null?'—':gap>=0
                          ?<span style={{background:'#dcfce7',color:'#15803d',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:700}}>✓</span>
                          :<span style={{background:'#fee2e2',color:'#dc2626',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:700}}>−{Math.abs(gap).toFixed(1)}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="text-center py-8 text-forest-400 text-[13px]">{d.completeFirst}</div>}
        </div>
      </div>
    </div>
  )
}
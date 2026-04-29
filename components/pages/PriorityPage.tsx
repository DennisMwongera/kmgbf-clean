'use client'
import { useStore } from '@/lib/store'
import { gapItems, getDimScores } from '@/lib/utils'
import { getT } from '@/lib/i18n'
import { SectionActions } from '@/components/ui'
import ExportMenu from '@/components/ExportMenu'
import { downloadCSV, downloadXLSX } from '@/lib/exportUtils'

function PCircle({ score }: { score: number }) {
  const s = score>=10?{bg:'#fee2e2',c:'#dc2626'}:score>=5?{bg:'#fef3c7',c:'#d97706'}:{bg:'#dcfce7',c:'#15803d'}
  return <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold"
    style={{background:s.bg,color:s.c,fontFamily:'var(--font-mono)'}}>{score.toFixed(1)}</div>
}

export default function PriorityPage() {
  const assessment       = useStore(s => s.assessment)
  const updatePriorityRow = useStore(s => s.updatePriorityRow)
  const navigate         = useStore(s => s.navigate)
  const lang             = useStore(s => s.lang)
  const t                = getT(lang ?? 'en')

  const items = gapItems(assessment)
  const dimScores = getDimScores(assessment)

  const rows = items.map((item, i) => {
    const r        = assessment.priorityRows[i] ?? { capacityGap:item.label, urgency:3, impact:3, feasibility:3 }
    const dimScore = dimScores[item.dim] ?? null
    const required = assessment.required[item.dim] ?? 3
    const gap      = dimScore !== null ? required - dimScore : 0   // bigger = worse
    const pScore   = (r.urgency * r.impact * r.feasibility) / 5
    return { ...item, ...r, score: pScore, dimScore, gap }
  }).sort((a, b) => {
    // 1st: highest gap (most behind on required score)
    if (b.gap !== a.gap) return b.gap - a.gap
    // 2nd: lowest dimension score (weakest capacity first)
    const aS = a.dimScore ?? 5
    const bS = b.dimScore ?? 5
    if (aS !== bS) return aS - bS
    // 3rd: highest priority score as tiebreaker
    return b.score - a.score
  })

  const Num = ({ i, field, val }: { i:number; field:'urgency'|'impact'|'feasibility'; val:number }) => (
    <input className="ti-score" style={{width:52}} type="number" min={1} max={5} step={1} value={val}
      onChange={e => updatePriorityRow(i, field, parseInt(e.target.value,10)||1)}/>
  )

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c', lineHeight:1.1 }}>{t.priority.title}</h2>
        <p className="text-[13.5px] text-forest-400 mt-1.5">{t.priority.desc}</p>
      </div>
      {rows.length > 0 ? (
        <>
          <div className="flex justify-end mb-3">
            <ExportMenu mini label="Export Prioritization" options={[
              { label:'CSV',  icon:'📋', action: () => {
                const date = new Date().toISOString().slice(0,10)
                const name = (assessment.profile.name||'Assessment').replace(/[^a-zA-Z0-9]/g,'_').slice(0,30)
                downloadCSV([
                  ['Rank','Capacity Gap','Dimension','Score','Gap','Urgency','Impact','Feasibility','Priority Score','Level'],
                  ...rows.map((r,rank) => [
                    rank+1, r.label, r.dim,
                    r.dimScore?.toFixed(1)??'', r.gap>0?`-${r.gap.toFixed(1)}`:'Met',
                    r.urgency, r.impact, r.feasibility,
                    r.score.toFixed(1),
                    r.score>=10?'High':r.score>=5?'Medium':'Low'
                  ])
                ], `${name}_Prioritization_${date}`)
              }},
              { label:'XLSX', icon:'📊', action: () => {
                const date = new Date().toISOString().slice(0,10)
                const name = (assessment.profile.name||'Assessment').replace(/[^a-zA-Z0-9]/g,'_').slice(0,30)
                downloadXLSX([{ name:'Prioritization', rows:[
                  ['Rank','Capacity Gap','Dimension','Score','Gap','Urgency','Impact','Feasibility','Priority Score','Level'],
                  ...rows.map((r,rank) => [
                    rank+1, r.label, r.dim,
                    r.dimScore?.toFixed(1)??'', r.gap>0?`-${r.gap.toFixed(1)}`:'Met',
                    r.urgency, r.impact, r.feasibility,
                    r.score.toFixed(1),
                    r.score>=10?'High':r.score>=5?'Medium':'Low'
                  ])
                ]}], `${name}_Prioritization_${date}`)
              }},
            ]}/>
          </div>
          <div className="rounded-2xl overflow-hidden border border-sand-300">
            <table className="dt w-full">
              <thead>
                <tr>
                  <th style={{width:'26%'}}>{t.priority.capacityGap}</th>
                  <th>{t.priority.dimension}</th>
                  <th style={{width:'7%'}}>Score</th>
                  <th style={{width:'7%'}}>Gap</th>
                  <th>{t.priority.urgency}</th>
                  <th>{t.priority.impact}</th>
                  <th>{t.priority.feasibility}</th>
                  <th>{t.priority.pScore}</th>
                  <th>{t.priority.rank}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rank) => {
                  const origIdx = items.findIndex(x => x.label === row.label)
                  return (
                    <tr key={row.label}>
                      <td className="font-semibold text-[12.5px]">{row.label}</td>
                      <td><span className="chip" style={{background:'#d8f3dc',color:'#2d6a4f',fontSize:10}}>{row.dim.length>20?row.dim.slice(0,18)+'…':row.dim}</span></td>
                      <td>
                        <span className="text-[12px] font-bold" style={{fontFamily:'var(--font-mono)',color:row.dimScore!==null?row.dimScore<2?'#dc2626':row.dimScore<3?'#ca8a04':'#15803d':'#9ca3af'}}>
                          {row.dimScore?.toFixed(1)??'—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-[12px] font-bold" style={{fontFamily:'var(--font-mono)',color:row.gap>0?'#dc2626':'#15803d'}}>
                          {row.gap>0?`-${row.gap.toFixed(1)}`:'✓'}
                        </span>
                      </td>
                      <td><Num i={origIdx} field="urgency"     val={row.urgency}/></td>
                      <td><Num i={origIdx} field="impact"      val={row.impact}/></td>
                      <td><Num i={origIdx} field="feasibility" val={row.feasibility}/></td>
                      <td><PCircle score={row.score}/></td>
                      <td className="font-semibold text-forest-400" style={{fontFamily:'var(--font-mono)',fontSize:13}}>#{rank+1}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11.5px] text-forest-400 mt-2">{t.priority.formula}</p>
        </>
      ) : (
        <div className="card text-center py-10">
          <div className="text-3xl mb-2">⚡</div>
          <div className="text-[13px] text-forest-400">{t.priority.noGaps}</div>
        </div>
      )}
      <SectionActions>
        <button className="btn btn-secondary" onClick={() => navigate('gaps')}>{t.common.back}</button>
        <button className="btn btn-primary"   onClick={() => navigate('cdp')}>{t.common.saveAndContinue}</button>
      </SectionActions>
    </div>
  )
}
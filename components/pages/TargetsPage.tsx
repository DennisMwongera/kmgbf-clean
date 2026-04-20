'use client'
import { useState, useCallback, memo } from 'react'
import { useStore } from '@/lib/store'
import { type TargetRow } from '@/lib/constants'
import { getTargetAvg, scoreColor } from '@/lib/utils'
import { getT } from '@/lib/i18n'
import { ScoreChip, SectionActions } from '@/components/ui'

const TargetRowInputs = memo(function TargetRowInputs({ rowKey, initialRow, onUpdate, t }: {
  rowKey: string; initialRow: TargetRow; t: ReturnType<typeof getT>
  onUpdate: (key: string, field: string, val: string | number | null) => void
}) {
  const [score, setScore] = useState(initialRow.score !== null && !isNaN(initialRow.score as number) ? String(initialRow.score) : '')
  const [evid,  setEvid]  = useState(initialRow.evidence)
  const [gap,   setGap]   = useState(initialRow.gapIdentified)
  const [need,  setNeed]  = useState(initialRow.capacityNeed)

  function flushScore(val: string) {
    if (val === '') { onUpdate(rowKey, 'score', null); return }
    const n = parseInt(val, 10)
    if (!isNaN(n)) onUpdate(rowKey, 'score', Math.min(5, Math.max(0, n)))
  }

  const sc = initialRow.score
  return (
    <>
      <td>
        <input className="ti-score" type="number" min={0} max={5} step={1}
          value={score} onChange={e => setScore(e.target.value)} onBlur={e => flushScore(e.target.value)}
          placeholder="0–5" style={sc !== null ? { borderColor:scoreColor(sc), color:scoreColor(sc) } : {}}/>
      </td>
      <td><textarea className="ti" rows={2} style={{resize:'none'}} value={evid} onChange={e => setEvid(e.target.value)} onBlur={e => onUpdate(rowKey,'evidence',e.target.value)} placeholder={t.common.evidence}/></td>
      <td><textarea className="ti" rows={2} style={{resize:'none'}} value={gap}  onChange={e => setGap(e.target.value)}  onBlur={e => onUpdate(rowKey,'gapIdentified',e.target.value)} placeholder={t.common.gap}/></td>
      <td><textarea className="ti" rows={2} style={{resize:'none'}} value={need} onChange={e => setNeed(e.target.value)} onBlur={e => onUpdate(rowKey,'capacityNeed',e.target.value)} placeholder="Need…"/></td>
    </>
  )
})

export default function TargetsPage() {
  const targetRows      = useStore(s => s.assessment.targetRows)
  const activeTarget    = useStore(s => s.activeTarget)
  const setActiveTarget = useStore(s => s.setActiveTarget)
  const updateTargetRow = useStore(s => s.updateTargetRow)
  const navigate        = useStore(s => s.navigate)
  const assessment      = useStore(s => s.assessment)
  const lang            = useStore(s => s.lang)
  const t               = getT(lang ?? 'en')
  const targets         = t.targets.targets

  const tData = targets.find(x => x.num === activeTarget)!
  const handleUpdate = useCallback((key: string, field: string, val: string | number | null) => {
    updateTargetRow(key, field, val)
  }, [updateTargetRow])

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c', lineHeight:1.1 }}>{t.targets.title}</h2>
        <p className="text-[13.5px] text-forest-400 mt-1.5">{t.targets.desc}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {targets.map(target => {
          const avg    = getTargetAvg(assessment, target.num, target.indicators)
          const active = activeTarget === target.num
          return (
            <button key={target.num} onClick={() => setActiveTarget(target.num)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all"
              style={{ background:active?'#1b4332':'white', borderColor:active?'#1b4332':'#e8e3da', color:active?'white':'#131f18', boxShadow:active?'0 4px 16px rgba(15,45,28,.2)':'none' }}>
              <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background:active?'rgba(255,255,255,.15)':'#d8f3dc', color:active?'white':'#1b4332' }}>
                {target.num}
              </span>
              <span className="text-[12px] font-medium leading-tight flex-1">{target.title}</span>
              {avg !== null && <span className="text-[11px] font-bold" style={{ color:active?'white':scoreColor(avg) }}>{avg.toFixed(1)}</span>}
            </button>
          )
        })}
      </div>

      <div className="card">
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-forest-100">
          <div>
            <div className="card-title mb-1">🎯 {t.common.of ? '' : ''}Target {tData.num}: {tData.title}</div>
            <p className="text-[12.5px] text-forest-400 leading-relaxed">{tData.desc}</p>
          </div>
          <ScoreChip value={getTargetAvg(assessment, tData.num, tData.indicators)}/>
        </div>
        <div className="rounded-xl overflow-hidden border border-sand-300">
          <table className="dt w-full">
            <thead>
              <tr>
                <th style={{width:'32%'}}>{t.common.indicator}</th>
                <th style={{width:'9%'}}>{t.common.score}</th>
                <th style={{width:'20%'}}>{t.common.evidence}</th>
                <th style={{width:'18%'}}>{t.common.gap}</th>
                <th style={{width:'21%'}}>{t.common.suggestedSupport}</th>
              </tr>
            </thead>
            <tbody>
              {tData.indicators.map((ind, i) => {
                const key     = `t${tData.num}_${i}`
                const initRow = targetRows[key] ?? { score:null, evidence:'', gapIdentified:'', capacityNeed:'' }
                return (
                  <tr key={key}>
                    <td className="text-[12.5px] leading-snug align-top pt-2.5">{ind}</td>
                    <TargetRowInputs rowKey={key} initialRow={initRow} onUpdate={handleUpdate} t={t}/>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-forest-50">
          <button className="btn btn-ghost btn-sm" disabled={tData.num<=1}  onClick={() => setActiveTarget(tData.num-1)}>← T{tData.num-1}</button>
          <span className="text-[11px] text-forest-400">Target {tData.num} {t.common.of} 23</span>
          <button className="btn btn-ghost btn-sm" disabled={tData.num>=23} onClick={() => setActiveTarget(tData.num+1)}>T{tData.num+1} →</button>
        </div>
      </div>
      <SectionActions>
        <button className="btn btn-secondary" onClick={() => navigate('core')}>{t.common.back}</button>
        <button className="btn btn-primary"   onClick={() => navigate('gaps')}>{t.common.saveAndContinue}</button>
      </SectionActions>
    </div>
  )
}
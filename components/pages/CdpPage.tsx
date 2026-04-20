'use client'
import { useState, useCallback, memo } from 'react'
import { useStore } from '@/lib/store'
import { type CdpRow } from '@/lib/constants'
import { getT } from '@/lib/i18n'
import { SectionActions } from '@/components/ui'

const CdpRowInputs = memo(function CdpRowInputs({ idx, initialRow, onUpdate, onRemove, t }: {
  idx: number; initialRow: CdpRow
  onUpdate: (idx: number, field: string, val: string) => void
  onRemove: (idx: number) => void
  t: ReturnType<typeof getT>
}) {
  const COLS = [
    { k:'capacityGap',   ph:t.common.gap,           sel:false },
    { k:'action',        ph:t.common.action,         sel:false },
    { k:'institution',   ph:t.common.institution,    sel:false },
    { k:'timeline',      ph:'',                      sel:true  },
    { k:'budget',        ph:t.common.budget,         sel:false },
    { k:'indicator',     ph:t.common.indicator,      sel:false },
    { k:'collaboration', ph:t.common.collaboration,  sel:false },
  ]
  const GRID = '2fr 2fr 1.5fr 1fr 1fr 1.5fr 2fr 32px'

  const [vals, setVals] = useState<Record<string, string>>({
    capacityGap: initialRow.capacityGap, action: initialRow.action,
    institution: initialRow.institution, timeline: initialRow.timeline,
    budget: initialRow.budget, indicator: initialRow.indicator, collaboration: initialRow.collaboration,
  })

  return (
    <div className="grid gap-2 items-start p-3.5 mb-2 bg-white rounded-xl border border-sand-300 hover:shadow-sm transition-shadow"
      style={{ gridTemplateColumns: GRID }}>
      {COLS.map(c => (
        <div key={c.k}>
          {c.sel ? (
            <select className="ti w-full" style={{appearance:'none',cursor:'pointer'}} value={vals[c.k]}
              onChange={e => { const v=e.target.value; setVals(p=>({...p,[c.k]:v})); onUpdate(idx,c.k,v) }}>
              {t.cdp.timelines.map(tl => <option key={tl} value={tl}>{tl||t.common.selectDots}</option>)}
            </select>
          ) : (
            <textarea className="ti w-full" rows={2} style={{resize:'none'}} value={vals[c.k]}
              onChange={e => { const v=e.target.value; setVals(p=>({...p,[c.k]:v})) }}
              onBlur={e => onUpdate(idx, c.k, e.target.value)} placeholder={c.ph}/>
          )}
        </div>
      ))}
      <button className="btn btn-danger btn-sm px-2 py-1 self-start mt-1" onClick={() => onRemove(idx)}>{t.common.remove}</button>
    </div>
  )
})

export default function CdpPage() {
  const cdpRows      = useStore(s => s.assessment.cdpRows)
  const addCdpRow    = useStore(s => s.addCdpRow)
  const removeCdpRow = useStore(s => s.removeCdpRow)
  const updateCdpRow = useStore(s => s.updateCdpRow)
  const navigate     = useStore(s => s.navigate)
  const lang         = useStore(s => s.lang)
  const t            = getT(lang ?? 'en')

  const HEADER_COLS = [t.common.gap, t.common.action, t.common.institution, t.common.timeline, t.common.budget, t.common.indicator, t.common.collaboration]
  const GRID = '2fr 2fr 1.5fr 1fr 1fr 1.5fr 2fr 32px'

  const handleUpdate = useCallback((idx: number, field: string, val: string) => updateCdpRow(idx, field, val), [updateCdpRow])
  const handleRemove = useCallback((idx: number) => removeCdpRow(idx), [removeCdpRow])

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c', lineHeight:1.1 }}>{t.cdp.title}</h2>
        <p className="text-[13.5px] text-forest-400 mt-1.5">{t.cdp.desc}</p>
      </div>
      <div className="grid gap-2 px-4 pb-2.5 border-b border-forest-100 mb-2" style={{gridTemplateColumns:GRID}}>
        {HEADER_COLS.map(h => <span key={h} className="text-[9.5px] font-bold tracking-[1.2px] uppercase text-forest-400">{h}</span>)}
        <span/>
      </div>
      {cdpRows.length === 0
        ? <div className="card my-2 text-center py-10"><div className="text-3xl mb-2">📋</div><div className="text-[13px] text-forest-400">{t.cdp.noActions}</div></div>
        : cdpRows.map((row, i) => <CdpRowInputs key={i} idx={i} initialRow={row} onUpdate={handleUpdate} onRemove={handleRemove} t={t}/>)
      }
      <div className="mt-3 flex gap-2">
        <button className="btn btn-ghost" onClick={addCdpRow}>{t.common.addAction}</button>
        {cdpRows.length > 0 && <span className="text-[11.5px] text-forest-400 self-center">{cdpRows.length} {cdpRows.length>1?t.cdp.actions:t.cdp.action_one}</span>}
      </div>
      <SectionActions>
        <button className="btn btn-secondary" onClick={() => navigate('priority')}>{t.common.back}</button>
        <button className="btn btn-primary"   onClick={() => navigate('report')}>{t.common.viewReport}</button>
      </SectionActions>
    </div>
  )
}
'use client'
import { useState, useCallback, useEffect, memo } from 'react'
import { useStore } from '@/lib/store'
import { type CdpRow } from '@/lib/constants'
import { DIMENSIONS } from '@/lib/constants'
import { getT } from '@/lib/i18n'
import { gapItems, targetGapItems, TIMELINE_CANONICAL, toCanonical, fromCanonical } from '@/lib/utils'
import { SectionActions } from '@/components/ui'
import { Plus, Trash2, ClipboardList, Target } from 'lucide-react'

// ─── Single action row ─────────────────────────────────────────
const ActionRow = memo(function ActionRow({ idx, initialRow, onUpdate, onRemove, t, readOnly }: {
  idx: number; initialRow: CdpRow
  onUpdate: (idx: number, field: string, val: string) => void
  onRemove: (idx: number) => void
  t: ReturnType<typeof getT>
  readOnly?: boolean
}) {
  const [vals, setVals] = useState({
    action: initialRow.action, institution: initialRow.institution,
    timeline: initialRow.timeline, budget: initialRow.budget,
    indicator: initialRow.indicator, collaboration: initialRow.collaboration,
  })

  useEffect(() => {
    setVals({
      action: initialRow.action, institution: initialRow.institution,
      timeline: initialRow.timeline, budget: initialRow.budget,
      indicator: initialRow.indicator, collaboration: initialRow.collaboration,
    })
  }, [initialRow.action, initialRow.institution, initialRow.timeline,
      initialRow.budget, initialRow.indicator, initialRow.collaboration])

  const ta = (k: keyof typeof vals, ph: string) => (
    <textarea className="ti w-full" rows={2} style={{ resize:'none' }}
      value={vals[k]}
      onChange={e => setVals(p => ({ ...p, [k]: e.target.value }))}
      onBlur={e  => onUpdate(idx, k, e.target.value)}
      placeholder={ph} disabled={readOnly}/>
  )

  return (
    <div className="rounded-xl bg-sand-50 border border-sand-300 mb-2 group relative overflow-hidden">
      {/* Column headers inside each action row */}
      <div className="grid gap-2.5 px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wide text-forest-400"
        style={{ gridTemplateColumns:'2.5fr 1.5fr 1fr 1fr 1.5fr 2fr 28px' }}>
        <span>{t.common.action}</span>
        <span>{t.common.institution}</span>
        <span>Timeline</span>
        <span>{t.common.budget}</span>
        <span>{t.common.indicator}</span>
        <span>{t.common.collaboration}</span>
        <span/>
      </div>
      <div className="grid gap-2.5 px-3 pb-3"
        style={{ gridTemplateColumns:'2.5fr 1.5fr 1fr 1fr 1.5fr 2fr 28px' }}>
      {ta('action',        t.common.action)}
      {ta('institution',   t.common.institution)}
      <select className="ti w-full" style={{ appearance:'none', cursor: readOnly ? 'default' : 'pointer' }}
          value={fromCanonical(TIMELINE_CANONICAL, t.cdp.timelines, vals.timeline)}
          disabled={readOnly}
          onChange={e => {
            const c = toCanonical(t.cdp.timelines, e.target.value, TIMELINE_CANONICAL)
            setVals(p => ({ ...p, timeline: c }))
            onUpdate(idx, 'timeline', c)
          }}>
          {t.cdp.timelines.map(tl => (
            <option key={tl} value={tl}>{tl || t.common.selectDots}</option>
          ))}
        </select>
      {ta('budget',        t.common.budget)}
      {ta('indicator',     t.common.indicator)}
      {ta('collaboration', t.common.collaboration)}
      {!readOnly && (
        <button onClick={() => onRemove(idx)} title="Remove action"
          className="self-start mt-5 w-6 h-6 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-red-50 transition-all"
          style={{ color:'#dc2626', flexShrink:0 }}>
          <Trash2 size={12}/>
        </button>
      )}
      </div>
    </div>
  )
})

// ─── Gap subsection ─────────────────────────────────────────────
function GapSubsection({ gap, cdpRows, allIndices, dim, onUpdate, onRemove, onAddAction, t, readOnly, accentColor }: {
  gap: string; dim?: string; accentColor: string
  cdpRows: CdpRow[]; allIndices: number[]
  onUpdate: (idx: number, field: string, val: string) => void
  onRemove: (idx: number) => void
  onAddAction: (gap: string, source: 'core' | 'target') => void
  t: ReturnType<typeof getT>
  readOnly?: boolean
}) {
  const source: 'core' | 'target' = cdpRows[0]?.source === 'target' ? 'target' : 'core'

  const paired: { row: CdpRow; globalIdx: number }[] = []
  cdpRows.forEach((r, localI) => {
    if (r.capacityGap === gap) paired.push({ row: r, globalIdx: allIndices[localI] })
  })

  return (
    <div className="mb-3 rounded-xl border border-sand-200 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2"
        style={{ background:`${accentColor}15`, borderBottom:`1px solid ${accentColor}30` }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor }}/>
          <span className="text-[12.5px] font-semibold text-forest-700">{gap}</span>
          <span className="text-[10px] text-forest-400">{paired.length} action{paired.length!==1?'s':''}</span>
        </div>
        {!readOnly && (
          <button className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
            style={{ background:`${accentColor}20`, color: accentColor }}
            onClick={() => onAddAction(gap, source)}>
            <Plus size={11}/> Add action
          </button>
        )}
      </div>
      <div className="px-3 pt-2 pb-3">
        {paired.length === 0 ? (
          <div className="text-center py-4 text-[11.5px] text-forest-300 rounded-lg border border-dashed border-sand-300">
            No actions yet.{!readOnly && ' Click "Add action" to plan one.'}
          </div>
        ) : (
          <>
            {paired.map(({ row, globalIdx }) => (
              <ActionRow key={globalIdx} idx={globalIdx} initialRow={row}
                onUpdate={onUpdate} onRemove={onRemove} t={t} readOnly={readOnly}/>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Dimension section ─────────────────────────────────────────
function DimSection({ dim, gapsInDim, cdpRows, allIndices, onUpdate, onRemove, onAddAction, t, readOnly, accentColor }: {
  dim: string; gapsInDim: string[]; accentColor: string
  cdpRows: CdpRow[]; allIndices: number[]
  onUpdate: (idx: number, field: string, val: string) => void
  onRemove: (idx: number) => void
  onAddAction: (gap: string, source: 'core' | 'target') => void
  t: ReturnType<typeof getT>
  readOnly?: boolean
}) {
  const shortDim   = dim.replace(' Capacity','').replace(' and ','/')
  const totalActions = cdpRows.filter(r => gapsInDim.includes(r.capacityGap)).length

  return (
    <div className="mb-4 rounded-2xl overflow-hidden border border-sand-300">
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: accentColor }}>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-bold text-white tracking-wide">{shortDim}</span>
          <span className="text-[10px] opacity-60 text-white">
            {gapsInDim.length} gap{gapsInDim.length!==1?'s':''} · {totalActions} action{totalActions!==1?'s':''}
          </span>
        </div>
      </div>
      <div className="p-4">
        {gapsInDim.map(gap => (
          <GapSubsection key={gap} gap={gap} dim={dim} accentColor={accentColor}
            cdpRows={cdpRows} allIndices={allIndices}
            onUpdate={onUpdate} onRemove={onRemove} onAddAction={onAddAction} t={t} readOnly={readOnly}/>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────
export default function CdpPage() {
  const assessment   = useStore(s => s.assessment)
  const cdpRows      = useStore(s => s.assessment.cdpRows)
  const addCdpRow    = useStore(s => s.addCdpRow)
  const removeCdpRow = useStore(s => s.removeCdpRow)
  const updateCdpRow = useStore(s => s.updateCdpRow)
  const navigate     = useStore(s => s.navigate)
  const lang         = useStore(s => s.lang)
  const isReadOnly   = useStore(s => s.isReadOnly())
  const t            = getT(lang ?? 'en')

  // ── Core capacity gaps (from scoring) ──────────────────────
  const coreGaps = gapItems(assessment)
  const coreDimGaps: Record<string, string[]> = {}
  coreGaps.forEach(g => {
    if (!coreDimGaps[g.dim]) coreDimGaps[g.dim] = []
    if (!coreDimGaps[g.dim].includes(g.label)) coreDimGaps[g.dim].push(g.label)
  })
  const coreActiveDims = DIMENSIONS.filter(d => coreDimGaps[d]?.length > 0)

  // ── Target gaps (from target assessment) ───────────────────
  const targetGaps = targetGapItems(assessment)
  // Group by target number
  const targetGroups: Record<number, { title: string; gaps: string[] }> = {}
  targetGaps.forEach(g => {
    if (!targetGroups[g.targetNum]) targetGroups[g.targetNum] = { title: g.title, gaps: [] }
    if (!targetGroups[g.targetNum].gaps.includes(g.label))
      targetGroups[g.targetNum].gaps.push(g.label)
  })
  const activeTargets = Object.keys(targetGroups).map(Number).sort((a,b) => a-b)

  // ── Row helpers ─────────────────────────────────────────────
  function rowsForGaps(gapLabels: string[]): { rows: CdpRow[]; indices: number[] } {
    const rows: CdpRow[] = []; const indices: number[] = []
    cdpRows.forEach((r, i) => {
      if (gapLabels.includes(r.capacityGap)) { rows.push(r); indices.push(i) }
    })
    return { rows, indices }
  }

  function handleAddAction(gap: string, source: 'core' | 'target') {
    addCdpRow(gap, source)
  }

  const handleUpdate = useCallback((idx: number, field: string, val: string) => {
    updateCdpRow(idx, field, val)
  }, [updateCdpRow])

  const handleRemove = useCallback((idx: number) => {
    removeCdpRow(idx)
  }, [removeCdpRow])

  const coreActions   = cdpRows.filter(r => r.source !== 'target').length
  const targetActions = cdpRows.filter(r => r.source === 'target').length
  const totalActions  = cdpRows.filter(r => r.action).length

  const noGaps = coreActiveDims.length === 0 && activeTargets.length === 0

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c', lineHeight:1.1 }}>
            {t.cdp.title}
          </h2>
          <p className="text-[13.5px] text-forest-400 mt-1.5">{t.cdp.desc}</p>
        </div>
        {totalActions > 0 && (
          <div className="text-right">
            <div className="text-[22px] font-light" style={{ fontFamily:'var(--font-mono)', color:'#2d6a4f' }}>{totalActions}</div>
            <div className="text-[10.5px] text-forest-400 uppercase tracking-wide">actions planned</div>
          </div>
        )}
      </div>

      {noGaps ? (
        <div className="card text-center py-10">
          <div className="text-3xl mb-2">⚡</div>
          <div className="text-[13px] text-forest-400 mb-1">No capacity gaps found.</div>
          <div className="text-[12px] text-forest-300">
            Complete the Core Capacity and Target assessments, then return here to plan development actions.
          </div>
        </div>
      ) : (
        <>
          {/* ── Section 1: Core Capacity ── */}
          {coreActiveDims.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList size={16} style={{ color:'#1b4332' }}/>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#1b4332' }}>
                  Core Capacity Gaps
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold ml-1"
                  style={{ background:'#d8f3dc', color:'#1b4332' }}>
                  {coreActiveDims.length} dimension{coreActiveDims.length!==1?'s':''} · {coreActions} action{coreActions!==1?'s':''}
                </span>
              </div>
              {coreActiveDims.map(dim => {
                const allGapsInDim = coreDimGaps[dim]
                const { rows, indices } = rowsForGaps(allGapsInDim)
                return (
                  <DimSection key={dim} dim={dim} gapsInDim={allGapsInDim} accentColor="#1b4332"
                    cdpRows={rows} allIndices={indices}
                    onUpdate={handleUpdate} onRemove={handleRemove}
                    onAddAction={handleAddAction} t={t} readOnly={isReadOnly}/>
                )
              })}
            </div>
          )}

          {/* ── Section 2: Target Gaps ── */}
          {activeTargets.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Target size={16} style={{ color:'#1d4ed8' }}/>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#1d4ed8' }}>
                  Target-Specific Gaps
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold ml-1"
                  style={{ background:'#dbeafe', color:'#1d4ed8' }}>
                  {activeTargets.length} target{activeTargets.length!==1?'s':''} · {targetActions} action{targetActions!==1?'s':''}
                </span>
              </div>
              {activeTargets.map(tNum => {
                const group = targetGroups[tNum]
                const { rows, indices } = rowsForGaps(group.gaps)
                return (
                  <div key={tNum} className="mb-4 rounded-2xl overflow-hidden border border-blue-200">
                    <div className="flex items-center gap-3 px-4 py-2.5"
                      style={{ background:'#1d4ed8' }}>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{ background:'rgba(255,255,255,.2)', color:'white' }}>
                        {tNum}
                      </span>
                      <span className="text-[12px] font-bold text-white">{group.title}</span>
                      <span className="text-[10px] opacity-60 text-white ml-auto">
                        {group.gaps.length} gap{group.gaps.length!==1?'s':''} · {rows.filter(r=>r.action).length} action{rows.filter(r=>r.action).length!==1?'s':''}
                      </span>
                    </div>
                    <div className="p-4">
                      {group.gaps.map(gap => (
                        <GapSubsection key={gap} gap={gap} accentColor="#3b82f6"
                          cdpRows={rows} allIndices={indices}
                          onUpdate={handleUpdate} onRemove={handleRemove}
                          onAddAction={handleAddAction} t={t} readOnly={isReadOnly}/>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <SectionActions>
        <button className="btn btn-secondary" onClick={() => navigate('priority')}>{t.common.back}</button>
        <button className="btn btn-primary"   onClick={() => navigate('report')}>{t.common.viewReport}</button>
      </SectionActions>
    </div>
  )
}
// 'use client'
// import { useState, useCallback, memo } from 'react'
// import { useStore } from '@/lib/store'
// import { type CoreRow } from '@/lib/constants'
// import { groupedQuestions, scoreColor } from '@/lib/utils'
// import { getT } from '@/lib/i18n'
// import { SectionActions } from '@/components/ui'
// import ReadOnlyBanner from '@/components/ReadOnlyBanner'

// const CoreRowInputs = memo(function CoreRowInputs({ idx, question, initialRow, onUpdate, t, readOnly }: {
//   idx: number; question: string; initialRow: CoreRow; t: ReturnType<typeof getT>
//   onUpdate: (idx: number, field: string, val: string | number | null) => void
//   readOnly?: boolean
// }) {
//   const [score,   setScore]   = useState(initialRow.score !== null && !isNaN(initialRow.score as number) ? String(initialRow.score) : '')
//   const [evid,    setEvid]    = useState(initialRow.evidence)
//   const [gap,     setGap]     = useState(initialRow.gap)
//   const [support, setSupport] = useState(initialRow.suggestedSupport)

//   function flushScore(val: string) {
//     if (val === '') { onUpdate(idx, 'score', null); return }
//     const n = parseInt(val, 10)
//     if (!isNaN(n)) onUpdate(idx, 'score', Math.min(5, Math.max(0, n)))
//   }

//   const sc = initialRow.score
//   return (
//     <tr>
//       <td className="text-[12px] leading-snug align-top pt-2.5">{question}</td>
//       <td>
//         <input className="ti-score" type="number" min={0} max={5} step={1}
//           value={score} onChange={e => setScore(e.target.value)} onBlur={e => flushScore(e.target.value)}
//           placeholder="0–5" style={sc !== null ? { borderColor:scoreColor(sc), color:scoreColor(sc) } : {}}/>
//       </td>
//       <td><textarea className="ti" rows={2} style={{resize:'none'}} value={evid} onChange={e => setEvid(e.target.value)} onBlur={e => onUpdate(idx,'evidence',e.target.value)} placeholder={t.common.evidence}/></td>
//       <td><textarea className="ti" rows={2} style={{resize:'none'}} value={gap}  onChange={e => setGap(e.target.value)}  onBlur={e => onUpdate(idx,'gap',e.target.value)}      placeholder={t.common.gap}/></td>
//       <td>
//         <select className="ti" style={{appearance:'none',cursor:'pointer'}} value={initialRow.capacityType} onChange={e => onUpdate(idx,'capacityType',e.target.value)}>
//           {t.core.capacityTypes.map((tp, i) => <option key={i} value={tp}>{tp || t.common.selectDots}</option>)}
//         </select>
//       </td>
//       <td>
//         <select className="ti" style={{appearance:'none',cursor:'pointer'}} value={initialRow.priority} onChange={e => onUpdate(idx,'priority',e.target.value)}>
//           {t.core.priorities.map((pr, i) => <option key={i} value={pr} style={{background:'white',color:'#131f18'}}>{pr || t.common.selectDots}</option>)}
//         </select>
//       </td>
//       <td><textarea className="ti" rows={2} style={{resize:'none'}} value={support} onChange={e => setSupport(e.target.value)} onBlur={e => onUpdate(idx,'suggestedSupport',e.target.value)} placeholder={t.common.suggestedSupport}/></td>
//     </tr>
//   )
// })

// export default function CorePage() {
//   const coreRows      = useStore(s => s.assessment.coreRows)
//   const updateCoreRow = useStore(s => s.updateCoreRow)
//   const navigate      = useStore(s => s.navigate)
//   const lang          = useStore(s => s.lang)
//   const isReadOnly    = useStore(s => s.isReadOnly())
//   const t             = getT(lang ?? 'en')
//   const grouped       = groupedQuestions()

//   const handleUpdate = useCallback((idx: number, field: string, val: string | number | null) => {
//     updateCoreRow(idx, field, val)
//   }, [updateCoreRow])

//   // Map English section name → translated section name
//   const sectionMap: Record<string, string> = {}
//   t.core.sections.forEach((s, i) => { sectionMap[t.dimensions[i] || s] = s })

//   return (
//     <div className="fade-in">
//       <div className="mb-6">
//         <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c', lineHeight:1.1 }}>{t.core.title}</h2>
//         <p className="text-[13.5px] text-forest-400 mt-1.5">{t.core.desc}</p>
//       </div>
//       <ReadOnlyBanner/>
//       <div className="flex flex-wrap gap-3 mb-4">
//         {t.core.scale.map(({ s, l }) => (
//           <div key={s} className="flex items-center gap-1.5 text-[11px] text-forest-400">
//             <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ['#dc2626','#c2410c','#a16207','#15803d','#047857','#065f46'][s] }}/>{s} = {l}
//           </div>
//         ))}
//       </div>
//       <div className="rounded-2xl overflow-hidden border border-sand-300">
//         <table className="dt w-full">
//           <thead>
//             <tr>
//               <th style={{width:'22%'}}>{t.core.title.split(' ')[0]}</th>
//               <th style={{width:'7%'}}>{t.common.score}</th>
//               <th style={{width:'16%'}}>{t.common.evidence}</th>
//               <th style={{width:'15%'}}>{t.common.gap}</th>
//               <th style={{width:'13%'}}>{t.common.type}</th>
//               <th style={{width:'9%'}}>{t.common.priority}</th>
//               <th style={{width:'18%'}}>{t.common.suggestedSupport}</th>
//             </tr>
//           </thead>
//           <tbody>
//             {Object.entries(grouped).map(([enSection, qs], sIdx) => (
//               <>
//                 <tr key={`sec-${enSection}`} className="sr">
//                   <td colSpan={7}>📌 {t.core.sections[sIdx] || enSection}</td>
//                 </tr>
//                 {qs.map(({ idx }) => (
//                   <CoreRowInputs
//                     key={idx} idx={idx}
//                     question={t.core.questions[idx] || ''}
//                     initialRow={coreRows[idx]}
//                     onUpdate={handleUpdate}
//                     t={t}
//                   />
//                 ))}
//               </>
//             ))}
//           </tbody>
//         </table>
//       </div>
//       <SectionActions>
//         <button className="btn btn-secondary" onClick={() => navigate('profile')}>{t.common.back}</button>
//         <button className="btn btn-primary"   onClick={() => navigate('targets')}>{t.common.saveAndContinue}</button>
//       </SectionActions>
//     </div>
//   )
// }


'use client'
import { useState, useCallback, memo } from 'react'
import { useStore } from '@/lib/store'
import { type CoreRow } from '@/lib/constants'
import { groupedQuestions, scoreColor, defaultCapacityType } from '@/lib/utils'
import { getT } from '@/lib/i18n'
import { SectionActions } from '@/components/ui'
import ReadOnlyBanner from '@/components/ReadOnlyBanner'

const CoreRowInputs = memo(function CoreRowInputs({ idx, question, section, initialRow, onUpdate, t, readOnly }: {
  idx: number; question: string; section: string; initialRow: CoreRow; t: ReturnType<typeof getT>
  onUpdate: (idx: number, field: string, val: string | number | null) => void
  readOnly?: boolean
}) {
  const [score,   setScore]   = useState(initialRow.score !== null && !isNaN(initialRow.score as number) ? String(initialRow.score) : '')
  const [evid,    setEvid]    = useState(initialRow.evidence)
  const [gap,     setGap]     = useState(initialRow.gap)
  const [support, setSupport] = useState(initialRow.suggestedSupport)
  // Pre-fill capacity type from dimension if not set
  const effectiveCapacityType = initialRow.capacityType || defaultCapacityType(section)

  function flushScore(val: string) {
    if (val === '') { onUpdate(idx, 'score', null); return }
    const n = parseInt(val, 10)
    if (!isNaN(n)) onUpdate(idx, 'score', Math.min(5, Math.max(0, n)))
  }

  // On first interaction, persist the default capacity type to the store
  function ensureCapacityType() {
    if (!initialRow.capacityType) {
      const def = defaultCapacityType(section)
      if (def) onUpdate(idx, 'capacityType', def)
    }
  }

  const sc = initialRow.score
  return (
    <tr>
      <td className="text-[12px] leading-snug align-top pt-2.5">{question}</td>
      <td>
        <input className="ti-score" type="number" min={0} max={5} step={1}
          value={score} onChange={e => setScore(e.target.value)} onBlur={e => flushScore(e.target.value)}
          placeholder="0–5" style={sc !== null ? { borderColor:scoreColor(sc), color:scoreColor(sc) } : {}}/>
      </td>
      <td><textarea className="ti" rows={2} style={{resize:'none'}} value={evid} onChange={e => setEvid(e.target.value)} onBlur={e => onUpdate(idx,'evidence',e.target.value)} placeholder={t.common.evidence}/></td>
      <td><textarea className="ti" rows={2} style={{resize:'none'}} value={gap}  onChange={e => setGap(e.target.value)}  onBlur={e => onUpdate(idx,'gap',e.target.value)}      placeholder={t.common.gap}/></td>
      <td>
        <select className="ti" style={{appearance:'none',cursor:'pointer'}} value={initialRow.capacityType} onChange={e => onUpdate(idx,'capacityType',e.target.value)}>
          {t.core.capacityTypes.map((tp, i) => <option key={i} value={tp}>{tp || t.common.selectDots}</option>)}
        </select>
      </td>
      <td>
        <select className="ti" style={{appearance:'none',cursor:'pointer'}} value={initialRow.priority} onChange={e => onUpdate(idx,'priority',e.target.value)}>
          {t.core.priorities.map((pr, i) => <option key={i} value={pr} style={{background:'white',color:'#131f18'}}>{pr || t.common.selectDots}</option>)}
        </select>
      </td>
      <td><textarea className="ti" rows={2} style={{resize:'none'}} value={support} onChange={e => setSupport(e.target.value)} onBlur={e => onUpdate(idx,'suggestedSupport',e.target.value)} placeholder={t.common.suggestedSupport}/></td>
    </tr>
  )
})

export default function CorePage() {
  const coreRows      = useStore(s => s.assessment.coreRows)
  const updateCoreRow = useStore(s => s.updateCoreRow)
  const navigate      = useStore(s => s.navigate)
  const lang          = useStore(s => s.lang)
  const isReadOnly    = useStore(s => s.isReadOnly())
  const t             = getT(lang ?? 'en')
  const grouped       = groupedQuestions()

  const handleUpdate = useCallback((idx: number, field: string, val: string | number | null) => {
    updateCoreRow(idx, field, val)
  }, [updateCoreRow])

  // Map English section name → translated section name
  const sectionMap: Record<string, string> = {}
  t.core.sections.forEach((s, i) => { sectionMap[t.dimensions[i] || s] = s })

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c', lineHeight:1.1 }}>{t.core.title}</h2>
        <p className="text-[13.5px] text-forest-400 mt-1.5">{t.core.desc}</p>
      </div>
      <ReadOnlyBanner/>
      <div className="flex flex-wrap gap-3 mb-4">
        {t.core.scale.map(({ s, l }) => (
          <div key={s} className="flex items-center gap-1.5 text-[11px] text-forest-400">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ['#dc2626','#c2410c','#a16207','#15803d','#047857','#065f46'][s] }}/>{s} = {l}
          </div>
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden border border-sand-300">
        <table className="dt w-full">
          <thead>
            <tr>
              <th style={{width:'22%'}}>{t.core.title.split(' ')[0]}</th>
              <th style={{width:'7%'}}>{t.common.score}</th>
              <th style={{width:'16%'}}>{t.common.evidence}</th>
              <th style={{width:'15%'}}>{t.common.gap}</th>
              <th style={{width:'13%'}}>{t.common.type}</th>
              <th style={{width:'9%'}}>{t.common.priority}</th>
              <th style={{width:'18%'}}>{t.common.suggestedSupport}</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([enSection, qs], sIdx) => (
              <>
                <tr key={`sec-${enSection}`} className="sr">
                  <td colSpan={7}>📌 {t.core.sections[sIdx] || enSection}</td>
                </tr>
                {qs.map(({ idx }) => (
                  <CoreRowInputs
                    key={idx} idx={idx}
                    question={t.core.questions[idx] || ''}
                    initialRow={coreRows[idx]}
                    onUpdate={handleUpdate}
                    t={t}
                  />
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <SectionActions>
        <button className="btn btn-secondary" onClick={() => navigate('profile')}>{t.common.back}</button>
        <button className="btn btn-primary"   onClick={() => navigate('targets')}>{t.common.saveAndContinue}</button>
      </SectionActions>
    </div>
  )
}
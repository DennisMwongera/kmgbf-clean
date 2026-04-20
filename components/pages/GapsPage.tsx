'use client'
import { useStore } from '@/lib/store'
import { DIMENSIONS, CORE_QUESTIONS } from '@/lib/constants'
import { getDimScores, gapBadge } from '@/lib/utils'
import { getT } from '@/lib/i18n'
import { ScoreChip, GapBadge, SectionActions } from '@/components/ui'

export default function GapsPage() {
  const assessment = useStore(s => s.assessment)
  const setRequired = useStore(s => s.setRequired)
  const navigate    = useStore(s => s.navigate)
  const lang        = useStore(s => s.lang)
  const t           = getT(lang ?? 'en')

  const dimScores = getDimScores(assessment)

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c', lineHeight:1.1 }}>{t.gaps.title}</h2>
        <p className="text-[13.5px] text-forest-400 mt-1.5">{t.gaps.desc}</p>
      </div>
      <div className="card">
        <div className="grid gap-3 pb-2.5 mb-1 border-b-2 border-forest-100 text-[10px] font-bold tracking-[1.2px] uppercase text-forest-400"
          style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1.2fr'}}>
          <span>{t.gaps.area}</span><span>{t.gaps.current}</span><span>{t.gaps.required}</span><span>{t.gaps.gap}</span><span>{t.gaps.priority}</span>
        </div>
        {DIMENSIONS.map((d, i) => {
          const s   = dimScores[d]
          const req = assessment.required[d]
          const gap = s !== null ? s - req : null
          const scored = assessment.coreRows.filter((_, ci) => CORE_QUESTIONS[ci].section === d && assessment.coreRows[ci].score !== null).length
          const dimLabel = t.dimensions[i] || d
          return (
            <div key={d} className="grid gap-3 py-3 border-b border-forest-50 last:border-0 items-center"
              style={{gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1.2fr'}}>
              <div>
                <div className="font-semibold text-[13px] text-forest-700">{dimLabel}</div>
                <div className="text-[10.5px] text-forest-400 mt-0.5">{scored} {t.gaps.indicators} {t.gaps.scored}</div>
              </div>
              <div><ScoreChip value={s}/></div>
              <div>
                <input className="ti-score" type="number" min={0} max={5} step={1} value={req} style={{width:60}}
                  onChange={e => setRequired(d, parseInt(e.target.value,10)||0)}/>
              </div>
              <div className="font-bold text-[13px]" style={{fontFamily:'var(--font-mono)',color:gap!==null&&gap<0?'#dc2626':'#15803d'}}>
                {gap!==null ? (gap>=0?`+${gap.toFixed(1)}`:gap.toFixed(1)) : '—'}
              </div>
              <div><GapBadge gap={gap}/></div>
            </div>
          )
        })}
      </div>
      <SectionActions>
        <button className="btn btn-secondary" onClick={() => navigate('targets')}>{t.common.back}</button>
        <button className="btn btn-primary"   onClick={() => navigate('priority')}>{t.common.saveAndContinue}</button>
      </SectionActions>
    </div>
  )
}
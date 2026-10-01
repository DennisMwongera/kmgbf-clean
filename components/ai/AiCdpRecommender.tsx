'use client'
import { useState } from 'react'
import { Sparkles, Loader2, Check, X } from 'lucide-react'

interface CdpRecommendation {
  action:        string
  institution:   string
  timeline:      string
  budget:        string
  indicator:     string
  collaboration: string
  rationale:     string
}

interface Props {
  capacityGap:      string
  dimension?:       string
  targetNum?:       number
  targetTitle?:     string
  countryName?:     string
  institutionName?: string
  onApply: (rec: Partial<CdpRecommendation>) => void
}

const TIMELINE_MAP: Record<string, string> = {
  short:  'short_term',
  medium: 'medium_term',
  long:   'long_term',
}

export default function AiCdpRecommender({
  capacityGap, dimension, targetNum, targetTitle,
  countryName, institutionName, onApply,
}: Props) {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [rec,     setRec]     = useState<CdpRecommendation | null>(null)
  const [error,   setError]   = useState('')
  const [applied, setApplied] = useState(false)

  async function generate() {
    if (!capacityGap?.trim()) {
      setError('Please enter a capacity gap description first.')
      setOpen(true)
      return
    }
    setOpen(true)
    setLoading(true)
    setError('')
    setRec(null)
    setApplied(false)

    const country = countryName || 'Eastern and Southern Africa'
    const institution = institutionName || 'the institution'

    const contextLines: string[] = []
    if (countryName)     contextLines.push(`Country: ${countryName}`)
    if (institutionName) contextLines.push(`Institution: ${institutionName}`)
    if (dimension)       contextLines.push(`Capacity Dimension: ${dimension}`)
    if (targetNum)       contextLines.push(`KMGBF Target: T${targetNum}${targetTitle ? ' — ' + targetTitle : ''}`)
    contextLines.push(`Capacity Gap: ${capacityGap}`)
    const context = contextLines.join('\n')

    const prompt = [
      `You are a KMGBF capacity development expert specialising in biodiversity capacity development in ${country}.`,
      '',
      `Given this capacity gap, generate ONE concrete, actionable capacity development plan entry aligned to the Kunming-Montreal Global Biodiversity Framework for ${institution} in ${country}.`,
      '',
      context,
      '',
      'Respond ONLY with a valid JSON object (no markdown, no backticks) with these exact fields:',
      '{',
      '  "action": "Specific, concrete activity starting with a verb (e.g. Develop, Train, Establish, Conduct)",',
      `  "institution": "Specific national institution type that exists in ${country} best suited to lead this",`,
      '  "timeline": "one of: short, medium, long (short=under 1 year, medium=1-3 years, long=over 3 years)",',
      '  "budget": "Realistic USD range appropriate for the region (e.g. $15,000 - $30,000)",',
      '  "indicator": "Measurable indicator of completion (e.g. 50 staff trained, policy document approved by cabinet)",',
      '  "collaboration": "Key partner organisations active in the region (e.g. RCMRD, IUCN Africa, UNEP, bilateral donors)",',
      `  "rationale": "One sentence explaining why this action addresses the gap specifically in ${country}"`,
      '}',
      '',
      `Be specific to ${country}: reference local ecosystems, the national NBSAP, national biodiversity targets, and real local government agencies. Avoid generic responses that could apply to any country.`,
    ].join('\n')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6',
          max_tokens: 600,
          messages:   [{ role: 'user', content: prompt }],
        }),
      })
      const data    = await res.json()
      const text    = data.content?.[0]?.text ?? ''
      const cleaned = text.replace(/```json|```/g, '').trim()
      const parsed: CdpRecommendation = JSON.parse(cleaned)
      setRec(parsed)
    } catch {
      setError('Could not generate suggestion. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleApply() {
    if (!rec) return
    onApply({
      action:        rec.action,
      institution:   rec.institution,
      timeline:      TIMELINE_MAP[rec.timeline?.toLowerCase()] ?? rec.timeline,
      budget:        rec.budget,
      indicator:     rec.indicator,
      collaboration: rec.collaboration,
    })
    setApplied(true)
  }

  return (
    <div className="mt-1">
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all hover:opacity-90"
        style={{ background:'linear-gradient(135deg,#1b4332,#2d6a4f)', color:'white' }}>
        {loading
          ? <><Loader2 size={12} className="animate-spin"/> Generating…</>
          : <><Sparkles size={12}/> AI Suggest Action</>}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border overflow-hidden"
          style={{ borderColor:'#d8f3dc', background:'#f0faf4' }}>
          <div className="flex items-center justify-between px-3 py-2"
            style={{ background:'#1b4332' }}>
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} style={{ color:'#52b788' }}/>
              <span className="text-[11px] font-bold text-white">
                AI Recommendation{countryName ? ` — ${countryName}` : ''}
              </span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
              <X size={12}/>
            </button>
          </div>

          <div className="p-3">
            {loading && (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader2 size={16} className="animate-spin" style={{ color:'#52b788' }}/>
                <span className="text-[12px] text-forest-500">
                  Generating recommendation for {countryName || 'your country'}…
                </span>
              </div>
            )}

            {error && !loading && (
              <p className="text-[12px] py-2" style={{ color:'#dc2626' }}>{error}</p>
            )}

            {rec && !loading && (
              <div className="space-y-2">
                <div className="px-3 py-2 rounded-lg text-[11.5px] italic"
                  style={{ background:'#d8f3dc', color:'#1b4332' }}>
                  💡 {rec.rationale}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([
                    { label:'Action',          val: rec.action,        full: true  },
                    { label:'Lead Institution', val: rec.institution,   full: false },
                    { label:'Timeline',         val: rec.timeline,      full: false },
                    { label:'Budget (USD)',      val: rec.budget,        full: false },
                    { label:'Indicator',         val: rec.indicator,    full: true  },
                    { label:'Collaboration',     val: rec.collaboration, full: true  },
                  ] as const).map(({ label, val, full }) => (
                    <div key={label} className={`${full ? 'col-span-2' : ''} rounded-lg p-2`}
                      style={{ background:'white', border:'1px solid #d8f3dc' }}>
                      <div className="text-[9px] font-bold uppercase tracking-wide mb-0.5"
                        style={{ color:'#52b788' }}>{label}</div>
                      <div className="text-[11px] text-forest-700">{val}</div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  {applied ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold"
                      style={{ background:'#d8f3dc', color:'#1b4332' }}>
                      <Check size={12}/> Applied to form
                    </div>
                  ) : (
                    <button onClick={handleApply}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-bold text-white"
                      style={{ background:'#1b4332' }}>
                      <Check size={12}/> Apply to Form
                    </button>
                  )}
                  <button onClick={generate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium"
                    style={{ background:'white', color:'#2d6a4f', border:'1px solid #d8f3dc' }}>
                    <Sparkles size={11}/> Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
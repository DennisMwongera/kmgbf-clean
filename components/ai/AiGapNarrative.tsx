'use client'
import { useState, useEffect } from 'react'
import { Sparkles, Loader2, Copy, Check, FileText, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DIMENSIONS } from '@/lib/constants'
import { getDimScores, getOverall, interpret } from '@/lib/utils'

interface Props {
  mode?: 'institution' | 'national'
  nationalData?: {
    countryName: string
    institutionCount: number
    nationalDimScores: Record<string, number | null>
    nationalOverall: number | null
  }
}

export default function AiGapNarrative({ mode = 'institution', nationalData }: Props) {
  const assessment      = useStore(s => s.assessment)
  const user            = useStore(s => s.user)
  const [countryName,   setCountryName]    = useState('')
  const [instName,      setInstName]       = useState('')
  const [open,       setOpen]    = useState(false)
  const [loading,    setLoading] = useState(false)
  const [narrative,  setNarrative] = useState('')
  const [copied,     setCopied]  = useState(false)
  const [error,      setError]   = useState('')
  const [section,    setSection] = useState<'full'|'executive'|'gaps'|'strengths'>('full')

  useEffect(() => {
    if (!user) return
    if (user.country_id) {
      import('@/lib/supabase/client').then(({ supabase }) => {
        supabase.from('countries').select('name').eq('id', user.country_id!).single()
          .then(({ data }) => { if (data) setCountryName(data.name) })
        if (user.institution_id) {
          supabase.from('institutions').select('name').eq('id', user.institution_id).single()
            .then(({ data }) => { if (data) setInstName(data.name) })
        }
      })
    }
  }, [user])

  const SECTIONS = [
    { id:'full'      as const, label:'Full Analysis'     },
    { id:'executive' as const, label:'Executive Summary' },
    { id:'gaps'      as const, label:'Priority Gaps'     },
    { id:'strengths' as const, label:'Key Strengths'     },
  ]

  async function generate() {
    setOpen(true)
    setLoading(true)
    setError('')
    setNarrative('')

    let prompt = ''

    if (mode === 'institution') {
      const dimScores  = getDimScores(assessment)
      const overall    = getOverall(assessment)
      const coreRows   = assessment.coreRows
      const cdpRows    = assessment.cdpRows

      // Build dimension summary
      const dimSummary = DIMENSIONS.map(dim => {
        const score = dimScores[dim]
        const rows  = coreRows.filter(r => (r as any).dimension === dim)
        const gaps  = rows.filter(r => (r as any).gap?.trim()).map(r => (r as any).gap).slice(0,2).join('; ')
        return `${dim}: ${score?.toFixed(2) ?? 'N/A'} (${interpret(score)})${gaps ? ' — Gaps: ' + gaps : ''}`
      }).join('\n')

      // CDP summary
      const cdpSummary = cdpRows.slice(0,5).map((r: any) =>
        `• ${r.capacityGap ?? 'Gap'} → ${r.action ?? 'No action'} (${r.timeline ?? 'No timeline'})`
      ).join('\n')

      const sectionInstructions: Record<string, string> = {
        full: 'Write a comprehensive 4-paragraph analysis covering: (1) overall capacity overview, (2) strongest dimensions, (3) critical gaps and their implications for biodiversity targets, (4) recommended priority areas for capacity development.',
        executive: 'Write a concise 150-word executive summary suitable for a donor report or government brief. Include overall score, top 2 strengths, top 2 gaps, and one priority recommendation.',
        gaps: 'Write a focused 200-word analysis of the 3 most critical capacity gaps. For each gap, explain what it means for the institution\'s ability to contribute to KMGBF targets and what type of support would be most impactful.',
        strengths: 'Write a 150-word analysis of this institution\'s capacity strengths. Identify 3 areas where they could serve as a model or provide peer learning to other institutions.',
      }

      prompt = `You are a KMGBF capacity development expert preparing an institutional capacity assessment narrative for a biodiversity institution in ${countryName || 'Eastern/Southern Africa'}.

COUNTRY: ${countryName || 'Eastern/Southern Africa'}
INSTITUTION: ${instName || assessment.profile.name || 'Institution'}
TYPE: ${assessment.profile.type || 'N/A'}
MANDATE: ${assessment.profile.mandate || 'N/A'}
OVERALL SCORE: ${overall?.toFixed(2) ?? 'N/A'} / 5.0
ASSESSMENT DATE: ${assessment.profile.assessDate || 'N/A'}

DIMENSION SCORES:
${dimSummary}

CAPACITY DEVELOPMENT PLAN ACTIONS (sample):
${cdpSummary || 'No actions defined yet'}

TASK: ${sectionInstructions[section]}

Write in professional, clear English suitable for CBD reporting. Do not use bullet points — write in paragraphs. Reference specific KMGBF targets where relevant. Be specific to the biodiversity context of ${countryName || 'the country'} — reference its ecosystems, key species, landscapes, and national biodiversity frameworks (NBSAP). Do not add headings or markdown formatting.`

    } else if (mode === 'national' && nationalData) {
      const dimSummary = DIMENSIONS.map(dim => {
        const score = nationalData.nationalDimScores[dim]
        return `${dim}: ${score?.toFixed(2) ?? 'N/A'} (${interpret(score)})`
      }).join('\n')

      const sorted = [...DIMENSIONS].sort((a,b) => {
        const sa = nationalData.nationalDimScores[a] ?? 0
        const sb = nationalData.nationalDimScores[b] ?? 0
        return sa - sb
      })
      const bottom3 = sorted.slice(0,3)
      const top3    = sorted.slice(-3).reverse()

      const sectionInstructions: Record<string, string> = {
        full: 'Write a comprehensive 4-paragraph national capacity narrative covering: (1) overall national capacity status, (2) strongest national capacities and what they enable, (3) critical national gaps and their implications for KMGBF implementation, (4) strategic recommendations for national capacity development investment.',
        executive: 'Write a 150-word executive summary for government and donor audiences covering national score, top strengths, critical gaps, and one strategic priority.',
        gaps: 'Write a focused 200-word analysis of the 3 most critical national capacity gaps and their implications for achieving the 23 KMGBF targets by 2030.',
        strengths: 'Write a 150-word analysis of national capacity strengths and how they can be leveraged to accelerate KMGBF implementation.',
      }

      prompt = `You are a KMGBF capacity development expert writing a national capacity assessment narrative for ${nationalData?.countryName || countryName || 'the country'}.

COUNTRY: ${nationalData.countryName}
INSTITUTIONS ASSESSED: ${nationalData.institutionCount}
NATIONAL OVERALL SCORE: ${nationalData.nationalOverall?.toFixed(2) ?? 'N/A'} / 5.0

NATIONAL AVERAGE SCORES BY DIMENSION:
${dimSummary}

STRONGEST DIMENSIONS: ${top3.join(', ')}
WEAKEST DIMENSIONS: ${bottom3.join(', ')}

TASK: ${sectionInstructions[section]}

Write in professional English suitable for CBD national reporting. Write in paragraphs, no bullet points or headings. Reference specific KMGBF targets where relevant. Be specific to ${nationalData.countryName}'s biodiversity context.`
    }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      setNarrative(data.content?.[0]?.text ?? '')
    } catch {
      setError('Could not generate narrative. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function copyText() {
    await navigator.clipboard.writeText(narrative)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <button onClick={() => { setOpen(true); generate() }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all hover:opacity-90"
        style={{ background:'linear-gradient(135deg,#1b4332,#2d6a4f)', color:'white',
          boxShadow:'0 4px 12px rgba(27,67,50,.3)' }}>
        <Sparkles size={14}/> AI Gap Analysis
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            style={{ boxShadow:'0 24px 60px rgba(0,0,0,.25)' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-sand-200"
              style={{ background:'linear-gradient(135deg,#1b4332,#2d6a4f)', borderRadius:'16px 16px 0 0' }}>
              <div className="flex items-center gap-2">
                <Sparkles size={16} style={{ color:'#52b788' }}/>
                <span className="text-[14px] font-bold text-white">
                  AI {mode === 'national' ? 'National' : 'Institution'} Gap Analysis
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                <X size={16}/>
              </button>
            </div>

            {/* Section selector */}
            <div className="flex gap-1.5 p-4 border-b border-sand-200" style={{ background:'#f6f3ee' }}>
              {SECTIONS.map(({ id, label }) => (
                <button key={id} onClick={() => setSection(id)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: section === id ? '#1b4332' : 'white',
                    color:      section === id ? 'white'   : '#5c7566',
                    border:     `1px solid ${section === id ? '#1b4332' : '#e8e3da'}`
                  }}>
                  {label}
                </button>
              ))}
              <button onClick={generate} disabled={loading}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                style={{ background:'white', color:'#2d6a4f', border:'1px solid #d8f3dc' }}>
                {loading ? <Loader2 size={11} className="animate-spin"/> : <Sparkles size={11}/>}
                {loading ? 'Generating…' : 'Generate'}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background:'#d8f3dc' }}>
                    <Sparkles size={18} style={{ color:'#1b4332' }}/>
                  </div>
                  <p className="text-[13px] text-forest-500">
                    Analysing capacity data and generating narrative…
                  </p>
                  <Loader2 size={20} className="animate-spin" style={{ color:'#52b788' }}/>
                </div>
              )}

              {error && !loading && (
                <div className="px-4 py-3 rounded-xl text-[13px]"
                  style={{ background:'#fee2e2', color:'#dc2626' }}>{error}</div>
              )}

              {narrative && !loading && (
                <div>
                  <div className="text-[13.5px] text-forest-700 leading-relaxed"
                    style={{ lineHeight:1.75 }}>
                    {narrative.split('\n\n').map((para, i) => (
                      <p key={i} className="mb-4">{para}</p>
                    ))}
                  </div>
                </div>
              )}

              {!narrative && !loading && !error && (
                <div className="text-center py-12 text-forest-400">
                  <FileText size={32} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-[13px]">Select a section type and click Generate</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {narrative && !loading && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-sand-200">
                <p className="text-[10.5px] text-forest-400 italic">
                  AI-generated — review and edit before including in official reports
                </p>
                <button onClick={copyText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold"
                  style={{ background: copied ? '#d8f3dc' : '#f0faf4', color: copied ? '#1b4332' : '#2d6a4f',
                    border:'1px solid #d8f3dc' }}>
                  {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy Text</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
'use client'
import { useState } from 'react'
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Info, X, ChevronDown } from 'lucide-react'
import { useStore } from '@/lib/store'
import { DIMENSIONS } from '@/lib/constants'
import { getDimScores } from '@/lib/utils'

interface Issue {
  severity: 'critical' | 'warning' | 'info'
  field:    string
  message:  string
}

interface CheckResult {
  score:       number        // 0–100 quality score
  readyToSubmit: boolean
  summary:     string
  issues:      Issue[]
  strengths:   string[]
}

interface Props {
  onProceed?: () => void     // called when user clicks Submit after seeing check
  compact?:   boolean        // true = button only, no expanded panel
}

export default function AiAssessmentChecker({ onProceed, compact = false }: Props) {
  const assessment     = useStore(s => s.assessment)
  const [open,         setOpen]    = useState(false)
  const [loading,      setLoading] = useState(false)
  const [result,       setResult]  = useState<CheckResult | null>(null)
  const [error,        setError]   = useState('')

  async function runCheck() {
    setOpen(true)
    setLoading(true)
    setError('')
    setResult(null)

    const dimScores = getDimScores(assessment)
    const coreRows  = assessment.coreRows

    const answered   = coreRows.filter(r => r.score !== null && r.score !== -1).length
    const withEvid   = coreRows.filter(r => (r as any).evidence?.trim()).length
    const withGap    = coreRows.filter(r => (r as any).gap?.trim()).length
    const zeroScores = coreRows.filter(r => r.score === 0 || r.score === 1).length
    const noSupport  = coreRows.filter(r =>
      (r.score === 0 || r.score === 1) && !(r as any).suggestedSupport?.trim()
    ).length

    const dimSummary = DIMENSIONS.map(dim => {
      const score = dimScores[dim as keyof typeof dimScores]
      const rows  = coreRows.filter(r => (r as any).dimension === dim)
      const evPct = rows.length > 0 ? Math.round(rows.filter(r => (r as any).evidence?.trim()).length / rows.length * 100) : 0
      return `${dim}: score=${score?.toFixed(2) ?? 'N/A'}, evidence_coverage=${evPct}%`
    }).join('\n')

    const cdpCount      = assessment.cdpRows.length
    const cdpWithAction = assessment.cdpRows.filter(r => r.action?.trim()).length

    const prompt = `You are a KMGBF assessment quality reviewer. Analyse this institutional capacity assessment and return a quality check result.

ASSESSMENT STATISTICS:
- Institution: ${assessment.profile.name || 'Unknown'}
- Indicators answered: ${answered}/50 (${Math.round(answered/50*100)}%)
- Indicators with evidence: ${withEvid}/${answered} (${answered > 0 ? Math.round(withEvid/answered*100) : 0}%)
- Indicators with gap description: ${withGap}/${answered}
- Critical scores (0-1): ${zeroScores} indicators
- Critical scores without support suggested: ${noSupport}
- Profile complete: name=${!!assessment.profile.name}, mandate=${!!assessment.profile.mandate}, focal=${!!assessment.profile.focalEmail}
- CDP actions defined: ${cdpCount} rows, ${cdpWithAction} with actions filled

DIMENSION SCORES:
${dimSummary}

Return ONLY a valid JSON object (no markdown):
{
  "score": <0-100 quality score>,
  "readyToSubmit": <true if score>=70 and answered>=40>,
  "summary": "<one sentence overall quality assessment>",
  "issues": [
    {"severity": "critical|warning|info", "field": "<what area>", "message": "<specific actionable issue>"}
  ],
  "strengths": ["<strength 1>", "<strength 2>"]
}

Issues: critical=blocks quality, warning=should fix, info=nice to have. Maximum 6 issues total. Be specific and actionable.`

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 700,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text ?? ''
      const cleaned = text.replace(/```json|```/g, '').trim()
      setResult(JSON.parse(cleaned))
    } catch {
      setError('Could not run quality check. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = (s: number) => s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : '#dc2626'
  const severityIcon = (sev: string) => {
    if (sev === 'critical') return <AlertTriangle size={13} style={{ color:'#dc2626', flexShrink:0 }}/>
    if (sev === 'warning')  return <AlertTriangle size={13} style={{ color:'#d97706', flexShrink:0 }}/>
    return <Info size={13} style={{ color:'#3b82f6', flexShrink:0 }}/>
  }
  const severityBg = (sev: string) => sev === 'critical' ? '#fee2e2' : sev === 'warning' ? '#fef3c7' : '#dbeafe'

  return (
    <>
      <button onClick={runCheck}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all hover:opacity-90"
        style={{ background:'linear-gradient(135deg,#1b4332,#2d6a4f)', color:'white',
          boxShadow:'0 4px 12px rgba(27,67,50,.3)' }}>
        <Sparkles size={14}/> AI Quality Check
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col"
            style={{ boxShadow:'0 24px 60px rgba(0,0,0,.25)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ background:'linear-gradient(135deg,#1b4332,#2d6a4f)', borderRadius:'16px 16px 0 0' }}>
              <div className="flex items-center gap-2">
                <Sparkles size={16} style={{ color:'#52b788' }}/>
                <span className="text-[14px] font-bold text-white">Assessment Quality Check</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                <X size={16}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 size={28} className="animate-spin" style={{ color:'#52b788' }}/>
                  <p className="text-[13px] text-forest-500 text-center">
                    Reviewing your assessment for completeness and quality…
                  </p>
                </div>
              )}

              {error && !loading && (
                <div className="px-4 py-3 rounded-xl text-[13px]"
                  style={{ background:'#fee2e2', color:'#dc2626' }}>{error}</div>
              )}

              {result && !loading && (
                <div className="space-y-4">
                  {/* Score circle */}
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center shrink-0"
                      style={{ border:`4px solid ${scoreColor(result.score)}`, background:scoreColor(result.score)+'15' }}>
                      <span className="text-[24px] font-bold" style={{ color:scoreColor(result.score) }}>
                        {result.score}
                      </span>
                      <span className="text-[9px] font-bold uppercase" style={{ color:scoreColor(result.score) }}>
                        /100
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {result.readyToSubmit
                          ? <CheckCircle2 size={16} style={{ color:'#16a34a' }}/>
                          : <AlertTriangle size={16} style={{ color:'#d97706' }}/>}
                        <span className="font-bold text-[13.5px]" style={{
                          color: result.readyToSubmit ? '#16a34a' : '#d97706'
                        }}>
                          {result.readyToSubmit ? 'Ready to submit' : 'Improvements recommended'}
                        </span>
                      </div>
                      <p className="text-[12px] text-forest-600">{result.summary}</p>
                    </div>
                  </div>

                  {/* Issues */}
                  {result.issues.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-forest-400 mb-2">
                        Issues to Address ({result.issues.length})
                      </div>
                      <div className="space-y-2">
                        {result.issues.map((issue, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl"
                            style={{ background: severityBg(issue.severity) }}>
                            {severityIcon(issue.severity)}
                            <div>
                              <div className="text-[10.5px] font-bold text-forest-700">{issue.field}</div>
                              <div className="text-[11px] text-forest-600 mt-0.5">{issue.message}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths */}
                  {result.strengths.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-forest-400 mb-2">
                        Strengths
                      </div>
                      {result.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 mb-1.5">
                          <CheckCircle2 size={13} style={{ color:'#16a34a', flexShrink:0, marginTop:1 }}/>
                          <span className="text-[11.5px] text-forest-600">{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {result && !loading && (
              <div className="flex gap-3 px-6 py-4 border-t border-sand-200">
                <button onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border"
                  style={{ borderColor:'#e8e3da', color:'#5c7566' }}>
                  {result.readyToSubmit ? 'Continue Editing' : 'Fix Issues First'}
                </button>
                {onProceed && (
                  <button onClick={() => { setOpen(false); onProceed() }}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white"
                    style={{ background: result.readyToSubmit ? '#1b4332' : '#d97706' }}>
                    {result.readyToSubmit ? '✓ Submit Assessment' : 'Submit Anyway'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
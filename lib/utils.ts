import { CORE_QUESTIONS, DIMENSIONS, KMGBF_TARGETS, DEFAULT_REQUIRED, type Assessment, type Dimension } from './constants'

export function makeAssessment(): Assessment {
  return {
    id: null,
    profile: { name:'', type:'', level:'', mandate:'', scope:'', focalName:'', focalTitle:'', focalEmail:'', assessDate: new Date().toISOString().slice(0,10) },
    coreRows: CORE_QUESTIONS.map(q => ({ score:null, evidence:'', gap:'', capacityType: defaultCapacityType(q.section), priority:'', suggestedSupport:'' })),
    targetRows: {},
    required: { ...DEFAULT_REQUIRED },
    priorityRows: [],
    cdpRows: [],
  }
}

// ─── N/A helper ───────────────────────────────────────────────
export const isNA = (score: number | null): boolean => score === -1

// Returns true if score should count in analytics (not null, not N/A)
export const isScorable = (score: number | null): score is number =>
  score !== null && score !== -1 && !isNaN(score)

export function getDimScores(a: Assessment): Record<Dimension, number | null> {
  const acc: Record<string, { sum: number; n: number }> = {}
  DIMENSIONS.forEach(d => { acc[d] = { sum:0, n:0 } })
  a.coreRows.forEach((row, i) => {
    if (isScorable(row.score)) { acc[CORE_QUESTIONS[i].section].sum += row.score; acc[CORE_QUESTIONS[i].section].n++ }
  })
  const out = {} as Record<Dimension, number | null>
  DIMENSIONS.forEach(d => { out[d] = acc[d].n > 0 ? acc[d].sum / acc[d].n : null })
  return out
}

export function getOverall(a: Assessment): number | null {
  const scores = a.coreRows.map(r => r.score).filter(isScorable)
  return scores.length ? scores.reduce((x,y) => x+y, 0) / scores.length : null
}

export function getTargetAvg(a: Assessment, num: number, indicators: string[]): number | null {
  const scores = indicators.map((_,i) => a.targetRows[`t${num}_${i}`]?.score).filter(isScorable)
  return scores.length ? scores.reduce((x,y) => x+y, 0) / scores.length : null
}

export function scoreColor(v: number | null): string {
  if (v === null || v === -1) return '#9ca3af'
  if (v < 1) return '#dc2626'; if (v < 2) return '#c2410c'
  if (v < 3) return '#a16207'; if (v < 4) return '#15803d'
  if (v < 4.8) return '#047857'; return '#065f46'
}

export function interpret(v: number | null, t?: { interp: { notAssessed:string; critical:string; veryLimited:string; basic:string; moderate:string; strong:string; adequate:string } }): string {
  const i = t?.interp
  if (v === -1) return 'Not applicable'
  if (v === null) return i?.notAssessed ?? 'Not assessed'
  if (v < 1)   return i?.critical    ?? 'Critical – no capacity'
  if (v < 2)   return i?.veryLimited ?? 'Very limited'
  if (v < 2.5) return i?.basic       ?? 'Basic'
  if (v < 3.5) return i?.moderate    ?? 'Moderate'
  if (v < 4.5) return i?.strong      ?? 'Strong'
  return i?.adequate ?? 'Fully adequate'
}

export function chipStyle(v: number | null) {
  if (v === null || v === -1) return { background:'#f3f4f6', color:'#9ca3af' }
  if (v < 1)   return { background:'#fee2e2', color:'#dc2626' }
  if (v < 2)   return { background:'#ffedd5', color:'#c2410c' }
  if (v < 3)   return { background:'#fef9c3', color:'#a16207' }
  if (v < 4)   return { background:'#dcfce7', color:'#15803d' }
  if (v < 4.8) return { background:'#d1fae5', color:'#047857' }
  return { background:'#a7f3d0', color:'#065f46' }
}

export function gapBadge(gap: number | null) {
  if (gap === null) return { label:'Not scored', bg:'#f3f4f6', text:'#9ca3af' }
  if (gap >= 0)    return { label:'✓ Met',       bg:'#dcfce7', text:'#15803d' }
  if (gap > -1.5)  return { label:'⚠ Low',       bg:'#fef3c7', text:'#d97706' }
  if (gap > -2.5)  return { label:'⚡ Medium',    bg:'#ffedd5', text:'#c2410c' }
  return { label:'🔴 High', bg:'#fee2e2', text:'#dc2626' }
}

export function groupedQuestions() {
  const out: Record<string, { q:string; idx:number }[]> = {}
  CORE_QUESTIONS.forEach((cq, i) => {
    if (!out[cq.section]) out[cq.section] = []
    out[cq.section].push({ q:cq.q, idx:i })
  })
  return out
}

export function gapItems(a: Assessment) {
  const dimScores = getDimScores(a)
  const items: { label:string; dim:string }[] = []
  a.coreRows.forEach((row, i) => { if (row.gap?.trim()) items.push({ label:row.gap, dim:CORE_QUESTIONS[i].section }) })
  DIMENSIONS.forEach(d => {
    const s = dimScores[d]
    if (s !== null && s !== -1 && s < a.required[d] && !items.find(x => x.dim===d))
      items.push({ label:`${d} capacity gap`, dim:d })
  })
  return items
}

// Maps a dimension/section name to its default capacity type
export function defaultCapacityType(section: string | undefined | null): string {
  if (!section) return ''
  if (section.includes('Policy') || section.includes('Legal'))            return 'Policy'
  if (section.includes('Institutional'))                                  return 'Institutional'
  if (section.includes('Technical'))                                      return 'Technical'
  if (section.includes('Financial'))                                      return 'Financial'
  if (section.includes('Infrastructure') || section.includes('Equipment')) return 'Infrastructure'
  if (section.includes('Knowledge') || section.includes('Information'))   return 'Knowledge'
  if (section.includes('Coordination') || section.includes('Governance')) return 'Coordination'
  if (section.includes('Awareness'))                                      return 'Awareness'
  return ''
}

// ─── Language-neutral dropdown value maps ─────────────────────
// Stored values are always English. These maps convert between
// display labels (any language) ↔ canonical English stored values.

export const PRIORITY_CANONICAL = ['', 'Low', 'Med', 'High'] as const
export const TIMELINE_CANONICAL = [
  '', '0–6 months', '6–12 months', '1–2 years', '2–5 years', 'Long-term'
] as const

// Given a translated label array and a stored English value,
// find the index to highlight the correct <option>
export function canonicalIndex(canonical: readonly string[], storedValue: string): number {
  return canonical.indexOf(storedValue as any)
}

// Given any translated label (from any language), return the English stored value
// by matching position in the canonical array
export function toCanonical(
  translatedOptions: string[],
  selectedLabel: string,
  canonicalOptions: readonly string[]
): string {
  const idx = translatedOptions.indexOf(selectedLabel)
  return idx >= 0 ? canonicalOptions[idx] ?? '' : selectedLabel
}

// Given a stored value (English canonical OR legacy translated), return
// the translated label for display in the current language's dropdown
export function fromCanonical(
  canonicalOptions: readonly string[],
  translatedOptions: string[],
  storedValue: string
): string {
  if (!storedValue) return ''
  // 1. Try matching stored value as canonical English
  const canonIdx = canonicalOptions.indexOf(storedValue as any)
  if (canonIdx >= 0) return translatedOptions[canonIdx] ?? storedValue
  // 2. Stored value might already be a translated label (legacy data)
  //    Find which position it maps to in any language by checking
  //    if it exists anywhere in translatedOptions → return same label
  if (translatedOptions.includes(storedValue)) return storedValue
  // 3. Unknown value — return as-is (shows blank in dropdown, user must re-select)
  return ''
}

export const INST_TYPES_CANONICAL = [
  'Government Ministry','Regulatory Agency','Research Institute','NGO / Civil Society',
  'International Organization','Private Sector','Academic Institution',
  'Protected Area Authority','Local Government','Other'
] as const

export const INST_LEVELS_CANONICAL = ['National','Regional','Local','International'] as const
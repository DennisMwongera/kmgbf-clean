import { CORE_QUESTIONS, DIMENSIONS, KMGBF_TARGETS, DEFAULT_REQUIRED, type Assessment, type Dimension } from './constants'

export function makeAssessment(): Assessment {
  return {
    id:      null,
    version: null,
    status:  null,
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
export const isScorable = (score: number | null | undefined): score is number =>
  score !== null && score !== undefined && score !== -1 && !isNaN(score as number)

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

// ─── Target gap items for CDP ─────────────────────────────────
// Returns targets where avg score < required (5) and at least one indicator scored
export function targetGapItems(a: Assessment): {
  label: string; targetNum: number; title: string
  avgScore: number | null; indScore: number | null; autoScore: number; isTop3: boolean
}[] {
  // Auto-score targets by how critical they are — purely from scores, no manual input
  // Priority = how far below 5 the target average is (lower avg = higher need)
  const rawItems: {
    label: string; targetNum: number; title: string
    avgScore: number | null; indScore: number | null; autoScore: number
  }[] = []

  KMGBF_TARGETS.forEach(t => {
    const hasScored = t.indicators.some((_, i) => isScorable(a.targetRows[`t${t.num}_${i}`]?.score))
    if (!hasScored) return

    const avg = getTargetAvg(a, t.num, t.indicators)

    // Target-level gap — auto score = distance from 5
    if (avg !== null && avg < 5) {
      rawItems.push({
        label:     `T${t.num}: ${t.title} — capacity gap`,
        targetNum: t.num,
        title:     t.title,
        avgScore:  avg,
        indScore:  avg,
        autoScore: 5 - avg,   // higher score = bigger gap = higher need
      })
    }

    // Indicator-level gap text — score based on individual indicator score
    t.indicators.forEach((_, i) => {
      const row   = a.targetRows[`t${t.num}_${i}`]
      const iScore = isScorable(row?.score) ? row!.score : null
      if (row?.gapIdentified?.trim() && isScorable(iScore)) {
        rawItems.push({
          label:     row.gapIdentified.trim(),
          targetNum: t.num,
          title:     t.title,
          avgScore:  avg,
          indScore:  iScore,
          autoScore: (5 - (iScore ?? 5)) + (avg !== null ? (5 - avg) * 0.5 : 0), // indicator + target weight
        })
      }
    })
  })

  // Sort: highest autoScore first (= lowest scores = highest need), dedupe
  const sorted = rawItems
    .filter((item, idx, arr) => arr.findIndex(x => x.label === item.label) === idx)
    .sort((a, b) => b.autoScore - a.autoScore)

  return sorted.map((item, idx) => ({
    ...item,
    isTop3: idx < 3,
  }))
}

export function gapItems(a: Assessment) {
  const dimScores = getDimScores(a)

  // Compute indicator-level gap score automatically:
  // A gap's priority = how far below required the indicator's dimension is
  // + how low the individual indicator score is
  // No manual prioritization needed — derived purely from scores
  function autoGapScore(indicatorScore: number | null, dimScore: number | null, required: number): number {
    const dimGap  = required - (dimScore ?? required)        // how far dim is below required (0–5)
    const indGap  = 5 - (indicatorScore ?? 5)                // how low indicator is (0–5)
    return dimGap * 2 + indGap                               // weight dim gap more heavily
  }

  // Collect all gaps per dimension with auto-computed priority
  const byDim: Record<string, { label: string; dim: string; dimScore: number | null; autoScore: number }[]> = {}

  a.coreRows.forEach((row, i) => {
    if (!row.gap?.trim() || isNA(row.score)) return
    const dim     = CORE_QUESTIONS[i].section
    const dScore  = dimScores[dim] ?? null
    const required = a.required[dim] ?? 5
    if (!byDim[dim]) byDim[dim] = []
    byDim[dim].push({
      label:     row.gap,
      dim,
      dimScore:  dScore,
      autoScore: autoGapScore(isScorable(row.score) ? row.score : null, dScore, required),
    })
  })

  // Add dimension-level auto-gap if no indicator-level gaps exist for that dim
  DIMENSIONS.forEach(d => {
    const s        = dimScores[d]
    const required = a.required[d] ?? 5
    if (s !== null && s !== -1 && isScorable(s) && s < required) {
      if (!byDim[d]) byDim[d] = []
      if (!byDim[d].length) {
        byDim[d].push({
          label:     `${d} capacity gap`,
          dim:       d,
          dimScore:  s,
          autoScore: autoGapScore(s, s, required),
        })
      }
    }
  })

  const items: { label: string; dim: string; dimScore: number | null; autoScore: number; isTop3: boolean }[] = []

  // Sort within each dimension: highest autoScore first (= lowest scores = highest need)
  Object.keys(byDim).forEach(dim => {
    const sorted = byDim[dim]
      .sort((a, b) => b.autoScore - a.autoScore)    // highest need first
      .filter((item, idx, arr) => arr.findIndex(x => x.label === item.label) === idx) // dedupe

    sorted.forEach((item, idx) => {
      items.push({ ...item, isTop3: idx < 3 })
    })
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

// Given any translated label (from any language), return the English canonical stored value
export function toCanonical(
  translatedOptions: string[],
  selectedLabel: string,
  canonicalOptions: readonly string[]
): string {
  if (!selectedLabel) return ''
  const idx = translatedOptions.indexOf(selectedLabel)
  if (idx >= 0) return canonicalOptions[idx] ?? ''
  // Already canonical English — return as-is
  if ((canonicalOptions as readonly string[]).includes(selectedLabel)) return selectedLabel
  return ''
}

// All known translations for each canonical position — used for cross-language lookup
const PRIORITY_ALL_TRANSLATIONS: string[][] = [
  ['', '', '', ''],                            // empty
  ['Low', 'Faible', 'Baixa', 'منخفضة'],       // Low
  ['Med', 'Moyen', 'Média', 'متوسطة'],         // Med
  ['High', 'Élevé', 'Alta', 'عالية'],          // High
]
const TIMELINE_ALL_TRANSLATIONS: string[][] = [
  ['', '', '', ''],
  ['0–6 months', '0–6 mois', '0–6 meses', '0–6 أشهر'],
  ['6–12 months', '6–12 mois', '6–12 meses', '6–12 شهراً'],
  ['1–2 years', '1–2 ans', '1–2 anos', '1–2 سنة'],
  ['2–5 years', '2–5 ans', '2–5 anos', '2–5 سنوات'],
  ['Long-term', 'Long terme', 'Longo prazo', 'طويل المدى'],
]
const INST_TYPE_ALL_TRANSLATIONS: string[][] = [
  ['Government Ministry','Ministère gouvernemental','Ministério do Governo','وزارة حكومية'],
  ['Regulatory Agency','Agence de réglementation','Agência Regulatória','هيئة تنظيمية'],
  ['Research Institute','Institut de recherche','Instituto de Pesquisa','معهد بحثي'],
  ['NGO / Civil Society','ONG / Société civile','ONG / Sociedade Civil','منظمة غير حكومية'],
  ['International Organization','Organisation internationale','Organização Internacional','منظمة دولية'],
  ['Private Sector','Secteur privé','Setor Privado','قطاع خاص'],
  ['Academic Institution','Institution académique','Instituição Acadêmica','مؤسسة أكاديمية'],
  ['Protected Area Authority','Autorité des aires protégées','Autoridade de Área Protegida','سلطة المناطق المحمية'],
  ['Local Government','Gouvernement local','Governo Local','حكومة محلية'],
  ['Other','Autre','Outro','أخرى'],
]
const INST_LEVEL_ALL_TRANSLATIONS: string[][] = [
  ['National','National','Nacional','وطني'],
  ['Regional','Régional','Regional','إقليمي'],
  ['Local','Local','Local','محلي'],
  ['International','International','Internacional','دولي'],
]

// Cross-language lookup: find which canonical index a stored value belongs to
// Works regardless of which language it was stored in
function findCanonicalIndex(
  allTranslations: string[][],
  storedValue: string
): number {
  if (!storedValue) return 0
  return allTranslations.findIndex(row => row.includes(storedValue))
}

// Given a stored value (any language), return the display label for current language
export function fromCanonical(
  canonicalOptions: readonly string[],
  translatedOptions: string[],
  storedValue: string
): string {
  if (!storedValue) return ''

  // 1. Direct canonical English match (fastest path)
  const canonIdx = canonicalOptions.indexOf(storedValue as any)
  if (canonIdx >= 0) return translatedOptions[canonIdx] ?? storedValue

  // 2. Already the correct translated label for current language
  if (translatedOptions.includes(storedValue)) return storedValue

  // 3. Cross-language lookup — find which canonical position this belongs to
  //    by checking all known translations across all languages
  let allTranslations: string[][] | null = null
  if (canonicalOptions === PRIORITY_CANONICAL as any || canonicalOptions.length === 4 && canonicalOptions.includes('Low' as any)) {
    allTranslations = PRIORITY_ALL_TRANSLATIONS
  } else if (canonicalOptions === TIMELINE_CANONICAL as any || canonicalOptions.includes('Long-term' as any)) {
    allTranslations = TIMELINE_ALL_TRANSLATIONS
  } else if (canonicalOptions.includes('National' as any)) {
    allTranslations = INST_LEVEL_ALL_TRANSLATIONS
  } else if (canonicalOptions.includes('Government Ministry' as any)) {
    allTranslations = INST_TYPE_ALL_TRANSLATIONS
  }

  if (allTranslations) {
    const idx = findCanonicalIndex(allTranslations, storedValue)
    if (idx >= 0 && idx < translatedOptions.length) return translatedOptions[idx]
  }

  return ''
}

export const INST_TYPES_CANONICAL = [
  'Government Ministry','Regulatory Agency','Research Institute','NGO / Civil Society',
  'International Organization','Private Sector','Academic Institution',
  'Protected Area Authority','Local Government','Other'
] as const

export const INST_LEVELS_CANONICAL = ['National','Regional','Local','International'] as const
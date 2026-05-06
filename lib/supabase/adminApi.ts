import { supabase } from './client'
import { DIMENSIONS, CORE_QUESTIONS, KMGBF_TARGETS } from '@/lib/constants'

export interface InstitutionReport {
  institution: {
    id:    string
    name:  string
    type:  string | null
    level: string | null
  }
  assessment: {
    id:          string | null
    assess_date: string | null
    status:      string | null
    updated_at:  string | null
  } | null
  dimScores:    Record<string, number | null>   // dimension → avg score
  overallScore: number | null
  targetScores: Record<number, number | null>   // target_num → avg score
  answeredCount: number                          // how many of 50 answered
}

export interface NationalReport {
  institutions:     InstitutionReport[]
  nationalDimScores: Record<string, number | null>  // avg across all insts
  nationalOverall:  number | null
  nationalTargets:  Record<number, number | null>
  generatedAt:      string
}

// ─── Load all institutions with their latest assessment data ──
export async function loadAllInstitutionReports(): Promise<InstitutionReport[]> {
  // 1. Get all institutions
  const { data: institutions } = await supabase
    .from('institutions')
    .select('id, name, type, level')
    .order('name')

  if (!institutions?.length) return []

  // 2. Get all latest assessments in one query
  const { data: allAssessments } = await supabase
    .from('assessments')
    .select('id, institution_id, assess_date, status, updated_at')
    .order('updated_at', { ascending: false })

  // Map institution_id → latest assessment
  const latestByInst: Record<string, any> = {}
  allAssessments?.forEach(a => {
    if (!latestByInst[a.institution_id]) latestByInst[a.institution_id] = a
  })

  const assessmentIds = Object.values(latestByInst).map((a: any) => a.id)

  // 3. Get all core responses for all assessments in one query
  const { data: allCoreRows } = assessmentIds.length
    ? await supabase.from('core_responses').select('assessment_id, question_index, score').in('assessment_id', assessmentIds)
    : { data: [] }

  // 4. Get all target responses for all assessments in one query
  const { data: allTargetRows } = assessmentIds.length
    ? await supabase.from('target_responses').select('assessment_id, target_num, score').in('assessment_id', assessmentIds)
    : { data: [] }

  // Group core rows by assessment_id
  const coreByAssess: Record<string, { question_index: number; score: number | null }[]> = {}
  allCoreRows?.forEach(r => {
    if (!coreByAssess[r.assessment_id]) coreByAssess[r.assessment_id] = []
    coreByAssess[r.assessment_id].push(r)
  })

  // Group target rows by assessment_id
  const targetByAssess: Record<string, { target_num: number; score: number | null }[]> = {}
  allTargetRows?.forEach(r => {
    if (!targetByAssess[r.assessment_id]) targetByAssess[r.assessment_id] = []
    targetByAssess[r.assessment_id].push(r)
  })

  // 5. Build report for each institution
  return institutions.map(inst => {
    const assessment = latestByInst[inst.id] ?? null
    const aid        = assessment?.id

    // Compute dimension scores from core rows
    const dimScores: Record<string, number | null> = {}
    let totalAnswered = 0

    DIMENSIONS.forEach(dim => {
      const qIdxs  = CORE_QUESTIONS
        .map((q, i) => ({ q, i }))
        .filter(({ q }) => q.section === dim)
        .map(({ i }) => i)

      const rows   = (coreByAssess[aid] ?? []).filter(r => qIdxs.includes(r.question_index) && r.score !== null && r.score !== -1)
      totalAnswered += rows.length
      dimScores[dim] = rows.length > 0 ? rows.reduce((s, r) => s + (r.score ?? 0), 0) / rows.length : null
    })

    // Overall score
    const validDims   = Object.values(dimScores).filter((v): v is number => v !== null && v !== -1)
    const overallScore = validDims.length > 0 ? validDims.reduce((a, b) => a + b, 0) / validDims.length : null

    // Target scores
    const targetScores: Record<number, number | null> = {}
    KMGBF_TARGETS.forEach(t => {
      const rows = (targetByAssess[aid] ?? []).filter(r => r.target_num === t.num && r.score !== null && r.score !== -1)
      targetScores[t.num] = rows.length > 0 ? rows.reduce((s, r) => s + (r.score ?? 0), 0) / rows.length : null
    })

    return {
      institution: inst,
      assessment:  assessment ? {
        id:          assessment.id,
        assess_date: assessment.assess_date,
        status:      assessment.status,
        updated_at:  assessment.updated_at,
      } : null,
      dimScores,
      overallScore,
      targetScores,
      answeredCount: totalAnswered,
    }
  })
}

// ─── Aggregate all institution reports into a national report ──
export function buildNationalReport(reports: InstitutionReport[]): NationalReport {
  const withData = reports.filter(r => r.overallScore !== null)

  const nationalDimScores: Record<string, number | null> = {}
  DIMENSIONS.forEach(dim => {
    const vals = withData.map(r => r.dimScores[dim]).filter(v => v !== null) as number[]
    nationalDimScores[dim] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  })

  const overallVals   = withData.map(r => r.overallScore).filter(v => v !== null) as number[]
  const nationalOverall = overallVals.length > 0 ? overallVals.reduce((a, b) => a + b, 0) / overallVals.length : null

  const nationalTargets: Record<number, number | null> = {}
  KMGBF_TARGETS.forEach(t => {
    const vals = withData.map(r => r.targetScores[t.num]).filter(v => v !== null) as number[]
    nationalTargets[t.num] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  })

  return {
    institutions:      reports,
    nationalDimScores,
    nationalOverall,
    nationalTargets,
    generatedAt:       new Date().toISOString(),
  }
}

// ─── Load full assessment detail for a single institution ─────
export interface InstitutionAssessmentDetail extends InstitutionReport {
  profile: {
    name: string; type: string | null; level: string | null
    scope: string | null; mandate: string | null
    focalName: string | null; focalTitle: string | null
    focalEmail: string | null; assessDate: string | null
  }
  coreRows: {
    question_index: number; section: string; question: string
    score: number | null; evidence: string | null; gap: string | null
    capacityType: string | null; priority: string | null; suggestedSupport: string | null
  }[]
  targetRows: {
    target_num: number; indicator_index: number; indicator: string
    score: number | null; evidence: string | null; gapIdentified: string | null; capacityNeed: string | null
  }[]
  cdpRows: {
    capacity_gap: string | null; action: string | null; institution: string | null
    timeline: string | null; budget: string | null; indicator: string | null; collaboration: string | null
  }[]
}

export async function loadInstitutionAssessmentDetail(
  institutionId: string
): Promise<InstitutionAssessmentDetail | null> {
  const { data: inst } = await supabase
    .from('institutions').select('*').eq('id', institutionId).single()
  if (!inst) return null

  const { data: assessments } = await supabase
    .from('assessments').select('*').eq('institution_id', institutionId)
    .order('updated_at', { ascending: false }).limit(1)
  const assessment = assessments?.[0] ?? null
  const aid = assessment?.id ?? null

  const [
    { data: coreRows },
    { data: targetRows },
    { data: cdpRows },
  ] = await Promise.all([
    aid ? supabase.from('core_responses').select('*').eq('assessment_id', aid).order('question_index')
        : Promise.resolve({ data: [] }),
    aid ? supabase.from('target_responses').select('*').eq('assessment_id', aid).order('target_num').order('indicator_index')
        : Promise.resolve({ data: [] }),
    aid ? supabase.from('cdp_actions').select('*').eq('assessment_id', aid).order('id')
        : Promise.resolve({ data: [] }),
  ])

  // Build dim scores
  const dimScores: Record<string, number | null> = {}
  let totalAnswered = 0
  DIMENSIONS.forEach(dim => {
    const qIdxs = CORE_QUESTIONS.map((q,i)=>({q,i})).filter(({q})=>q.section===dim).map(({i})=>i)
    const rows   = (coreRows??[]).filter(r => qIdxs.includes(r.question_index) && r.score !== null && r.score !== -1)
    totalAnswered += rows.length
    dimScores[dim] = rows.length > 0 ? rows.reduce((s,r)=>s+(r.score??0),0)/rows.length : null
  })
  const validDims = Object.values(dimScores).filter((v): v is number => v !== null)
  const overallScore = validDims.length > 0 ? validDims.reduce((a,b)=>a+b,0)/validDims.length : null

  const targetScores: Record<number, number | null> = {}
  KMGBF_TARGETS.forEach(t => {
    const rows = (targetRows??[]).filter(r => r.target_num===t.num && r.score!==null && r.score!==-1)
    targetScores[t.num] = rows.length > 0 ? rows.reduce((s,r)=>s+(r.score??0),0)/rows.length : null
  })

  return {
    institution: { id: inst.id, name: inst.name, type: inst.type, level: inst.level },
    assessment: assessment ? { id: assessment.id, assess_date: assessment.assess_date, status: assessment.status, updated_at: assessment.updated_at } : null,
    dimScores, overallScore, targetScores, answeredCount: totalAnswered,
    profile: {
      name:      inst.name,
      type:      inst.type,
      level:     inst.level,
      scope:     inst.scope ?? null,
      mandate:   inst.mandate ?? null,
      focalName: assessment?.focal_name ?? null,
      focalTitle:assessment?.focal_title ?? null,
      focalEmail:assessment?.focal_email ?? null,
      assessDate:assessment?.assess_date ?? null,
    },
    coreRows: (coreRows??[]).map(r => ({
      question_index: r.question_index,
      section:        CORE_QUESTIONS[r.question_index]?.section ?? '',
      question:       CORE_QUESTIONS[r.question_index]?.q ?? '',
      score:          r.score,
      evidence:       r.evidence,
      gap:            r.gap,
      capacityType:   r.capacity_type,
      priority:       r.priority,
      suggestedSupport: r.suggested_support,
    })),
    targetRows: (targetRows??[]).map(r => ({
      target_num:      r.target_num,
      indicator_index: r.indicator_index,
      indicator:       KMGBF_TARGETS.find(t=>t.num===r.target_num)?.indicators[r.indicator_index] ?? '',
      score:           r.score,
      evidence:        r.evidence,
      gapIdentified:   r.gap_identified,
      capacityNeed:    r.capacity_need,
    })),
    cdpRows: (cdpRows??[]).map(r => ({
      capacity_gap:  r.capacity_gap,
      action:        r.action,
      institution:   r.institution,
      timeline:      r.timeline,
      budget:        r.budget,
      indicator:     r.indicator,
      collaboration: r.collaboration,
    })),
  }
}

// ─── Load all CDP rows across all institutions ────────────────
export interface NationalCdpRow {
  institution_name:  string
  institution_id:    string
  capacity_gap:      string | null
  action:            string | null
  institution:       string | null
  timeline:          string | null
  budget_usd:        string | null
  indicator:         string | null
  collaboration:     string | null
  assessment_status: string | null
  source:            'core' | 'target'
  target_num:        number | null    // set when source = 'target'
  target_title:      string | null    // KMGBF target title
  dimension:         string | null    // dimension for core gaps
}

export async function loadNationalCdpRows(
  institutionIds?: string[]
): Promise<NationalCdpRow[]> {
  // ── Get latest assessment per institution ──────────────────
  let query = supabase
    .from('assessments')
    .select('id, institution_id, status')
    .order('updated_at', { ascending: false })
  if (institutionIds?.length) query = query.in('institution_id', institutionIds)

  const { data: assessments } = await query
  if (!assessments?.length) return []

  const latestByInst = new Map<string, { id: string; status: string }>()
  assessments.forEach(a => {
    if (!latestByInst.has(a.institution_id))
      latestByInst.set(a.institution_id, { id: a.id, status: a.status })
  })

  const assessIds  = [...latestByInst.values()].map(a => a.id)
  const instIds    = [...latestByInst.keys()]
  if (!assessIds.length) return []

  // ── Fetch CDP rows, target responses, institutions in parallel
  const [
    { data: cdpRows },
    { data: institutions },
  ] = await Promise.all([
    supabase.from('cdp_rows')
      .select('*')
      .in('assessment_id', assessIds)
      .order('assessment_id').order('sort_order'),
    supabase.from('institutions').select('id, name').in('id', instIds),
  ])

  const instMap      = new Map(institutions?.map(i => [i.id, i.name]) ?? [])
  const assessToInst = new Map<string, { instId: string; status: string }>()
  latestByInst.forEach(({ id, status }, instId) => assessToInst.set(id, { instId, status }))

  // ── Build target title map ─────────────────────────────────
  const targetTitleMap = new Map(KMGBF_TARGETS.map(t => [t.num, t.title]))

  // ── Load core_responses + priority_rows to derive dimension ──────
  const [
    { data: coreResponses },
    { data: priorityRowsData },
  ] = await Promise.all([
    supabase.from('core_responses')
      .select('assessment_id, dimension, gap, score')
      .in('assessment_id', assessIds),
    supabase.from('priority_rows')
      .select('assessment_id, capacity_gap, urgency, impact, feasibility')
      .in('assessment_id', assessIds),
  ])

  // Build multiple lookups for maximum gap → dimension coverage:
  // 1. exact gap text → dimension
  const gapToDimMap = new Map<string, string>()
  // 2. assessmentId+gap → dimension
  const assessGapToDimMap = new Map<string, string>()
  // 3. dim → lowest scoring assessment (for unresolved gaps, assign to weakest dim)
  const assessWeakestDim = new Map<string, string>()

  ;(coreResponses ?? []).forEach(r => {
    if (!r.dimension) return
    // gap text lookups
    if (r.gap?.trim()) {
      gapToDimMap.set(r.gap.trim(), r.dimension)
      assessGapToDimMap.set(`${r.assessment_id}::${r.gap.trim()}`, r.dimension)
    }
    // track weakest dimension per assessment (lowest score)
    const key = r.assessment_id
    const current = assessWeakestDim.get(key)
    if (!current && r.score !== null && r.score !== -1) {
      assessWeakestDim.set(key, r.dimension)
    }
  })

  // 4. priority_rows gap text → dimension via cross-reference with core_responses
  const priorityGapToDimMap = new Map<string, string>()
  ;(priorityRowsData ?? []).forEach(pr => {
    const dim = assessGapToDimMap.get(`${pr.assessment_id}::${pr.capacity_gap?.trim()}`)
      ?? gapToDimMap.get(pr.capacity_gap?.trim() ?? '')
    if (dim && pr.capacity_gap?.trim()) {
      priorityGapToDimMap.set(pr.capacity_gap.trim(), dim)
    }
  })

  // Auto-generated dimension-level gap labels → their dimension
  const DIMENSION_NAMES = [
    'Policy and Legal Capacity',
    'Institutional Capacity',
    'Technical Capacity',
    'Financial Capacity',
    'Coordination and Governance',
    'Knowledge and Information Management',
    'Infrastructure and Equipment',
    'Awareness and Capacity Development',
  ]
  const DIM_AUTO_MAP: Record<string, string> = {}
  DIMENSION_NAMES.forEach(d => {
    DIM_AUTO_MAP[`${d} capacity gap`] = d
    DIM_AUTO_MAP[d] = d  // exact match too
  })

  // ── Keyword map: every meaningful word/phrase that signals a dimension ──
  // Covers English keywords, French equivalents, abbreviations and partials
  const DIM_KEYWORDS: { dim: string; keywords: string[] }[] = [
    { dim: 'Policy and Legal Capacity', keywords: [
        'policy','legal','law','legislation','regulation','juridique','loi',
        'politique','réglementation','reglementation','normes','norms',
        'cadre','framework','enforcement','application','compliance',
        'legalidad','política','ley','regulación',
    ]},
    { dim: 'Institutional Capacity', keywords: [
        'institutional','institution','organis','organisational','organizational',
        'governance','structure','mandate','mandaté','capacité institutionnelle',
        'ressources humaines','human resource','staff','personnel','coordination',
        'institutionnel','institutionnelle','gestion','management','administration',
    ]},
    { dim: 'Technical Capacity', keywords: [
        'technical','technique','technisch','gis','mapping','monitoring',
        'data','données','information','assessment','évaluation','surveillance',
        'expertise','compétence','skill','formation technique','species',
        'ecosystem','biodiversity','biodiversité','conservation','restoration',
    ]},
    { dim: 'Financial Capacity', keywords: [
        'financial','finance','financier','financement','budget','funding',
        'fund','fonds','ressources financières','mobilisation','mobilization',
        'investissement','investment','cost','coût','allocation','financer',
        'económico','financiero','presupuesto',
    ]},
    { dim: 'Coordination and Governance', keywords: [
        'coordination','gouvernance','governance','stakeholder','parties prenantes',
        'collaboration','partnership','partenariat','inter-ministerial',
        'interministerial','multi-sectoral','multisectoriel','engagement',
        'consultation','concertation','dialogue','synergy','synergie',
    ]},
    { dim: 'Knowledge and Information Management', keywords: [
        'knowledge','connaissance','information',"gestion de l'information",
        'database','base de données','research','recherche','science',
        'reporting','rapport','publication','documentation','archive',
        "système d'information",'information system','indicator','indicateur',
        'suivi-évaluation','monitoring evaluation','m&e',
    ]},
    { dim: 'Infrastructure and Equipment', keywords: [
        'infrastructure','equipment','équipement','matériel','laboratory',
        'laboratoire','vehicle','véhicule','facility','installation',
        'technology','technologie','logistics','logistique','tool','outil',
        'hardware','software','logiciel','network','réseau',
    ]},
    { dim: 'Awareness and Capacity Development', keywords: [
        'awareness','sensibilisation','communication','outreach','training',
        'formation','renforcement','capacity development','renforcement des capacités',
        'education','éducation','capacity building','education','public',
        'community','communauté','media','médias','campaign','campagne',
        'sensitization','vulgarisation',
    ]},
  ]

  function fuzzyDimMatch(gap: string): string | null {
    const lower = gap.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    for (const { dim, keywords } of DIM_KEYWORDS) {
      for (const kw of keywords) {
        const kwNorm = kw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        if (lower.includes(kwNorm)) return dim
      }
    }
    return null
  }

  function resolveDimension(row: any): string | null {
    // 1. Already stored in column (treat empty string as null)
    if (row.dimension?.trim()) return row.dimension.trim()
    const gap = row.capacity_gap?.trim()
    if (!gap) return null
    // 2. Assessment-specific gap text lookup (most precise)
    const assessKey = `${row.assessment_id}::${gap}`
    if (assessGapToDimMap.has(assessKey)) return assessGapToDimMap.get(assessKey)!
    // 3. Global gap text lookup across all assessments
    if (gapToDimMap.has(gap)) return gapToDimMap.get(gap)!
    // 4. Auto-generated dimension gap label
    if (DIM_AUTO_MAP[gap]) return DIM_AUTO_MAP[gap]
    // 5. Priority rows cross-reference
    if (priorityGapToDimMap.has(gap)) return priorityGapToDimMap.get(gap)!
    // 6. Fuzzy match — if gap text mentions a dimension name
    return fuzzyDimMatch(gap)
  }

  // ── CDP rows — both core and target actions ─────────────────
  // source='core'   → core capacity CDP actions
  // source='target' → target-specific CDP actions
  // cdp_rows already has everything — no need to join other tables
  // ── Build a map of target gap labels → target number from cdp_rows ──
  // Indicator-level gaps (e.g. "cadre juridique trop vague") have no T-prefix.
  // We resolve their target_num via the source field OR the T-prefix on capacity_gap.
  // For indicator gaps saved correctly as source='target', we look up the target_num
  // from the capacity_gap label pattern OR fall back to 0.
  const cdpResults: NationalCdpRow[] = (cdpRows ?? [])
    .filter(r => r.capacity_gap?.trim()) // only filter rows with no gap at all
    .map(r => {
      const instInfo = assessToInst.get(r.assessment_id)

      // Detect target rows: source field is authoritative after the fix.
      // Also catch legacy rows via T-prefix pattern.
      const isTarget = r.source === 'target' || /^T\d+:/.test(r.capacity_gap ?? '')

      // Extract target number:
      // 1. T-prefix on capacity_gap (auto-generated label "T1: Spatial Planning — capacity gap")
      // 2. target_num column if it exists on the row
      // 3. null (indicator-level gap text — grouped under the target via source only)
      const tNumFromPrefix = parseInt((r.capacity_gap ?? '').match(/^T(\d+):/)?.[1] ?? '0') || null
      const tNum = tNumFromPrefix ?? (r.target_num && r.target_num > 0 ? r.target_num : null)

      return {
        institution_name:  instMap.get(instInfo?.instId ?? '') ?? 'Unknown',
        institution_id:    instInfo?.instId ?? '',
        capacity_gap:      r.capacity_gap,
        action:            r.action ?? '',
        institution:       r.institution,
        timeline:          r.timeline,
        budget_usd:        r.budget_usd,
        indicator:         r.indicator,
        collaboration:     r.collaboration,
        assessment_status: instInfo?.status ?? null,
        source:            isTarget ? 'target' : 'core',
        target_num:        tNum,
        target_title:      tNum ? targetTitleMap.get(tNum) ?? null : null,
        dimension:         isTarget ? null : resolveDimension(r),
      }
    })

  return cdpResults
}
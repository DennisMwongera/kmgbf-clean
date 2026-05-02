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
    { data: targetRows },
    { data: institutions },
  ] = await Promise.all([
    supabase.from('cdp_rows')
      .select('*')
      .in('assessment_id', assessIds)
      .order('assessment_id').order('sort_order'),
    supabase.from('target_responses')
      .select('assessment_id, target_num, indicator_index, score, gap_identified, capacity_need')
      .in('assessment_id', assessIds)
      .not('gap_identified', 'is', null)
      .neq('score', -1),
    supabase.from('institutions').select('id, name').in('id', instIds),
  ])

  const instMap      = new Map(institutions?.map(i => [i.id, i.name]) ?? [])
  const assessToInst = new Map<string, { instId: string; status: string }>()
  latestByInst.forEach(({ id, status }, instId) => assessToInst.set(id, { instId, status }))

  // ── Build target title map ─────────────────────────────────
  const targetTitleMap = new Map(KMGBF_TARGETS.map(t => [t.num, t.title]))

  // ── CDP rows (source = core or target) ────────────────────
  const cdpResults: NationalCdpRow[] = (cdpRows ?? [])
    .filter(r => r.action?.trim())  // only show rows where an action has been planned
    .map(r => {
      const instInfo = assessToInst.get(r.assessment_id)
      const tNum     = r.source === 'target' ? parseInt(r.capacity_gap?.match(/^T(\d+):/)?.[1] ?? '0') || null : null
      return {
        institution_name:  instMap.get(instInfo?.instId ?? '') ?? 'Unknown',
        institution_id:    instInfo?.instId ?? '',
        capacity_gap:      r.capacity_gap,
        action:            r.action,
        institution:       r.institution,
        timeline:          r.timeline,
        budget_usd:        r.budget_usd,
        indicator:         r.indicator,
        collaboration:     r.collaboration,
        assessment_status: instInfo?.status ?? null,
        source:            (r.source ?? 'core') as 'core' | 'target',
        target_num:        tNum,
        target_title:      tNum ? targetTitleMap.get(tNum) ?? null : null,
        dimension:         r.dimension ?? null,
      }
    })

  // ── Target response gaps (indicator-level gaps from target assessment)
  // These are gaps identified in target_responses.gap_identified
  // Group by institution + target to avoid duplicating the same gap
  const targetGapResults: NationalCdpRow[] = []
  const seen = new Set<string>()

  ;(targetRows ?? [])
    .filter(r => r.gap_identified?.trim() && r.score !== null && r.score !== -1)
    .forEach(r => {
      const instInfo = assessToInst.get(r.assessment_id)
      const key      = `${r.assessment_id}-T${r.target_num}-${r.gap_identified}`
      if (seen.has(key)) return
      seen.add(key)
      const tTitle = targetTitleMap.get(r.target_num) ?? null
      targetGapResults.push({
        institution_name:  instMap.get(instInfo?.instId ?? '') ?? 'Unknown',
        institution_id:    instInfo?.instId ?? '',
        capacity_gap:      r.gap_identified,
        action:            null,  // no action planned yet at national level
        institution:       null,
        timeline:          null,
        budget_usd:        null,
        indicator:         r.capacity_need ?? null,
        collaboration:     null,
        assessment_status: instInfo?.status ?? null,
        source:            'target',
        target_num:        r.target_num,
        target_title:      tTitle,
        dimension:         null,
      })
    })

  return [...cdpResults, ...targetGapResults]
}
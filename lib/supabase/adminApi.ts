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
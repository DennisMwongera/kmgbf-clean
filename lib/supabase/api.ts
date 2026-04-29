// 'use client'
// import { supabase } from './client'
// import { makeAssessment } from '@/lib/utils'
// import type { Assessment, CoreRow, TargetRow, PriorityRow, CdpRow } from '@/lib/constants'
// import { CORE_QUESTIONS } from '@/lib/constants'

// // ─── Load the latest assessment for an institution ────────────
// // Reconstructs the full Assessment object from all DB sub-tables
// export async function loadInstitutionAssessment(institutionId: string): Promise<Assessment | null> {
//   // 1. Get institution profile details
//   const { data: inst } = await supabase
//     .from('institutions')
//     .select('*')
//     .eq('id', institutionId)
//     .single()

//   if (!inst) return null

//   // 2. Get latest assessment for this institution
//   const { data: assessment } = await supabase
//     .from('assessments')
//     .select('*')
//     .eq('institution_id', institutionId)
//     .order('updated_at', { ascending: false })
//     .limit(1)
//     .single()

//   // Start with a blank assessment pre-filled with institution profile
//   const blank = makeAssessment()
//   blank.profile = {
//     name:       inst.name        ?? '',
//     type:       inst.type        ?? '',
//     level:      inst.level       ?? '',
//     mandate:    inst.mandate     ?? '',
//     scope:      inst.scope       ?? '',
//     focalName:  inst.focal_name  ?? '',
//     focalTitle: inst.focal_title ?? '',
//     focalEmail: inst.focal_email ?? '',
//     assessDate: assessment?.assess_date ?? new Date().toISOString().slice(0, 10),
//   }

//   // No assessment saved yet — return blank with profile prefilled
//   if (!assessment) return blank

//   blank.id = assessment.id

//   // 3. Load core responses
//   const { data: coreRows } = await supabase
//     .from('core_responses')
//     .select('*')
//     .eq('assessment_id', assessment.id)
//     .order('question_index')

//   if (coreRows?.length) {
//     coreRows.forEach(row => {
//       blank.coreRows[row.question_index] = {
//         score:            row.score,
//         evidence:         row.evidence          ?? '',
//         gap:              row.gap               ?? '',
//         capacityType:     row.capacity_type     ?? '',
//         priority:         row.priority          ?? '',
//         suggestedSupport: row.suggested_support ?? '',
//       }
//     })
//   }

//   // 4. Load target responses
//   const { data: targetRows } = await supabase
//     .from('target_responses')
//     .select('*')
//     .eq('assessment_id', assessment.id)

//   if (targetRows?.length) {
//     targetRows.forEach(row => {
//       const key = `t${row.target_num}_${row.indicator_index}`
//       blank.targetRows[key] = {
//         score:         row.score,
//         evidence:      row.evidence       ?? '',
//         gapIdentified: row.gap_identified ?? '',
//         capacityNeed:  row.capacity_need  ?? '',
//       }
//     })
//   }

//   // 5. Load required scores
//   const { data: requiredRows } = await supabase
//     .from('assessment_required_scores')
//     .select('*')
//     .eq('assessment_id', assessment.id)

//   if (requiredRows?.length) {
//     requiredRows.forEach(row => {
//       blank.required[row.dimension] = row.required_score
//     })
//   }

//   // 6. Load priority rows
//   const { data: priorityRows } = await supabase
//     .from('priority_rows')
//     .select('*')
//     .eq('assessment_id', assessment.id)
//     .order('sort_order')

//   if (priorityRows?.length) {
//     blank.priorityRows = priorityRows.map(r => ({
//       capacityGap:  r.capacity_gap  ?? '',
//       urgency:      r.urgency,
//       impact:       r.impact,
//       feasibility:  r.feasibility,
//     }))
//   }

//   // 7. Load CDP rows
//   const { data: cdpRows } = await supabase
//     .from('cdp_rows')
//     .select('*')
//     .eq('assessment_id', assessment.id)
//     .order('sort_order')

//   if (cdpRows?.length) {
//     blank.cdpRows = cdpRows.map(r => ({
//       capacityGap:   r.capacity_gap   ?? '',
//       action:        r.action         ?? '',
//       institution:   r.institution    ?? '',
//       timeline:      r.timeline       ?? '',
//       budget:        r.budget_usd     ?? '',
//       indicator:     r.indicator      ?? '',
//       collaboration: r.collaboration  ?? '',
//     }))
//   }

//   return blank
// }

'use client'
import { supabase } from './client'
import { makeAssessment } from '@/lib/utils'
import type { Assessment, CoreRow, TargetRow, PriorityRow, CdpRow } from '@/lib/constants'
import { CORE_QUESTIONS } from '@/lib/constants'

// ─── Load the latest assessment for an institution ────────────
// Reconstructs the full Assessment object from all DB sub-tables
export async function loadInstitutionAssessment(institutionId: string): Promise<Assessment | null> {
  // 1. Get institution profile details
  const { data: inst } = await supabase
    .from('institutions')
    .select('*')
    .eq('id', institutionId)
    .single()

  if (!inst) return null

  // 2. Get latest assessment for this institution
  const { data: assessment } = await supabase
    .from('assessments')
    .select('*')
    .eq('institution_id', institutionId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  // Start with a blank assessment pre-filled with institution profile
  const blank = makeAssessment()
  blank.profile = {
    name:       inst.name        ?? '',
    type:       inst.type        ?? '',
    level:      inst.level       ?? '',
    mandate:    inst.mandate     ?? '',
    scope:      inst.scope       ?? '',
    focalName:  inst.focal_name  ?? '',
    focalTitle: inst.focal_title ?? '',
    focalEmail: inst.focal_email ?? '',
    assessDate: assessment?.assess_date ?? new Date().toISOString().slice(0, 10),
  }

  // No assessment saved yet — return blank with profile prefilled
  if (!assessment) return blank

  blank.id = assessment.id

  // 3. Load core responses
  const { data: coreRows } = await supabase
    .from('core_responses')
    .select('*')
    .eq('assessment_id', assessment.id)
    .order('question_index')

  if (coreRows?.length) {
    // Always derive capacity type from section — fixes any stale DB values
    const SECTION_TYPE: Record<string, string> = {
      'Policy and Legal Capacity':            'Policy',
      'Institutional Capacity':               'Institutional',
      'Technical Capacity':                   'Technical',
      'Financial Capacity':                   'Financial',
      'Coordination and Governance':          'Coordination',
      'Knowledge and Information Management': 'Knowledge',
      'Infrastructure and Equipment':         'Infrastructure',
      'Awareness and Capacity Development':   'Awareness',
    }
    coreRows.forEach(row => {
      const section = CORE_QUESTIONS[row.question_index]?.section ?? ''
      const correctType = SECTION_TYPE[section] ?? row.capacity_type ?? ''
      blank.coreRows[row.question_index] = {
        score:            row.score,
        evidence:         row.evidence          ?? '',
        gap:              row.gap               ?? '',
        capacityType:     correctType,
        priority:         row.priority          ?? '',
        suggestedSupport: row.suggested_support ?? '',
      }
    })
  }

  // 4. Load target responses
  const { data: targetRows } = await supabase
    .from('target_responses')
    .select('*')
    .eq('assessment_id', assessment.id)

  if (targetRows?.length) {
    targetRows.forEach(row => {
      const key = `t${row.target_num}_${row.indicator_index}`
      blank.targetRows[key] = {
        score:         row.score,
        evidence:      row.evidence       ?? '',
        gapIdentified: row.gap_identified ?? '',
        capacityNeed:  row.capacity_need  ?? '',
      }
    })
  }

  // 5. Load required scores
  const { data: requiredRows } = await supabase
    .from('assessment_required_scores')
    .select('*')
    .eq('assessment_id', assessment.id)

  if (requiredRows?.length) {
    requiredRows.forEach(row => {
      blank.required[row.dimension] = row.required_score
    })
  }

  // 6. Load priority rows
  const { data: priorityRows } = await supabase
    .from('priority_rows')
    .select('*')
    .eq('assessment_id', assessment.id)
    .order('sort_order')

  if (priorityRows?.length) {
    blank.priorityRows = priorityRows.map(r => ({
      capacityGap:  r.capacity_gap  ?? '',
      urgency:      r.urgency,
      impact:       r.impact,
      feasibility:  r.feasibility,
    }))
  }

  // 7. Load CDP rows
  const { data: cdpRows } = await supabase
    .from('cdp_rows')
    .select('*')
    .eq('assessment_id', assessment.id)
    .order('sort_order')

  if (cdpRows?.length) {
    blank.cdpRows = cdpRows.map(r => ({
      capacityGap:   r.capacity_gap   ?? '',
      action:        r.action         ?? '',
      institution:   r.institution    ?? '',
      timeline:      r.timeline       ?? '',
      budget:        r.budget_usd     ?? '',
      indicator:     r.indicator      ?? '',
      collaboration: r.collaboration  ?? '',
    }))
  }

  return blank
}
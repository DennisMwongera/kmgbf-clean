'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { type Page } from '@/lib/constants'
import { supabase } from '@/lib/supabase/client'
import { loadInstitutionAssessment } from '@/lib/supabase/api'
import Sidebar from './Sidebar'
import IdleTimeout from './IdleTimeout'
import ConflictBanner from './ConflictBanner'
import AssessmentStatusBar from './AssessmentStatusBar'
import Topbar from './Topbar'
import DashboardPage  from './pages/DashboardPage'
import ProfilePage    from './pages/ProfilePage'
import CorePage       from './pages/CorePage'
import TargetsPage    from './pages/TargetsPage'
import GapsPage       from './pages/GapsPage'
import PriorityPage   from './pages/PriorityPage'
import CdpPage        from './pages/CdpPage'
import ReportPage     from './pages/ReportPage'
import TeamPage       from './pages/TeamPage'
import MyTargetsPage  from './pages/MyTargetsPage'

const PAGES: Record<Page, React.ComponentType> = {
  dashboard: DashboardPage,
  profile:   ProfilePage,
  core:      CorePage,
  targets:   TargetsPage,
  gaps:      GapsPage,
  priority:  PriorityPage,
  cdp:       CdpPage,
  report:    ReportPage,
  team:      TeamPage,
  myTargets: MyTargetsPage,
}

export default function AppShell() {
  const { activePage, setUser, setAssessment, notification } = useStore()
  const [showExport,  setShowExport]  = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const Page = PAGES[activePage] ?? DashboardPage

  useEffect(() => {
    // Get current user safely (no refresh loop) — your pattern preserved
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setUser(null)
        window.location.href = '/auth'
        return
      }

      // Load user profile (role + institution_id)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) setUser(profile as any)

      // ── Institution isolation check ───────────────────────
      // Validate stored assessment belongs to this user's institution
      // If not (e.g. shared device, role change), wipe localStorage
      let localAssessment: any = null
      try {
        const stored = JSON.parse(localStorage.getItem('kmgbf-v2') ?? '{}')
        const storedId = stored?.state?.assessment?.id

        if (!profile?.institution_id) {
          // Admin with no institution — clear localStorage, never show institution data
          localStorage.removeItem('kmgbf-v2')
        } else if (storedId) {
          const { data: assessCheck } = await supabase
            .from('assessments')
            .select('institution_id')
            .eq('id', storedId)
            .single()
          if (assessCheck && assessCheck.institution_id !== profile.institution_id) {
            // Wrong institution — wipe
            localStorage.removeItem('kmgbf-v2')
          } else {
            // Same institution — preserve local data for merge
            localAssessment = stored?.state?.assessment
          }
        } else if (stored?.state?.assessment) {
          // No saved ID yet (never saved to DB) but has local data — keep it
          localAssessment = stored?.state?.assessment
        }
      } catch { localStorage.removeItem('kmgbf-v2') }

      // ── Load from DB and merge with local unsaved work ─────
      if (!profile?.institution_id) {
        const { makeAssessment } = await import('@/lib/utils')
        setAssessment(makeAssessment())
      } else {
        const dbAssessment = await loadInstitutionAssessment(profile.institution_id)
        if (dbAssessment) {
          if (!localAssessment) {
            // No local data — use DB directly
            setAssessment(dbAssessment)
            // Store base snapshot for three-way merge
            localStorage.setItem('kmgbf-base-snapshot', JSON.stringify(dbAssessment))
          } else {
            // Merge: DB wins for fields that are saved, local wins for unsaved edits
            // We detect unsaved edits by comparing local vs DB row by row
            const mergedCoreRows = dbAssessment.coreRows.map((dbRow: any, i: number) => {
              const localRow = localAssessment.coreRows?.[i]
              if (!localRow) return dbRow
              // If local has data but DB row is blank, local may be unsaved — keep local
              const dbHasScore   = dbRow.score !== null && dbRow.score !== undefined
              const localHasScore = localRow.score !== null && localRow.score !== undefined
              // If both have a score, DB wins (it was saved)
              // If only local has a score, it may be unsaved — keep local
              if (!dbHasScore && localHasScore) return localRow
              // If DB has data, it wins — it was persisted
              return dbRow
            })

            const mergedTargetRows = { ...localAssessment.targetRows, ...dbAssessment.targetRows }

            const mergedPriorityRows = dbAssessment.priorityRows?.length > 0
              ? dbAssessment.priorityRows
              : (localAssessment.priorityRows ?? [])

            const mergedCdpRows = dbAssessment.cdpRows?.length > 0
              ? dbAssessment.cdpRows
              : (localAssessment.cdpRows ?? [])

            setAssessment({
              ...dbAssessment,
              coreRows:     mergedCoreRows,
              targetRows:   mergedTargetRows,
              priorityRows: mergedPriorityRows,
              cdpRows:      mergedCdpRows,
            })
          }
        } else if (localAssessment) {
          // DB has no assessment yet — use local (first-time user who hasn't saved)
          setAssessment(localAssessment)
        }
      }

      // ── Restore idle-timeout backup if available ───────────
      // When idle timeout fires, we save a backup before clearing localStorage
      // Restore it on next sign-in for the same user
      try {
        const idleBackup = localStorage.getItem('kmgbf-idle-backup')
        if (idleBackup && profile?.institution_id) {
          const parsed = JSON.parse(idleBackup)
          const backupAssessId = parsed?.state?.assessment?.id
          if (backupAssessId) {
            const { data: bc } = await supabase
              .from('assessments')
              .select('institution_id')
              .eq('id', backupAssessId)
              .single()
            if (bc?.institution_id === profile.institution_id) {
              // Same institution — offer to restore via conflict backup mechanism
              const backupAssessment = parsed?.state?.assessment
              if (backupAssessment) {
                localStorage.setItem('kmgbf-conflict-backup', JSON.stringify({
                  savedAt: new Date().toISOString(),
                  assessment: backupAssessment,
                  source: 'idle-timeout',
                }))
              }
            }
          }
          localStorage.removeItem('kmgbf-idle-backup')
        }
      } catch { localStorage.removeItem('kmgbf-idle-backup') }

      setDataLoading(false)
    })

    // Listen for sign-out from another tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        window.location.href = '/auth'
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f6f3ee' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-forest-200 border-t-forest-500 rounded-full animate-spin"/>
          <span className="text-[13px] text-forest-400">Loading your institution data…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar onExport={() => setShowExport(true)} />

      <div className="flex flex-col flex-1" style={{ marginLeft: 'var(--sidebar-w)' }}>
        <Topbar />
        <main className="flex-1 px-8 py-6">
          <AssessmentStatusBar/>
          <Page key={activePage} />
        </main>
      </div>

      {/* Toast notification */}
      {notification.show && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-[13px] font-medium text-white slide-up"
          style={{ background: '#1b4332', boxShadow: '0 8px 32px rgba(15,45,28,.25)' }}>
          ✅ {notification.msg}
        </div>
      )}

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      <IdleTimeout/>
      <ConflictBanner/>
    </div>
  )
}

// ─── Export Modal ─────────────────────────────────────────────
function ExportModal({ onClose }: { onClose: () => void }) {
  const { assessment } = useStore()

  async function doExport(fmt: string) {
    const { getDimScores, getTargetAvg, interpret } = await import('@/lib/utils')
    const { DIMENSIONS, CORE_QUESTIONS, KMGBF_TARGETS } = await import('@/lib/constants')
    const scores   = getDimScores(assessment)
    const p        = assessment.profile
    const instName = slug(p.name)
    const date     = new Date().toISOString().slice(0,10)

    if (fmt === 'json') {
      const blob = new Blob([JSON.stringify(assessment, null, 2)], { type: 'application/json' })
      dl(blob, `KMGBF_CNA_${instName}.json`)
    }

    if (fmt === 'csv') {
      // CSV exports all tabs as separate downloads (one per sheet)
      const csvRows = (rows: any[][]) =>
        rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')).join('\n')

      // Sheet 1: Profile
      dl(new Blob([csvRows([
        ['Field','Value'],
        ['Institution Name', p.name], ['Type', p.type], ['Level', p.level],
        ['Geographic Scope', p.scope], ['Biodiversity Mandate', p.mandate],
        ['Focal Point Name', p.focalName], ['Focal Point Title', p.focalTitle],
        ['Focal Point Email', p.focalEmail], ['Assessment Date', p.assessDate],
      ])], { type:'text/csv' }), `${instName}_1_Profile_${date}.csv`)

      // Sheet 2: Core Assessment (all 50)
      dl(new Blob([csvRows([
        ['#','Section','Indicator','Score','Evidence','Gap Identified','Capacity Type','Priority','Suggested Support'],
        ...assessment.coreRows.map((r,i) => [
          i+1, CORE_QUESTIONS[i].section, CORE_QUESTIONS[i].q,
          r.score??'', r.evidence??'', r.gap??'',
          r.capacityType??'', r.priority??'', r.suggestedSupport??'',
        ]),
      ])], { type:'text/csv' }), `${instName}_2_CoreAssessment_${date}.csv`)

      // Sheet 3: Target Assessment (all 23 × indicators)
      const targetRows: any[][] = [['Target #','Target Title','Indicator #','Indicator','Score','Evidence','Gap Identified','Capacity Need']]
      KMGBF_TARGETS.forEach(t => {
        t.indicators.forEach((ind, i) => {
          const r = assessment.targetRows[`t${t.num}_${i}`]
          targetRows.push([t.num, t.title, i+1, ind, r?.score??'', r?.evidence??'', r?.gapIdentified??'', r?.capacityNeed??''])
        })
      })
      dl(new Blob([csvRows(targetRows)], { type:'text/csv' }), `${instName}_3_TargetAssessment_${date}.csv`)

      // Sheet 4: Gap Analysis
      dl(new Blob([csvRows([
        ['Dimension','Current Score','Required Score','Gap','Priority','Interpretation'],
        ...DIMENSIONS.map(d => {
          const s = scores[d]; const req = assessment.required[d]; const gap = s !== null ? s - req : null
          return [d, s?.toFixed(2)??'', req, gap?.toFixed(2)??'', gap!==null&&gap<0?'Gap':'Met', interpret(s)]
        }),
      ])], { type:'text/csv' }), `${instName}_4_GapAnalysis_${date}.csv`)

      // Sheet 5: Prioritization
      dl(new Blob([csvRows([
        ['Capacity Gap','Dimension','Urgency','Impact','Feasibility','Priority Score'],
        ...assessment.priorityRows.map(r => [
          r.capacityGap, '', r.urgency, r.impact, r.feasibility,
          ((r.urgency * r.impact * r.feasibility) / 5).toFixed(1),
        ]),
      ])], { type:'text/csv' }), `${instName}_5_Prioritization_${date}.csv`)

      // Sheet 6: Capacity Development Plan
      dl(new Blob([csvRows([
        ['Capacity Gap','Recommended Action','Responsible Institution','Timeline','Budget (USD)','Progress Indicator','Collaboration'],
        ...assessment.cdpRows.map(r => [r.capacityGap, r.action, r.institution, r.timeline, r.budget, r.indicator, r.collaboration]),
      ])], { type:'text/csv' }), `${instName}_6_DevelopmentPlan_${date}.csv`)
    }

    if (fmt === 'xlsx') {
      const XLSX = await import('xlsx')
      const wb   = XLSX.utils.book_new()

      // ── Sheet 1: Institutional Profile ─────────────────────
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['KMGBF Capacity Needs Assessment'],
        ['Institutional Profile'],
        [],
        ['Field', 'Value'],
        ['Institution Name',    p.name       ?? ''],
        ['Type',               p.type        ?? ''],
        ['Level',              p.level       ?? ''],
        ['Geographic Scope',   p.scope       ?? ''],
        ['Biodiversity Mandate', p.mandate   ?? ''],
        [],
        ['Contact Details'],
        ['Focal Point Name',   p.focalName   ?? ''],
        ['Focal Point Title',  p.focalTitle  ?? ''],
        ['Focal Point Email',  p.focalEmail  ?? ''],
        ['Assessment Date',    p.assessDate  ?? ''],
      ]), 'Institutional_Profile')

      // ── Sheet 2: Core Capacity Assessment (all 50) ─────────
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Core Capacity Assessment — 50 Indicators across 8 Dimensions'],
        [],
        ['#', 'Dimension', 'Capacity Indicator', 'Score (0–5)', 'Evidence', 'Gap Identified', 'Capacity Type', 'Priority', 'Suggested Support'],
        ...assessment.coreRows.map((r, i) => [
          i + 1,
          CORE_QUESTIONS[i].section,
          CORE_QUESTIONS[i].q,
          r.score ?? '',
          r.evidence         ?? '',
          r.gap              ?? '',
          r.capacityType     ?? '',
          r.priority         ?? '',
          r.suggestedSupport ?? '',
        ]),
      ]), 'Core_Assessment')

      // ── Sheet 3: Target-Specific Assessment (all 23 × indicators) ──
      const targetData: any[][] = [
        ['KMGBF Target-Specific Assessment — 23 Targets'],
        [],
        ['Target #', 'Target Title', 'Target Description', 'Indicator #', 'Capacity Indicator', 'Score (0–5)', 'Evidence', 'Gap Identified', 'Capacity Need'],
      ]
      KMGBF_TARGETS.forEach(t => {
        t.indicators.forEach((ind, i) => {
          const r = assessment.targetRows[`t${t.num}_${i}`]
          targetData.push([
            t.num, t.title,
            i === 0 ? t.desc : '',   // only show desc on first indicator row
            i + 1, ind,
            r?.score        ?? '',
            r?.evidence     ?? '',
            r?.gapIdentified ?? '',
            r?.capacityNeed  ?? '',
          ])
        })
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(targetData), 'Target_Assessment')

      // ── Sheet 4: Gap Analysis ───────────────────────────────
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Capacity Gap Analysis'],
        [],
        ['Dimension / Capacity Area', 'Current Score', 'Required Score', 'Gap', 'Status', 'Interpretation'],
        ...DIMENSIONS.map(d => {
          const s = scores[d]; const req = assessment.required[d]
          const gap = s !== null ? s - req : null
          return [
            d,
            s?.toFixed(2) ?? 'Not scored',
            req,
            gap?.toFixed(2) ?? '',
            gap === null ? 'Not scored' : gap >= 0 ? 'Met' : 'Gap',
            interpret(s),
          ]
        }),
        [],
        ['Overall Score', getDimScores(assessment) ? Object.values(scores).filter(v=>v!==null).length > 0 ? (Object.values(scores).filter(v=>v!==null) as number[]).reduce((a,b)=>a+b,0) / Object.values(scores).filter(v=>v!==null).length : '' : ''],
      ]), 'Gap_Analysis')

      // ── Sheet 5: Prioritization ─────────────────────────────
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Capacity Needs Prioritization'],
        ['Priority Score = (Urgency × Impact × Feasibility) / 5'],
        [],
        ['Capacity Gap', 'Urgency (1–5)', 'Impact (1–5)', 'Feasibility (1–5)', 'Priority Score', 'Priority Level'],
        ...assessment.priorityRows
          .map(r => ({
            ...r,
            score: (r.urgency * r.impact * r.feasibility) / 5,
          }))
          .sort((a, b) => b.score - a.score)
          .map((r, rank) => [
            r.capacityGap,
            r.urgency,
            r.impact,
            r.feasibility,
            r.score.toFixed(1),
            r.score >= 10 ? 'High' : r.score >= 5 ? 'Medium' : 'Low',
          ]),
      ]), 'Prioritization')

      // ── Sheet 6: Capacity Development Plan ─────────────────
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Capacity Development Plan'],
        [],
        ['Capacity Gap', 'Recommended Action', 'Responsible Institution', 'Timeline', 'Budget (USD)', 'Progress Indicator', 'Collaboration Opportunities'],
        ...assessment.cdpRows
          .filter(r => r.capacityGap || r.action)
          .map(r => [
            r.capacityGap,
            r.action,
            r.institution,
            r.timeline,
            r.budget,
            r.indicator,
            r.collaboration,
          ]),
      ]), 'Development_Plan')

      XLSX.writeFile(wb, `KMGBF_CNA_${instName}_${date}.xlsx`)
    }

    if (fmt === 'pdf') {
      onClose()
      setTimeout(() => window.print(), 300)
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl p-7 w-[460px]" style={{ boxShadow:'0 20px 60px rgba(15,45,28,.25)' }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:'#0f2d1c', marginBottom:6 }}>Export Data</h3>
        <p className="text-[13px] text-forest-400 mb-5">Download your assessment in any format.</p>
        {[
          { fmt:'xlsx', icon:'📊', label:'Excel (.xlsx)', sub:'6 sheets — matches original CNA tool' },
          { fmt:'json', icon:'📦', label:'JSON',          sub:'Full raw assessment data' },
          { fmt:'csv',  icon:'📋', label:'CSV',           sub:'Dimension scores summary' },
          { fmt:'pdf',  icon:'🖨️', label:'PDF / Print',   sub:'Print-friendly report' },
        ].map(({ fmt, icon, label, sub }) => (
          <button key={fmt} onClick={() => doExport(fmt)}
            className="w-full flex items-center gap-3 px-4 py-3.5 mb-2 rounded-xl text-left border border-sand-300 hover:bg-forest-50 hover:border-forest-200 transition-colors"
            style={{ background:'#f6f3ee' }}>
            <span className="text-xl">{icon}</span>
            <div>
              <div className="text-[13px] font-semibold text-forest-700">{label}</div>
              <div className="text-[11px] text-forest-400">{sub}</div>
            </div>
          </button>
        ))}
        <div className="flex justify-end mt-4">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function dl(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
}
function slug(s: string) { return (s||'Assessment').replace(/[^a-zA-Z0-9]/g,'_').slice(0,30) }
'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { type Page } from '@/lib/constants'
import { supabase } from '@/lib/supabase/client'
import { loadInstitutionAssessment } from '@/lib/supabase/api'
import Sidebar from './Sidebar'
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

      // Auto-load institution's assessment so all team members see the same data
      if (profile?.institution_id) {
        const assessment = await loadInstitutionAssessment(profile.institution_id)
        if (assessment) setAssessment(assessment)
      }

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
    </div>
  )
}

// ─── Export Modal ─────────────────────────────────────────────
function ExportModal({ onClose }: { onClose: () => void }) {
  const { assessment } = useStore()

  async function doExport(fmt: string) {
    if (fmt === 'json') {
      const blob = new Blob([JSON.stringify(assessment, null, 2)], { type: 'application/json' })
      dl(blob, `KMGBF_CNA_${slug(assessment.profile.name)}.json`)
    }
    if (fmt === 'csv') {
      const { getDimScores, interpret } = await import('@/lib/utils')
      const { DIMENSIONS } = await import('@/lib/constants')
      const scores = getDimScores(assessment)
      const rows = [['Dimension','Score','Required','Gap','Interpretation']]
      DIMENSIONS.forEach(d => {
        const s = scores[d]
        rows.push([d, s != null ? s.toFixed(2) : '', String(assessment.required[d]),
          s != null ? (s - assessment.required[d]).toFixed(2) : '', interpret(s)])
      })
      dl(new Blob([rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')], { type:'text/csv' }),
        `KMGBF_CNA_${slug(assessment.profile.name)}.csv`)
    }
    if (fmt === 'xlsx') {
      const XLSX = await import('xlsx')
      const { getDimScores } = await import('@/lib/utils')
      const { DIMENSIONS, CORE_QUESTIONS } = await import('@/lib/constants')
      const wb = XLSX.utils.book_new()
      const scores = getDimScores(assessment)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Institution', assessment.profile.name],
        ['Level', assessment.profile.level],
        ['Date', assessment.profile.assessDate],
      ]), 'Profile')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Section','Question','Score','Evidence','Gap','Capacity Type','Priority','Suggested Support'],
        ...assessment.coreRows.map((r,i) => [CORE_QUESTIONS[i].section, CORE_QUESTIONS[i].q, r.score??'', r.evidence, r.gap, r.capacityType, r.priority, r.suggestedSupport])
      ]), 'Core_Assessment')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Dimension','Score','Required','Gap'],
        ...DIMENSIONS.map(d => { const s=scores[d]; return [d, s??'', assessment.required[d], s!=null?(s-assessment.required[d]).toFixed(2):'']; })
      ]), 'Gap_Analysis')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Capacity Gap','Action','Institution','Timeline','Budget','Indicator','Collaboration'],
        ...assessment.cdpRows.map(r => [r.capacityGap,r.action,r.institution,r.timeline,r.budget,r.indicator,r.collaboration])
      ]), 'Development_Plan')
      XLSX.writeFile(wb, `KMGBF_CNA_${slug(assessment.profile.name)}.xlsx`)
    }
    if (fmt === 'pdf') window.print()
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
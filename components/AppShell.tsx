// 'use client'
// import { useEffect, useState } from 'react'
// import { useStore } from '@/lib/store'
// import { type Page } from '@/lib/constants'
// import { supabase } from '@/lib/supabase/client'
// import Sidebar from './Sidebar'
// import Topbar from './Topbar'
// import DashboardPage  from './pages/DashboardPage'
// import ProfilePage    from './pages/ProfilePage'
// import CorePage       from './pages/CorePage'
// import TargetsPage    from './pages/TargetsPage'
// import GapsPage       from './pages/GapsPage'
// import PriorityPage   from './pages/PriorityPage'
// import CdpPage        from './pages/CdpPage'
// import ReportPage     from './pages/ReportPage'

// const PAGES: Record<Page, React.ComponentType> = {
//   dashboard: DashboardPage,
//   profile:   ProfilePage,
//   core:      CorePage,
//   targets:   TargetsPage,
//   gaps:      GapsPage,
//   priority:  PriorityPage,
//   cdp:       CdpPage,
//   report:    ReportPage,
// }

// export default function AppShell() {
//   // const { activePage, setUser, notification } = useStore()
//   const activePage   = useStore(s => s.activePage)
//   const setUser      = useStore(s => s.setUser)
//   const notification = useStore(s => s.notification)
//   const [showExport, setShowExport] = useState(false)
//   const Page = PAGES[activePage] ?? DashboardPage

//   // Verify session on mount and load user profile
//   useEffect(() => {
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       if (!session) {
//         setUser(null)
//         window.location.href = '/auth'
//         return
//       }
//       supabase
//         .from('user_profiles')
//         .select('*')
//         .eq('id', session.user.id)
//         .single()
//         .then(({ data }) => { if (data) setUser(data as any) })
//     })

//     // Listen for auth state changes (sign-out from another tab etc.)
//     const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
//       if (event === 'SIGNED_OUT') {
//         setUser(null)
//         window.location.href = '/auth'
//       }
//     })

//     return () => subscription.unsubscribe()
//   }, [])

//   return (
//     <div className="flex min-h-screen">
//       <Sidebar onExport={() => setShowExport(true)} />

//       <div className="flex flex-col flex-1" style={{ marginLeft: 'var(--sidebar-w)' }}>
//         <Topbar />
//         <main className="flex-1 px-8 py-6">
//           <Page />
//         </main>
//       </div>

//       {/* Toast notification */}
//       {notification.show && (
//         <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-[13px] font-medium text-white slide-up"
//           style={{ background: '#1b4332', boxShadow: '0 8px 32px rgba(15,45,28,.25)' }}>
//           ✅ {notification.msg}
//         </div>
//       )}

//       {/* Export modal */}
//       {showExport && <ExportModal onClose={() => setShowExport(false)} />}
//     </div>
//   )
// }

// // ─── Export Modal ─────────────────────────────────────────────────────────────
// function ExportModal({ onClose }: { onClose: () => void }) {
//   const { assessment } = useStore()

//   async function doExport(fmt: string) {
//     if (fmt === 'json') {
//       const blob = new Blob([JSON.stringify(assessment, null, 2)], { type: 'application/json' })
//       dl(blob, `KMGBF_CNA_${slug(assessment.profile.name)}.json`)
//     }
//     if (fmt === 'csv') {
//       const { getDimScores, interpret } = await import('@/lib/utils')
//       const { DIMENSIONS } = await import('@/lib/constants')
//       const scores = getDimScores(assessment)
//       const rows = [['Dimension','Score','Required','Gap','Interpretation']]
//       DIMENSIONS.forEach(d => {
//         const s = scores[d]
//         rows.push([d, s != null ? s.toFixed(2) : '', String(assessment.required[d]),
//           s != null ? (s - assessment.required[d]).toFixed(2) : '', interpret(s)])
//       })
//       dl(new Blob([rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')], { type:'text/csv' }),
//         `KMGBF_CNA_${slug(assessment.profile.name)}.csv`)
//     }
//     if (fmt === 'xlsx') {
//       const XLSX = await import('xlsx')
//       const { getDimScores } = await import('@/lib/utils')
//       const { DIMENSIONS, CORE_QUESTIONS } = await import('@/lib/constants')
//       const wb = XLSX.utils.book_new()
//       const scores = getDimScores(assessment)
//       XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
//         ['Institution', assessment.profile.name],
//         ['Level', assessment.profile.level],
//         ['Date', assessment.profile.assessDate],
//       ]), 'Profile')
//       XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
//         ['Section','Question','Score','Evidence','Gap','Capacity Type','Priority','Suggested Support'],
//         ...assessment.coreRows.map((r,i) => [CORE_QUESTIONS[i].section, CORE_QUESTIONS[i].q, r.score??'', r.evidence, r.gap, r.capacityType, r.priority, r.suggestedSupport])
//       ]), 'Core_Assessment')
//       XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
//         ['Dimension','Score','Required','Gap'],
//         ...DIMENSIONS.map(d => { const s=scores[d]; return [d, s??'', assessment.required[d], s!=null?(s-assessment.required[d]).toFixed(2):'']; })
//       ]), 'Gap_Analysis')
//       XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
//         ['Capacity Gap','Action','Institution','Timeline','Budget','Indicator','Collaboration'],
//         ...assessment.cdpRows.map(r => [r.capacityGap,r.action,r.institution,r.timeline,r.budget,r.indicator,r.collaboration])
//       ]), 'Development_Plan')
//       XLSX.writeFile(wb, `KMGBF_CNA_${slug(assessment.profile.name)}.xlsx`)
//     }
//     if (fmt === 'pdf') window.print()
//     onClose()
//   }

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
//       onClick={e => { if (e.target === e.currentTarget) onClose() }}>
//       <div className="bg-white rounded-2xl p-7 w-[460px]" style={{ boxShadow:'0 20px 60px rgba(15,45,28,.25)' }}>
//         <h3 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:'#0f2d1c', marginBottom:6 }}>Export Data</h3>
//         <p className="text-[13px] text-forest-400 mb-5">Download your assessment in any format.</p>
//         {[
//           { fmt:'xlsx', icon:'📊', label:'Excel (.xlsx)', sub:'6 sheets — matches original CNA tool' },
//           { fmt:'json', icon:'📦', label:'JSON',          sub:'Full raw assessment data' },
//           { fmt:'csv',  icon:'📋', label:'CSV',           sub:'Dimension scores summary' },
//           { fmt:'pdf',  icon:'🖨️', label:'PDF / Print',   sub:'Print-friendly report' },
//         ].map(({ fmt, icon, label, sub }) => (
//           <button key={fmt} onClick={() => doExport(fmt)}
//             className="w-full flex items-center gap-3 px-4 py-3.5 mb-2 rounded-xl text-left border border-sand-300 hover:bg-forest-50 hover:border-forest-200 transition-colors"
//             style={{ background:'#f6f3ee', fontFamily:'Syne, system-ui, sans-serif' }}>
//             <span className="text-xl">{icon}</span>
//             <div>
//               <div className="text-[13px] font-semibold text-forest-700">{label}</div>
//               <div className="text-[11px] text-forest-400">{sub}</div>
//             </div>
//           </button>
//         ))}
//         <div className="flex justify-end mt-4">
//           <button className="btn btn-secondary" onClick={onClose}>Close</button>
//         </div>
//       </div>
//     </div>
//   )
// }

// function dl(blob: Blob, name: string) {
//   const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
// }
// function slug(s: string) { return (s||'Assessment').replace(/[^a-zA-Z0-9]/g,'_').slice(0,30) }


'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { type Page } from '@/lib/constants'
import { supabase } from '@/lib/supabase/client'
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

const PAGES: Record<Page, React.ComponentType> = {
  dashboard: DashboardPage,
  profile:   ProfilePage,
  core:      CorePage,
  targets:   TargetsPage,
  gaps:      GapsPage,
  priority:  PriorityPage,
  cdp:       CdpPage,
  report:    ReportPage,
}

export default function AppShell() {
  // Subscribe only to what AppShell needs — prevents re-render when assessment data changes
  const activePage   = useStore(s => s.activePage)
  const setUser      = useStore(s => s.setUser)
  const notification = useStore(s => s.notification)
  const [showExport, setShowExport] = useState(false)
  const Page = PAGES[activePage] ?? DashboardPage

  // Verify session on mount and load user profile
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setUser(null)
        window.location.href = '/auth'
        return
      }
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => { if (data) setUser(data as any) })
    })

    // Listen for auth state changes (sign-out from another tab etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        window.location.href = '/auth'
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar onExport={() => setShowExport(true)} />

      <div className="flex flex-col flex-1" style={{ marginLeft: 'var(--sidebar-w)' }}>
        <Topbar />
        <main className="flex-1 px-8 py-6">
          <Page />
        </main>
      </div>

      {/* Toast notification */}
      {notification.show && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-[13px] font-medium text-white slide-up"
          style={{ background: '#1b4332', boxShadow: '0 8px 32px rgba(15,45,28,.25)' }}>
          ✅ {notification.msg}
        </div>
      )}

      {/* Export modal */}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  )
}

// ─── Export Modal ─────────────────────────────────────────────────────────────
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
            style={{ background:'#f6f3ee', fontFamily:'Syne, system-ui, sans-serif' }}>
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
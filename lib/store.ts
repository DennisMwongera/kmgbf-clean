// 'use client'
// import { create } from 'zustand'
// import { persist } from 'zustand/middleware'
// import { type Assessment, type Page, type UserProfile, DIMENSIONS, CORE_QUESTIONS } from './constants'
// import type { LangCode } from './i18n'
// import { makeAssessment, getDimScores, gapItems } from './utils'

// interface Store {
//   // Auth — never persisted
//   user: UserProfile | null
//   setUser: (u: UserProfile | null) => void

//   // Language
//   lang:    LangCode
//   setLang: (l: LangCode) => void

//   // Active assessment
//   assessment: Assessment
//   setAssessment: (a: Assessment) => void

//   // UI state
//   activePage:   Page
//   activeTarget: number
//   activeTab:    string
//   navigate:        (p: Page) => void
//   setActiveTarget: (n: number) => void
//   setActiveTab:    (t: string) => void

//   // Profile
//   updateProfile: (field: string, val: string) => void

//   // Core
//   updateCoreRow: (idx: number, field: string, val: string | number | null) => void

//   // Targets
//   updateTargetRow: (key: string, field: string, val: string | number | null) => void

//   // Gaps
//   setRequired: (dim: string, val: number) => void

//   // Priority
//   updatePriorityRow: (idx: number, field: string, val: string | number) => void
//   syncPriorityRows:  () => void

//   // CDP
//   addCdpRow:    () => void
//   removeCdpRow: (idx: number) => void
//   updateCdpRow: (idx: number, field: string, val: string) => void
//   syncCdpRows:  () => void

//   // Notification
//   notification: { msg: string; show: boolean }
//   notify: (msg: string) => void
// }

// export const useStore = create<Store>()(
//   persist(
//     (set, get) => ({
//       user:         null,
//       lang:         'en' as LangCode,
//       setLang: (l) => {
//         set({ lang: l })
//         // HtmlDir component handles applying dir/lang to <html>
//       },
//       assessment:   makeAssessment(),
//       activePage:   'dashboard',
//       activeTarget: 1,
//       activeTab:    'summary',
//       notification: { msg:'', show:false },

//       setUser:       (u)    => set({ user: u }),
//       setAssessment: (a)    => set({ assessment: a }),
//       setActiveTarget:(n)   => set({ activeTarget: n }),
//       setActiveTab:  (t)    => set({ activeTab: t }),

//       navigate: (page) => {
//         set({ activePage: page })
//         if (page === 'priority') get().syncPriorityRows()
//         if (page === 'cdp')      get().syncCdpRows()
//       },

//       updateProfile: (field, val) => set(s => ({
//         assessment: { ...s.assessment, profile: { ...s.assessment.profile, [field]: val } }
//       })),

//       updateCoreRow: (idx, field, val) => set(s => {
//         // Guard: never store NaN — treat it as null
//         const safeVal = typeof val === 'number' && isNaN(val) ? null : val
//         const rows = [...s.assessment.coreRows]
//         rows[idx] = { ...rows[idx], [field]: safeVal }
//         return { assessment: { ...s.assessment, coreRows: rows } }
//       }),

//       updateTargetRow: (key, field, val) => set(s => {
//         // Guard: never store NaN — treat it as null
//         const safeVal = typeof val === 'number' && isNaN(val) ? null : val
//         const existing = s.assessment.targetRows[key] ?? { score:null, evidence:'', gapIdentified:'', capacityNeed:'' }
//         return { assessment: { ...s.assessment, targetRows: { ...s.assessment.targetRows, [key]: { ...existing, [field]: safeVal } } } }
//       }),

//       setRequired: (dim, val) => set(s => ({
//         assessment: { ...s.assessment, required: { ...s.assessment.required, [dim]: val } }
//       })),

//       syncPriorityRows: () => {
//         const items = gapItems(get().assessment)
//         set(s => {
//           const rows = [...s.assessment.priorityRows]
//           while (rows.length < items.length) rows.push({ capacityGap: items[rows.length].label, urgency:3, impact:3, feasibility:3 })
//           return { assessment: { ...s.assessment, priorityRows: rows.slice(0, items.length) } }
//         })
//       },

//       updatePriorityRow: (idx, field, val) => set(s => {
//         const rows = [...s.assessment.priorityRows]
//         rows[idx] = { ...rows[idx], [field]: typeof val === 'number' ? Math.min(5, Math.max(1, val)) : val }
//         return { assessment: { ...s.assessment, priorityRows: rows } }
//       }),

//       syncCdpRows: () => {
//         if (get().assessment.cdpRows.length > 0) return
//         const dimScores = getDimScores(get().assessment)
//         const rows = DIMENSIONS
//           .filter(d => { const s = dimScores[d]; return s !== null && s < get().assessment.required[d] })
//           .map(d => ({ capacityGap:`${d} capacity gap`, action:'', institution:'', timeline:'', budget:'', indicator:'', collaboration:'' }))
//         if (!rows.length) rows.push({ capacityGap:'', action:'', institution:'', timeline:'', budget:'', indicator:'', collaboration:'' })
//         set(s => ({ assessment: { ...s.assessment, cdpRows: rows } }))
//       },

//       addCdpRow: () => set(s => ({
//         assessment: { ...s.assessment, cdpRows: [...s.assessment.cdpRows, { capacityGap:'', action:'', institution:'', timeline:'', budget:'', indicator:'', collaboration:'' }] }
//       })),

//       removeCdpRow: (idx) => set(s => ({
//         assessment: { ...s.assessment, cdpRows: s.assessment.cdpRows.filter((_,i) => i !== idx) }
//       })),

//       updateCdpRow: (idx, field, val) => set(s => {
//         const rows = [...s.assessment.cdpRows]
//         rows[idx] = { ...rows[idx], [field]: val }
//         return { assessment: { ...s.assessment, cdpRows: rows } }
//       }),

//       notify: (msg) => {
//         set({ notification: { msg, show:true } })
//         setTimeout(() => set(s => ({ notification: { ...s.notification, show:false } })), 3000)
//       },
//     }),
//     {
//       name: 'kmgbf-v2',
//       // user is never persisted — always re-validated from Supabase on load
//       partialize: (s) => ({
//         lang:         s.lang,
//         assessment:   s.assessment,
//         activePage:   s.activePage,
//         activeTarget: s.activeTarget,
//         activeTab:    s.activeTab,
//       }),
//     }
//   )
// )

'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type Assessment, type Page, type UserProfile, DIMENSIONS, CORE_QUESTIONS } from './constants'
import type { LangCode } from './i18n'
import { makeAssessment, getDimScores, gapItems } from './utils'

interface Store {
  // Auth — never persisted
  user: UserProfile | null
  setUser: (u: UserProfile | null) => void

  // Language
  lang:    LangCode
  setLang: (l: LangCode) => void

  // Active assessment
  assessment: Assessment
  setAssessment: (a: Assessment) => void

  // UI state
  activePage:   Page
  activeTarget: number
  activeTab:    string
  navigate:        (p: Page) => void
  setActiveTarget: (n: number) => void
  setActiveTab:    (t: string) => void

  // Profile
  updateProfile: (field: string, val: string) => void

  // Core
  updateCoreRow: (idx: number, field: string, val: string | number | null) => void

  // Targets
  updateTargetRow: (key: string, field: string, val: string | number | null) => void

  // Gaps
  setRequired: (dim: string, val: number) => void

  // Priority
  updatePriorityRow: (idx: number, field: string, val: string | number) => void
  syncPriorityRows:  () => void

  // CDP
  addCdpRow:    () => void
  removeCdpRow: (idx: number) => void
  updateCdpRow: (idx: number, field: string, val: string) => void
  syncCdpRows:  () => void

  // Notification
  notification: { msg: string; show: boolean }
  notify: (msg: string) => void
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      user:         null,
      lang:         'en' as LangCode,
      setLang: (l) => {
        set({ lang: l })
        // HtmlDir component handles applying dir/lang to <html>
      },
      assessment:   makeAssessment(),
      activePage:   'dashboard',
      activeTarget: 1,
      activeTab:    'summary',
      notification: { msg:'', show:false },

      setUser:       (u)    => set({ user: u }),
      isReadOnly:    ()     => get().user?.role === 'viewer',
      setAssessment: (a)    => set({ assessment: a }),
      setActiveTarget:(n)   => set({ activeTarget: n }),
      setActiveTab:  (t)    => set({ activeTab: t }),

      navigate: (page) => {
        set({ activePage: page })
        if (page === 'priority') get().syncPriorityRows()
        if (page === 'cdp')      get().syncCdpRows()
      },

      updateProfile: (field, val) => set(s => ({
        assessment: { ...s.assessment, profile: { ...s.assessment.profile, [field]: val } }
      })),

      updateCoreRow: (idx, field, val) => set(s => {
        // Guard: never store NaN — treat it as null
        const safeVal = typeof val === 'number' && isNaN(val) ? null : val
        const rows = [...s.assessment.coreRows]
        rows[idx] = { ...rows[idx], [field]: safeVal }
        return { assessment: { ...s.assessment, coreRows: rows } }
      }),

      updateTargetRow: (key, field, val) => set(s => {
        // Guard: never store NaN — treat it as null
        const safeVal = typeof val === 'number' && isNaN(val) ? null : val
        const existing = s.assessment.targetRows[key] ?? { score:null, evidence:'', gapIdentified:'', capacityNeed:'' }
        return { assessment: { ...s.assessment, targetRows: { ...s.assessment.targetRows, [key]: { ...existing, [field]: safeVal } } } }
      }),

      setRequired: (dim, val) => set(s => ({
        assessment: { ...s.assessment, required: { ...s.assessment.required, [dim]: val } }
      })),

      syncPriorityRows: () => {
        const items = gapItems(get().assessment)
        set(s => {
          const rows = [...s.assessment.priorityRows]
          while (rows.length < items.length) rows.push({ capacityGap: items[rows.length].label, urgency:3, impact:3, feasibility:3 })
          return { assessment: { ...s.assessment, priorityRows: rows.slice(0, items.length) } }
        })
      },

      updatePriorityRow: (idx, field, val) => set(s => {
        const rows = [...s.assessment.priorityRows]
        rows[idx] = { ...rows[idx], [field]: typeof val === 'number' ? Math.min(5, Math.max(1, val)) : val }
        return { assessment: { ...s.assessment, priorityRows: rows } }
      }),

      syncCdpRows: () => {
        if (get().assessment.cdpRows.length > 0) return
        const dimScores = getDimScores(get().assessment)
        const rows = DIMENSIONS
          .filter(d => { const s = dimScores[d]; return s !== null && s < get().assessment.required[d] })
          .map(d => ({ capacityGap:`${d} capacity gap`, action:'', institution:'', timeline:'', budget:'', indicator:'', collaboration:'' }))
        if (!rows.length) rows.push({ capacityGap:'', action:'', institution:'', timeline:'', budget:'', indicator:'', collaboration:'' })
        set(s => ({ assessment: { ...s.assessment, cdpRows: rows } }))
      },

      addCdpRow: () => set(s => ({
        assessment: { ...s.assessment, cdpRows: [...s.assessment.cdpRows, { capacityGap:'', action:'', institution:'', timeline:'', budget:'', indicator:'', collaboration:'' }] }
      })),

      removeCdpRow: (idx) => set(s => ({
        assessment: { ...s.assessment, cdpRows: s.assessment.cdpRows.filter((_,i) => i !== idx) }
      })),

      updateCdpRow: (idx, field, val) => set(s => {
        const rows = [...s.assessment.cdpRows]
        rows[idx] = { ...rows[idx], [field]: val }
        return { assessment: { ...s.assessment, cdpRows: rows } }
      }),

      notify: (msg) => {
        set({ notification: { msg, show:true } })
        setTimeout(() => set(s => ({ notification: { ...s.notification, show:false } })), 3000)
      },
    }),
    {
      name: 'kmgbf-v2',
      // user is never persisted — always re-validated from Supabase on load
      partialize: (s) => ({
        lang:         s.lang,
        assessment:   s.assessment,
        activePage:   s.activePage,
        activeTarget: s.activeTarget,
        activeTab:    s.activeTab,
      }),
    }
  )
)
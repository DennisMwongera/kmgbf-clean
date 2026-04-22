'use client'
import { useStore } from '@/lib/store'
import { type Page } from '@/lib/constants'
import { supabase } from '@/lib/supabase/client'
import { getT } from '@/lib/i18n'

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  admin:            { bg: 'rgba(220,38,38,.2)',   color: '#fca5a5' },
  institution_lead: { bg: 'rgba(251,191,36,.2)',  color: '#fcd34d' },
  contributor:      { bg: 'rgba(82,183,136,.2)',  color: '#6ee7b7' },
  viewer:           { bg: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)' },
}

interface Props { onExport: () => void }

export default function Sidebar({ onExport }: Props) {
  const { activePage, user, setUser, navigate, assessment, lang } = useStore()
  const t = getT(lang ?? 'en')

  const NAV = [
    { section: t.nav.assessment, items: [
      { page: 'dashboard' as Page, icon: '📊', label: t.nav.dashboard },
      { page: 'profile'   as Page, icon: '🏛️', label: t.nav.profile   },
      { page: 'team'      as Page, icon: '👥', label: t.nav.team ?? 'Team'     },
      ...(user?.role === 'institution_lead' || user?.role === 'admin' ? [{ page: 'myTargets' as Page, icon: '🎯', label: 'Our Targets' }] : []),
      { page: 'core'      as Page, icon: '🔍', label: t.nav.core      },
      { page: 'targets'   as Page, icon: '🎯', label: t.nav.targets   },
    ]},
    { section: t.nav.analysis, items: [
      { page: 'gaps'     as Page, icon: '📉', label: t.nav.gaps     },
      { page: 'priority' as Page, icon: '⚡', label: t.nav.priority },
    ]},
    { section: t.nav.outputs, items: [
      { page: 'cdp'    as Page, icon: '📋', label: t.nav.cdp    },
      { page: 'report' as Page, icon: '📄', label: t.nav.report },
    ]},
  ]

  async function signOut() {
    await supabase.auth.signOut()
    // Clear locally cached assessment data so it doesn't leak to the next user
    localStorage.removeItem('kmgbf-v2')
    setUser(null)
    window.location.href = '/auth'
  }

  const rc = ROLE_STYLE[user?.role ?? 'viewer']

  return (
    <aside className="fixed top-0 left-0 bottom-0 flex flex-col z-40 overflow-hidden"
      style={{ width: 'var(--sidebar-w)', background: '#0f2d1c' }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 20% 10%, rgba(64,145,108,.15) 0%, transparent 60%)' }} />

      {/* Brand */}
      <div className="relative px-5 pt-6 pb-4 border-b border-white/[0.07]">
        <span className="inline-block mb-2 px-2 py-0.5 rounded text-[9px] font-bold tracking-[2px] uppercase"
          style={{ background: 'rgba(82,183,136,.2)', color: '#95d5b2', border: '1px solid rgba(82,183,136,.25)' }}>
          CBD · KMGBF · 2030
        </span>
        <div className="text-white text-[16px] font-semibold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
          {t.nav.brand}
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: 'rgba(149,213,178,.5)' }}>
          {t.nav.subtitle}
        </div>
      </div>

      {/* User */}
      <div className="relative px-4 py-3 border-b border-white/[0.06]">
        {user ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
              style={{ background: 'rgba(82,183,136,.25)', color: '#52b788' }}>
              {(user.full_name || user.email || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-white truncate">{user.full_name || user.email}</div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block"
                style={{ background: rc.bg, color: rc.color }}>
                {user.role.replace('_', ' ')}
              </span>
            </div>
            <button onClick={signOut} title={t.nav.signOut}
              className="shrink-0 text-[11px] w-7 h-7 rounded flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)' }}>
              ⎋
            </button>
          </div>
        ) : (
          <button onClick={() => { window.location.href = '/auth' }}
            className="w-full py-1.5 rounded-lg text-[12px] font-semibold"
            style={{ background: 'rgba(82,183,136,.15)', color: '#52b788', border: '1px solid rgba(82,183,136,.3)' }}>
            {t.nav.signIn}
          </button>
        )}
      </div>

      {/* Institution */}
      {assessment.profile.name && (
        <div className="relative px-4 py-2.5 border-b border-white/[0.06]">
          <div className="text-[9px] font-bold tracking-[1.5px] uppercase mb-0.5" style={{ color: 'rgba(149,213,178,.4)' }}>
            {t.nav.institution}
          </div>
          <div className="text-[12px] text-white/70 truncate">{assessment.profile.name}</div>
        </div>
      )}

      {/* Nav */}
      <nav className="relative flex-1 py-1 overflow-y-auto">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <div className="px-5 pt-3 pb-1 text-[9px] font-bold tracking-[2px] uppercase"
              style={{ color: 'rgba(149,213,178,.4)' }}>
              {section}
            </div>
            {items.map(({ page, icon, label }) => (
              <button key={page} onClick={() => navigate(page)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium border-l-2 transition-all text-left"
                style={{
                  color:           activePage === page ? 'white' : 'rgba(255,255,255,.5)',
                  background:      activePage === page ? 'rgba(82,183,136,.12)' : 'transparent',
                  borderLeftColor: activePage === page ? '#52b788' : 'transparent',
                }}>
                <span className="text-sm w-4 text-center shrink-0">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Admin link — only visible to admins */}
      {user?.role === 'admin' && (
        <div className="relative px-4 pb-1 border-t border-white/[0.06] pt-2">
          <a href="/admin"
            className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-[12px] font-semibold transition-colors"
            style={{ background:'rgba(220,38,38,.12)', color:'#fca5a5', border:'1px solid rgba(220,38,38,.2)' }}>
            <span>⚙️</span> Admin Panel
          </a>
        </div>
      )}

      {/* Export + Footer */}
      <div className="relative px-4 py-3 border-t border-white/[0.06] space-y-2">
        <button onClick={onExport}
          className="w-full py-2 rounded-lg text-[12px] font-semibold transition-colors"
          style={{ background: 'rgba(82,183,136,.12)', color: '#52b788', border: '1px solid rgba(82,183,136,.25)' }}>
          ⬇ {t.nav.exportData}
        </button>
        <div className="text-[9.5px] text-center" style={{ color: 'rgba(255,255,255,.2)' }}>
          {t.nav.copyright}
        </div>
      </div>
    </aside>
  )
}
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LayoutDashboard, Building2, Users, BarChart2, ArrowLeft, LogOut, Globe } from 'lucide-react'

const NAV = [
  { href:'/admin',              Icon: LayoutDashboard, label:'Overview'          },
  { href:'/admin/institutions', Icon: Building2,       label:'Institutions'      },
  { href:'/admin/users',        Icon: Users,           label:'Users'             },
  { href:'/admin/reports',      Icon: BarChart2,       label:'National Reports'  },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  async function signOut() {
    // Admins rarely have unsaved assessment data but back up just in case
    try {
      const stored = localStorage.getItem('kmgbf-v2')
      if (stored) {
        const parsed = JSON.parse(stored)
        const hasData = parsed?.state?.assessment?.id ||
          parsed?.state?.assessment?.coreRows?.some((r: any) => r.score !== null)
        if (hasData) {
          localStorage.setItem('kmgbf-conflict-backup', JSON.stringify({
            savedAt:    new Date().toISOString(),
            assessment: parsed?.state?.assessment,
            source:     'sign-out',
          }))
        }
      }
    } catch {}
    await supabase.auth.signOut()
    localStorage.removeItem('kmgbf-v2')
    window.location.href = '/auth'
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#f6f3ee' }}>
      <aside className="fixed top-0 left-0 bottom-0 flex flex-col z-40 overflow-hidden"
        style={{ width: 220, background: '#0f2d1c' }}>

        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 10%, rgba(64,145,108,.15) 0%, transparent 60%)' }}/>

        {/* Brand */}
        <div className="relative px-5 pt-6 pb-4 border-b border-white/[0.07]">
          <div className="inline-block mb-1.5 px-2 py-0.5 rounded text-[9px] font-bold tracking-[2px] uppercase"
            style={{ background: 'rgba(220,38,38,.2)', color: '#fca5a5', border: '1px solid rgba(220,38,38,.3)' }}>
            Admin Panel
          </div>
          <div className="text-white text-[15px] font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            KMGBF CNA
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 py-2">
          {NAV.map(({ href, Icon, label }) => {
            const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href) && href !== '/dashboard'
            return (
              <Link key={href} href={href}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium border-l-2 transition-all"
                style={{
                  color:           active ? 'white' : 'rgba(255,255,255,.55)',
                  background:      active ? 'rgba(82,183,136,.12)' : 'transparent',
                  borderLeftColor: active ? '#52b788' : 'transparent',
                }}>
                <Icon size={15} style={{ opacity: active ? 1 : 0.6 }}/>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Back to app + sign out */}
        <div className="relative px-4 py-3 border-t border-white/[0.06] space-y-1.5">
          <Link href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
            style={{ background: 'rgba(82,183,136,.1)', color: '#52b788' }}>
            <ArrowLeft size={13}/> Back to App
          </Link>
          <button onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors"
            style={{ background: 'rgba(220,38,38,.12)', color: '#fca5a5', border: '1px solid rgba(220,38,38,.25)' }}>
            <LogOut size={13}/> Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1" style={{ marginLeft: 220 }}>
        <header className="sticky top-0 z-30 h-[58px] flex items-center justify-between px-8 border-b border-sand-300"
          style={{ background: 'rgba(246,243,238,.95)', backdropFilter: 'blur(10px)' }}>
          <div className="text-[13px] flex items-center gap-2">
            <span className="text-forest-400">Admin</span>
            <span className="text-sand-300">/</span>
            <span className="font-semibold text-forest-600 capitalize">
              {pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Overview'}
            </span>
          </div>
          <Link href="/dashboard" className="btn btn-ghost btn-sm flex items-center gap-1.5">
            <ArrowLeft size={13}/> Back to App
          </Link>
        </header>
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  )
}
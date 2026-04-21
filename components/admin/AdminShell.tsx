'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

const NAV = [
  { href:'/admin',               icon:'📊', label:'Overview'     },
  { href:'/admin/institutions',  icon:'🏛️', label:'Institutions' },
  { href:'/admin/users',         icon:'👥', label:'Users'        },
  { href:'/dashboard',           icon:'◀',  label:'Back to App'  },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  async function signOut() {
    await supabase.auth.signOut()
    localStorage.removeItem('kmgbf-v2')
    window.location.href = '/auth'
  }

  return (
    <div className="flex min-h-screen" style={{ background:'#f6f3ee' }}>

      {/* Admin sidebar */}
      <aside className="fixed top-0 left-0 bottom-0 flex flex-col z-40 overflow-hidden"
        style={{ width:220, background:'#0f2d1c' }}>

        <div className="absolute inset-0 pointer-events-none"
          style={{ background:'radial-gradient(ellipse at 20% 10%, rgba(64,145,108,.15) 0%, transparent 60%)' }}/>

        {/* Brand */}
        <div className="relative px-5 pt-6 pb-4 border-b border-white/[0.07]">
          <div className="inline-block mb-1.5 px-2 py-0.5 rounded text-[9px] font-bold tracking-[2px] uppercase"
            style={{ background:'rgba(220,38,38,.2)', color:'#fca5a5', border:'1px solid rgba(220,38,38,.3)' }}>
            Admin Panel
          </div>
          <div className="text-white text-[15px] font-semibold" style={{ fontFamily:'var(--font-display)' }}>
            KMGBF CNA
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 py-2">
          {NAV.map(({ href, icon, label }) => {
            const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href) && href !== '/dashboard'
            return (
              <Link key={href} href={href}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium border-l-2 transition-all"
                style={{
                  color:           active ? 'white' : 'rgba(255,255,255,.55)',
                  background:      active ? 'rgba(82,183,136,.12)' : 'transparent',
                  borderLeftColor: active ? '#52b788' : 'transparent',
                }}>
                <span className="text-sm w-4 text-center shrink-0">{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="relative px-4 py-3 border-t border-white/[0.06]">
          <button onClick={signOut}
            className="w-full py-2 rounded-lg text-[12px] font-semibold transition-colors"
            style={{ background:'rgba(220,38,38,.12)', color:'#fca5a5', border:'1px solid rgba(220,38,38,.25)' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1" style={{ marginLeft:220 }}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-[58px] flex items-center justify-between px-8 border-b border-sand-300"
          style={{ background:'rgba(246,243,238,.95)', backdropFilter:'blur(10px)' }}>
          <div className="text-[13px] flex items-center gap-2">
            <span className="text-forest-400">Admin</span>
            <span className="text-sand-300">/</span>
            <span className="font-semibold text-forest-600 capitalize">
              {pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Overview'}
            </span>
          </div>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">← Back to App</Link>
        </header>

        <main className="flex-1 px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
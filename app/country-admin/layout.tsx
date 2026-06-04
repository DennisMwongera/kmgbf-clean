'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { LayoutDashboard, Building2, Users, BarChart2, ArrowLeft, LogOut, Globe } from 'lucide-react'

const NAV: { href: string; Icon: any; label: string; badge?: boolean }[] = [
  { href:'/country-admin',                Icon: LayoutDashboard, label:'Overview'         },
  { href:'/country-admin/institutions',   Icon: Building2,       label:'Institutions'     },
  { href:'/country-admin/users',          Icon: Users,           label:'Users',  badge: true },
  { href:'/country-admin/reports',        Icon: BarChart2,       label:'National Reports' },
]

export default function CountryAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [profile,      setProfile]      = useState<any>(null)
  const [country,      setCountry]      = useState<any>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [countryParam, setCountryParam] = useState('')

  useEffect(() => {
    // Capture country param from URL so we can append it to all nav links
    const urlParams = new URLSearchParams(window.location.search)
    const cp = urlParams.get('country')
    if (cp) setCountryParam('?country=' + cp)

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/auth'; return }
      const { data: p } = await supabase
        .from('user_profiles')
        .select('full_name, email, country_id, role')
        .eq('id', user.id).single()
      if (!p) return
      if (!['country_admin', 'super_admin', 'admin'].includes(p.role)) {
        window.location.href = '/dashboard'; return
      }
      setProfile(p)
      // Resolve effective country — use profile.country_id or super_admin sessionStorage selection
      // URL param takes priority (set by super admin country switcher)
      const urlParams = new URLSearchParams(window.location.search)
      let cid = urlParams.get('country') || p.country_id || null
      if (cid) {
        const { data: c } = await supabase
          .from('countries').select('id, name, code').eq('id', cid).single()
        setCountry(c)
        // Load pending users count
        const { count } = await supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('country_id', p.country_id)
          .eq('status', 'pending')
        setPendingCount(count ?? 0)
      }
    })
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    localStorage.removeItem('kmgbf-v2')
    window.location.href = '/auth'
  }

  return (
    <div className="flex min-h-screen" style={{ background:'#f6f3ee' }}>
      <aside className="fixed top-0 left-0 bottom-0 flex flex-col z-40"
        style={{ width:230, background:'#0f2d1c' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background:'radial-gradient(ellipse at 20% 10%, rgba(64,145,108,.15) 0%, transparent 60%)' }}/>

        {/* Brand */}
        <div className="relative px-5 pt-6 pb-4 border-b border-white/[0.07]">
          <div className="inline-block mb-2 px-2 py-0.5 rounded text-[9px] font-bold tracking-[2px] uppercase"
            style={{ background:'rgba(59,130,246,.2)', color:'#93c5fd', border:'1px solid rgba(59,130,246,.3)' }}>
            Country Admin
          </div>
          <div className="text-white text-[15px] font-semibold mb-2" style={{ fontFamily:'var(--font-display)' }}>
            KMGBF CNA
          </div>
          {country && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background:'rgba(82,183,136,.12)', border:'1px solid rgba(82,183,136,.2)' }}>
              <Globe size={11} style={{ color:'#52b788' }}/>
              <div>
                <div className="text-[11px] font-bold text-white">{country.name}</div>
                <div className="text-[9px]" style={{ color:'rgba(149,213,178,.5)' }}>{country.code}</div>
              </div>
            </div>
          )}
        </div>

        {/* User */}
        {profile && (
          <div className="relative px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                style={{ background:'rgba(59,130,246,.2)', color:'#93c5fd' }}>
                {(profile.full_name||profile.email||'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-white truncate">{profile.full_name||profile.email}</div>
                <div className="text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block"
                  style={{ background:'rgba(59,130,246,.2)', color:'#93c5fd' }}>country admin</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="relative flex-1 py-2 overflow-y-auto">
          {NAV.map(({ href, Icon, label, badge }) => {
            const active = href === '/country-admin' ? pathname === '/country-admin' : pathname.startsWith(href)
            return (
              <Link key={href} href={href + countryParam}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium border-l-2 transition-all"
                style={{
                  color:           active ? 'white' : 'rgba(255,255,255,.55)',
                  background:      active ? 'rgba(59,130,246,.12)' : 'transparent',
                  borderLeftColor: active ? '#60a5fa' : 'transparent',
                }}>
                <Icon size={15} style={{ opacity: active ? 1 : 0.6 }}/>
                <span className="flex-1">{label}</span>
                {badge && pendingCount > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[9px] font-bold px-1"
                    style={{ background:'#f59e0b', color:'white' }}>
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="relative px-4 py-3 border-t border-white/[0.06] space-y-1.5">
          <Link href={countryParam ? '/super-admin' : '/dashboard'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium"
            style={{ background:'rgba(82,183,136,.1)', color:'#52b788' }}>
            <ArrowLeft size={13}/> {countryParam ? 'Back to Super Admin' : 'Back to App'}
          </Link>
          <button onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold"
            style={{ background:'rgba(255,255,255,.05)', color:'rgba(255,255,255,.4)' }}>
            <LogOut size={13}/> Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1" style={{ marginLeft:230 }}>
        <header className="sticky top-0 z-30 h-[58px] flex items-center justify-between px-8 border-b border-sand-300"
          style={{ background:'rgba(246,243,238,.95)', backdropFilter:'blur(10px)' }}>
          <div className="text-[13px] flex items-center gap-2">
            {country && <><Globe size={13} style={{ color:'#3b82f6' }}/><span className="font-semibold text-forest-600">{country.name}</span><span className="text-sand-300">/</span></>}
            <span className="text-forest-400 capitalize">
              {pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Overview'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background:'rgba(59,130,246,.1)', color:'#3b82f6' }}>
            <Globe size={12}/> {country?.name ?? 'Country Admin'}
          </div>
        </header>
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  )
}
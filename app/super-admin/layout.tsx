'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Globe, Building2, Users, BarChart2, ArrowLeft, LogOut, ShieldCheck } from 'lucide-react'

const NAV = [
  { href:'/super-admin',              Icon: BarChart2,  label:'Overview'      },
  { href:'/super-admin/countries',    Icon: Globe,      label:'Countries'     },
  { href:'/super-admin/institutions', Icon: Building2,  label:'Institutions'  },
  { href:'/super-admin/users',        Icon: Users,      label:'All Users'     },
]

interface Country { id: string; name: string; code: string }

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const [countries,       setCountries]       = useState<Country[]>([])
  const [allCountries,    setAllCountries]    = useState<Country[]>([])
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [switcherOpen,    setSwitcherOpen]    = useState(false)
  const [filterQuery,    setFilterQuery]    = useState('')

  useEffect(() => {
    supabase.from('countries')
      .select('id, name, code')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => {
        const list = data ?? []
        setCountries(list)
        setAllCountries(list)
        // Restore from sessionStorage first
        const stored = sessionStorage.getItem('sa_selected_country')
        if (stored) {
          try { setSelectedCountry(JSON.parse(stored)) } catch {}
        }
        // Override with URL if on a country detail page
        const match = pathname.match(/\/super-admin\/countries\/([^/]+)/)
        if (match) {
          const found = list.find((c: Country) => c.id === match[1])
          if (found) {
            setSelectedCountry(found)
            sessionStorage.setItem('sa_selected_country', JSON.stringify(found))
          }
        }
      })
  }, [pathname])

  function clearCountry() {
    setSelectedCountry(null)
    setSwitcherOpen(false)
    setFilterQuery('')
    sessionStorage.removeItem('sa_selected_country')
    window.dispatchEvent(new CustomEvent('sa-country-changed', { detail: null }))
  }

  function handleCountrySwitch(c: Country) {
    setSelectedCountry(c)
    setSwitcherOpen(false)
    setFilterQuery('')
    sessionStorage.setItem('sa_selected_country', JSON.stringify(c))
    window.dispatchEvent(new CustomEvent('sa-country-changed', { detail: c }))
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/auth'; return }
      const { data: p } = await supabase
        .from('user_profiles').select('role').eq('id', user.id).single()
      if (p?.role !== 'super_admin') {
        window.location.href = '/dashboard'
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
      <aside className="fixed top-0 left-0 bottom-0 flex flex-col z-40 overflow-hidden"
        style={{ width:220, background:'#0f2d1c' }}>

        <div className="absolute inset-0 pointer-events-none"
          style={{ background:'radial-gradient(ellipse at 20% 10%, rgba(64,145,108,.15) 0%, transparent 60%)' }}/>

        {/* Brand */}
        <div className="relative px-5 pt-6 pb-4 border-b border-white/[0.07]">
          <div className="inline-block mb-1.5 px-2 py-0.5 rounded text-[9px] font-bold tracking-[2px] uppercase"
            style={{ background:'rgba(139,92,246,.2)', color:'#c4b5fd', border:'1px solid rgba(139,92,246,.3)' }}>
            Super Admin
          </div>
          <div className="text-white text-[15px] font-semibold" style={{ fontFamily:'var(--font-display)' }}>
            KMGBF CNA
          </div>
          <div className="text-[10px] mt-0.5" style={{ color:'rgba(149,213,178,.5)' }}>
            Global Management
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 py-2">
          {NAV.map(({ href, Icon, label }) => {
            const active = href === '/super-admin'
              ? pathname === '/super-admin'
              : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium border-l-2 transition-all"
                style={{
                  color:           active ? 'white' : 'rgba(255,255,255,.55)',
                  background:      active ? 'rgba(139,92,246,.12)' : 'transparent',
                  borderLeftColor: active ? '#a78bfa' : 'transparent',
                }}>
                <Icon size={15} style={{ opacity: active ? 1 : 0.6 }}/>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Country switcher */}
        <div className="relative px-4 py-3 border-t border-white/[0.06]">
          <div className="text-[9px] font-bold tracking-[1.5px] uppercase mb-2"
            style={{ color:'rgba(149,213,178,.4)' }}>
            Switch country
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setSwitcherOpen(v => !v); setFilterQuery('') }}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
              style={{ background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.7)', border:'1px solid rgba(255,255,255,.08)' }}>
              <Globe size={13} style={{ flexShrink:0 }}/>
              <span className="flex-1 text-left truncate">
                {selectedCountry ? selectedCountry.name : 'Select country…'}
              </span>
              <span style={{ color:'rgba(255,255,255,.3)', fontSize:10 }}>{switcherOpen ? '▲' : '▼'}</span>
            </button>
            {selectedCountry && (
              <button onClick={clearCountry}
                className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 transition-all"
                style={{ background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.4)', border:'1px solid rgba(255,255,255,.08)' }}
                title="Clear selected country">
                ✕
              </button>
            )}
          </div>

          {switcherOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-1 rounded-xl overflow-hidden z-50"
              style={{ background:'#1a3a2a', border:'1px solid rgba(255,255,255,.12)', boxShadow:'0 8px 32px rgba(0,0,0,.4)' }}>
              <div className="p-2 border-b border-white/[0.06]">
                <input autoFocus placeholder="Search…"
                  className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none"
                  style={{ background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.1)', color:'white' }}
                  value={filterQuery}
                  onChange={e => setFilterQuery(e.target.value)}
                />
              </div>
              <div style={{ maxHeight:220, overflowY:'auto' }}>
                {allCountries.filter(c =>
                  !filterQuery ||
                  c.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
                  c.code.toLowerCase().includes(filterQuery.toLowerCase())
                ).map(c => (
                  <button key={c.id} onClick={() => handleCountrySwitch(c)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all"
                    style={{
                      fontSize:11.5,
                      color: selectedCountry?.id === c.id ? 'white' : 'rgba(255,255,255,.7)',
                      background: selectedCountry?.id === c.id ? 'rgba(82,183,136,.15)' : 'transparent',
                    }}>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background:'rgba(82,183,136,.2)', color:'#52b788' }}>
                      {c.code}
                    </span>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Links */}
        <div className="relative px-4 py-3 border-t border-white/[0.06] space-y-1.5">
          <Link href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
            style={{ background:'rgba(82,183,136,.1)', color:'#52b788' }}>
            <ArrowLeft size={13}/> Back to App
          </Link>
          <button onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors"
            style={{ background:'rgba(255,255,255,.05)', color:'rgba(255,255,255,.4)' }}>
            <LogOut size={13}/> Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1" style={{ marginLeft:220 }}>
        <header className="sticky top-0 z-30 h-[58px] flex items-center justify-between px-8 border-b border-sand-300"
          style={{ background:'rgba(246,243,238,.95)', backdropFilter:'blur(10px)' }}>
          <div className="text-[13px] flex items-center gap-2">
            <span className="text-forest-400">Super Admin</span>
            <span className="text-sand-300">/</span>
            <span className="font-semibold text-forest-600 capitalize">
              {pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Overview'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background:'rgba(139,92,246,.1)', color:'#7c3aed' }}>
            <ShieldCheck size={12}/> Super Admin
          </div>
        </header>
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  )
}
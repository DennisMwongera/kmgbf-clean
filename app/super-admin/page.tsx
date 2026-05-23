'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Globe, Building2, Users, BarChart2, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface CountrySummary {
  id: string; name: string; code: string; region: string | null
  inst_count: number; user_count: number; assessment_count: number
  status: string
}

function scoreColor(v: number | null): string {
  if (v === null) return '#9ca3af'
  if (v < 1) return '#dc2626'; if (v < 2) return '#ea580c'
  if (v < 3) return '#ca8a04'; if (v < 4) return '#16a34a'
  return '#047857'
}

export default function SuperAdminOverviewPage() {
  const [countries, setCountries] = useState<CountrySummary[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const { data: ctrs } = await supabase
        .from('countries')
        .select('id, name, code, region, status')
        .order('name')

      if (!ctrs) { setLoading(false); return }

      const { data: insts }   = await supabase.from('institutions').select('id, country_id')
      const { data: users }   = await supabase.from('user_profiles').select('country_id').not('country_id','is',null)
      const { data: assesses} = await supabase.from('assessments').select('institution_id')

      const im: Record<string,number> = {}
      const um: Record<string,number> = {}
      const am: Record<string,number> = {}

      insts?.forEach(r   => { if (r.country_id) im[r.country_id] = (im[r.country_id]??0)+1 })
      users?.forEach(r   => { if (r.country_id) um[r.country_id] = (um[r.country_id]??0)+1 })
      // Map institution_id → country_id first
      const instCountryMap: Record<string,string> = {}
      insts?.forEach((i:any) => { if(i.country_id) instCountryMap[i.id] = i.country_id })
      assesses?.forEach((r:any) => {
        const cid = instCountryMap[r.institution_id]
        if (cid) am[cid] = (am[cid]??0)+1
      })

      setCountries(ctrs.map(c => ({
        ...c,
        inst_count:       im[c.id] ?? 0,
        user_count:       um[c.id] ?? 0,
        assessment_count: am[c.id] ?? 0,
      })))
      setLoading(false)
    }
    load()
  }, [])

  const active     = countries.filter(c => c.status === 'active')
  const withData   = countries.filter(c => c.inst_count > 0)
  const totalInsts = countries.reduce((s,c) => s+c.inst_count, 0)
  const totalUsers = countries.reduce((s,c) => s+c.user_count, 0)
  const totalAss   = countries.reduce((s,c) => s+c.assessment_count, 0)

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c' }}>
          Global Overview
        </h2>
        <p className="text-[13.5px] text-forest-400 mt-1">
          All countries, institutions and assessments across the KMGBF CNA programme.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label:'Active Countries',  value: active.length,  accent:'#7c3aed', Icon: Globe      },
          { label:'Institutions',      value: totalInsts,     accent:'#52b788', Icon: Building2  },
          { label:'Users',             value: totalUsers,     accent:'#5b8dee', Icon: Users      },
          { label:'Assessments',       value: totalAss,       accent:'#c8860a', Icon: BarChart2  },
        ].map(({ label, value, accent, Icon }) => (
          <div key={label} className="bg-white rounded-xl px-5 py-4 border border-sand-300/60"
            style={{ borderTop:`3px solid ${accent}`, boxShadow:'0 2px 12px rgba(15,45,28,.08)' }}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1.5">
              <Icon size={11}/> {label}
            </div>
            <div className="text-[28px] text-forest-700" style={{ fontFamily:'var(--font-mono)', fontWeight:300 }}>
              {loading ? '…' : value}
            </div>
          </div>
        ))}
      </div>

      {/* Countries with data */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color:'#52b788' }}/>
        </div>
      ) : (
        <>
          {withData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[14px] font-bold text-forest-700 mb-3">
                Countries with Active Data ({withData.length})
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {withData.sort((a,b) => b.assessment_count - a.assessment_count).map(c => (
                  <div key={c.id} className="bg-white rounded-xl p-4 border border-sand-300"
                    style={{ boxShadow:'0 2px 8px rgba(15,45,28,.06)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-9 h-6 rounded text-[10px] font-bold"
                          style={{ background:'#f0faf4', color:'#2d6a4f', border:'1px solid #d8f3dc' }}>
                          {c.code}
                        </span>
                        <span className="font-bold text-[13px] text-forest-700">{c.name}</span>
                      </div>
                      <Link href={`/super-admin/countries/${c.id}`}
                        className="text-[11px] text-forest-400 hover:text-forest-600 flex items-center gap-0.5">
                        View <ChevronRight size={11}/>
                      </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label:'Institutions', value: c.inst_count },
                        { label:'Users',        value: c.user_count },
                        { label:'Assessments',  value: c.assessment_count },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg py-2" style={{ background:'#f6f3ee' }}>
                          <div className="text-[16px] font-light" style={{ fontFamily:'var(--font-mono)', color:'#1b4332' }}>
                            {value}
                          </div>
                          <div className="text-[9px] text-forest-400 uppercase tracking-wide">{label}</div>
                        </div>
                      ))}
                    </div>
                    {c.region && (
                      <div className="mt-2 text-[10.5px] text-forest-400">{c.region}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All countries table */}
          <div>
            <h3 className="text-[14px] font-bold text-forest-700 mb-3">
              All Countries ({countries.length})
            </h3>
            <div className="bg-white rounded-2xl border border-sand-300 overflow-hidden">
              <table className="rt w-full">
                <thead>
                  <tr>
                    <th>Country</th><th>Region</th>
                    <th>Institutions</th><th>Users</th><th>Assessments</th>
                    <th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-5 rounded text-[9px] font-bold"
                            style={{ background:'#f0faf4', color:'#2d6a4f', border:'1px solid #d8f3dc' }}>
                            {c.code}
                          </span>
                          <span className="font-semibold text-[12.5px] text-forest-700">{c.name}</span>
                        </div>
                      </td>
                      <td className="text-[12px] text-forest-400">{c.region ?? '—'}</td>
                      <td className="font-mono text-[12px]">{c.inst_count || '—'}</td>
                      <td className="font-mono text-[12px]">{c.user_count || '—'}</td>
                      <td className="font-mono text-[12px]">{c.assessment_count || '—'}</td>
                      <td>
                        <span className="chip text-[10px]" style={{
                          background: c.status === 'active' ? '#d8f3dc' : '#f3f4f6',
                          color:      c.status === 'active' ? '#1b4332'  : '#9ca3af',
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <Link href={`/super-admin/countries/${c.id}`}
                          className="btn btn-ghost btn-sm flex items-center gap-1">
                          View <ChevronRight size={11}/>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
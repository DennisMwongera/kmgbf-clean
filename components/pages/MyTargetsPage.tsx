'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase/client'
import { getT } from '@/lib/i18n'

const ALL_TARGETS = [
  {num:1,  title:'Spatial Planning',            desc:'Ensure all areas under participatory biodiversity-inclusive spatial planning.'},
  {num:2,  title:'Ecosystem Restoration',       desc:'30% of degraded ecosystems under effective restoration by 2030.'},
  {num:3,  title:'Protected Areas (30×30)',      desc:'30% of land and sea effectively conserved and managed by 2030.'},
  {num:4,  title:'Halting Species Loss',         desc:'Halt human-induced extinction of known threatened species.'},
  {num:5,  title:'Sustainable Wild Species',     desc:'Ensure sustainable, safe and legal harvesting and trade of wild species.'},
  {num:6,  title:'Invasive Alien Species',       desc:'Reduce rate of introduction of invasive alien species.'},
  {num:7,  title:'Pollution Reduction',          desc:'Reduce pollution to levels not harmful to biodiversity.'},
  {num:8,  title:'Climate & Biodiversity',       desc:'Minimize climate change impacts on biodiversity.'},
  {num:9,  title:'Wild Species Benefits',        desc:'Ensure wild species managed sustainably to benefit people.'},
  {num:10, title:'Sustainable Production',       desc:'Sustainable management of agriculture, aquaculture, fisheries and forestry.'},
  {num:11, title:'Ecosystem Services',           desc:"Restore and maintain nature's contributions to people."},
  {num:12, title:'Urban Green Spaces',           desc:'Increase green/blue spaces in urban areas.'},
  {num:13, title:'Access & Benefit Sharing',     desc:'Fair and equitable sharing of benefits from genetic resources.'},
  {num:14, title:'Biodiversity Mainstreaming',   desc:'Integrate biodiversity values into policies across all sectors.'},
  {num:15, title:'Business & Biodiversity',      desc:'Encourage business to assess and report on biodiversity impacts.'},
  {num:16, title:'Sustainable Consumption',      desc:'Enable sustainable consumption choices.'},
  {num:17, title:'Biosafety',                    desc:'Establish measures for biosafety and biotechnology.'},
  {num:18, title:'Harmful Subsidies Reform',     desc:'Eliminate incentives harmful for biodiversity.'},
  {num:19, title:'Resource Mobilisation',        desc:'Progressively increase financial resources for biodiversity.'},
  {num:20, title:'Capacity Building',            desc:'Strengthen capacity-building and technology transfer.'},
  {num:21, title:'Knowledge & Innovation',       desc:'Ensure best available data accessible for decision-making.'},
  {num:22, title:'Participation & Rights',       desc:'Ensure full and equitable participation in biodiversity decisions.'},
  {num:23, title:'Gender Equality',              desc:'Ensure gender equality in biodiversity action.'},
]

export default function MyTargetsPage() {
  const user    = useStore(s => s.user)
  const lang    = useStore(s => s.lang)
  const navigate = useStore(s => s.navigate)
  const t       = getT(lang ?? 'en')

  const [assigned, setAssigned] = useState<number[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  const isLead = user?.role === 'institution_lead' || user?.role === 'admin'

  useEffect(() => {
    if (!user?.institution_id) { setLoading(false); return }
    supabase
      .from('institution_targets')
      .select('target_num')
      .eq('institution_id', user.institution_id)
      .then(({ data }) => {
        setAssigned((data ?? []).map(r => r.target_num))
        setLoading(false)
      })
  }, [user?.institution_id])

  async function toggle(num: number) {
    if (!isLead || !user?.institution_id) return
    setSaving(true); setSaved(false)
    if (assigned.includes(num)) {
      await supabase.from('institution_targets').delete()
        .eq('institution_id', user.institution_id).eq('target_num', num)
      setAssigned(prev => prev.filter(n => n !== num))
    } else {
      await supabase.from('institution_targets')
        .insert({ institution_id: user.institution_id, target_num: num })
      setAssigned(prev => [...prev, num].sort((a, b) => a - b))
    }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function selectAll() {
    if (!isLead || !user?.institution_id) return
    setSaving(true)
    const toAdd = ALL_TARGETS
      .filter(t => !assigned.includes(t.num))
      .map(t => ({ institution_id: user!.institution_id!, target_num: t.num }))
    if (toAdd.length) await supabase.from('institution_targets').insert(toAdd)
    setAssigned(ALL_TARGETS.map(t => t.num))
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function clearAll() {
    if (!isLead || !user?.institution_id) return
    if (!confirm('Remove all target assignments? Contributors will see all targets greyed out until you reassign.')) return
    setSaving(true)
    await supabase.from('institution_targets').delete().eq('institution_id', user.institution_id)
    setAssigned([])
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-forest-400">
        Loading target assignments…
      </div>
    )
  }

  if (!user?.institution_id) {
    return (
      <div className="fade-in">
        <div className="card text-center py-14">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-forest-400 text-[13px]">No institution linked. Contact your admin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c', lineHeight:1.1 }}>
          Our KMGBF Targets
        </h2>
        <p className="text-[13.5px] text-forest-400 mt-1.5">
          Select the KMGBF targets your institution works on. Only selected targets will be active in the assessment — others will be greyed out for all team members.
        </p>
      </div>

      {/* Not a lead — read only view */}
      {!isLead && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-[13px]"
          style={{ background:'#fef3c7', color:'#d97706', border:'1px solid #fde68a' }}>
          <span>ℹ️</span>
          <span>Only your institution lead can change target assignments. You can view which targets are active below.</span>
        </div>
      )}

      <div className="card">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="text-[28px] font-bold" style={{ fontFamily:'var(--font-mono)', color:'#1b4332' }}>
              {assigned.length}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-forest-700">of 23 targets selected</div>
              <div className="text-[11px] text-forest-400">Changes apply immediately to all team members</div>
            </div>
          </div>
          {isLead && (
            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-[12px] font-medium text-forest-500">✓ Saved</span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={selectAll} disabled={saving}>
                Select all
              </button>
              <button className="btn btn-danger btn-sm" onClick={clearAll} disabled={saving}>
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full mb-5 overflow-hidden" style={{ background:'#e8e3da' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width:`${(assigned.length/23)*100}%`, background:'#52b788' }}/>
        </div>

        {/* Target grid */}
        <div className="grid grid-cols-2 gap-2">
          {ALL_TARGETS.map(target => {
            const active = assigned.includes(target.num)
            return (
              <button
                key={target.num}
                onClick={() => toggle(target.num)}
                disabled={!isLead || saving}
                className="flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all"
                style={{
                  background:  active ? '#f0faf4' : 'white',
                  borderColor: active ? '#52b788' : '#e8e3da',
                  cursor:      !isLead ? 'default' : saving ? 'wait' : 'pointer',
                  opacity:     saving ? 0.7 : 1,
                }}>

                {/* Number badge */}
                <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                  style={{
                    background: active ? '#52b788' : '#e8e3da',
                    color:      active ? 'white'   : '#9ca3af',
                  }}>
                  {active ? '✓' : target.num}
                </span>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold leading-snug"
                    style={{ color: active ? '#1b4332' : '#6b7280' }}>
                    T{target.num}: {target.title}
                  </div>
                  <div className="text-[11px] mt-0.5 leading-snug line-clamp-2"
                    style={{ color: active ? '#2d6a4f' : '#9ca3af' }}>
                    {target.desc}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="mt-5 pt-4 border-t border-forest-50 flex items-center justify-between">
          <p className="text-[11.5px] text-forest-400">
            {assigned.length === 0
              ? 'No targets selected — all targets will appear greyed out in the assessment.'
              : `${assigned.length} target${assigned.length > 1 ? 's' : ''} active · ${23 - assigned.length} hidden from team`}
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('targets')}>
            Go to Assessment →
          </button>
        </div>
      </div>
    </div>
  )
}
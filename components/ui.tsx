'use client'
import { chipStyle, scoreColor, interpret, gapBadge } from '@/lib/utils'

export function ScoreChip({ value }: { value: number | null }) {
  const s = chipStyle(value)
  return <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium"
    style={{ ...s, fontFamily:'var(--font-mono)' }}>{value === null ? '—' : value.toFixed(1)}</span>
}

export function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value !== null ? Math.min(100, value / 5 * 100) : 0
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[12.5px] mb-1">
        <span className="text-forest-700">{label}</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#5c7566' }}>
          {value !== null ? `${value.toFixed(1)}/5` : '—'}
        </span>
      </div>
      <div className="h-1.5 bg-forest-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, background: scoreColor(value) }}/>
      </div>
    </div>
  )
}

export function PageHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-6">
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#0f2d1c', lineHeight:1.1 }}>{title}</h2>
      {desc && <p className="text-[13.5px] text-forest-400 mt-1.5 max-w-2xl leading-relaxed">{desc}</p>}
    </div>
  )
}

export function StatCard({ label, value, sub, accent, valueColor }: { label:string; value:string|number; sub?:string; accent:'green'|'amber'|'coral'|'blue'; valueColor?:string }) {
  const colors = { green:'#52b788', amber:'#c8860a', coral:'#e07a5f', blue:'#5b8dee' }
  return (
    <div className="bg-white rounded-xl px-5 py-4 border border-sand-300/60 transition-all hover:-translate-y-0.5"
      style={{ borderTop:`3px solid ${colors[accent]}`, boxShadow:'0 2px 12px rgba(15,45,28,.09)' }}>
      <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-forest-400 mb-1.5">{label}</div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:28, fontWeight:400, color:valueColor||'#0f2d1c', lineHeight:1 }}>{value}</div>
      {sub && <div className="text-[11px] text-forest-400 mt-1">{sub}</div>}
    </div>
  )
}

export function GapBadge({ gap }: { gap: number | null }) {
  const b = gapBadge(gap)
  return <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold"
    style={{ background:b.bg, color:b.text }}>{b.label}</span>
}

export function EmptyState({ emoji, msg }: { emoji:string; msg:string }) {
  return <div className="flex flex-col items-center justify-center py-10 text-forest-400 text-[13px]">
    <div className="text-3xl mb-2">{emoji}</div>{msg}
  </div>
}

export function SectionActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-3 mt-5">{children}</div>
}

export function Tabs({ tabs, active, onChange }: { tabs:{id:string;label:string}[]; active:string; onChange:(id:string)=>void }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit" style={{ background:'#e8e3da' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`px-4 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all ${active===t.id ? 'bg-white text-forest-700 shadow-sm' : 'text-forest-400 hover:text-forest-600'}`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

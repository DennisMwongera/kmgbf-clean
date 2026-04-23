'use client'
import { useState, useRef, useEffect } from 'react'

export type ExportOption = {
  label:   string
  icon:    string
  action:  () => void | Promise<void>
}

interface Props {
  options:  ExportOption[]
  label?:   string
  mini?:    boolean
}

export default function ExportMenu({ options, label = 'Export', mini = false }: Props) {
  const [open,  setOpen]  = useState(false)
  const [busy,  setBusy]  = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function run(action: () => void | Promise<void>) {
    setOpen(false); setBusy(true)
    try { await action() } finally { setBusy(false) }
  }

  return (
    <div ref={menuRef} style={{ position:'relative', display:'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={busy}
        style={{
          display:      'flex', alignItems:'center', gap: mini ? 4 : 6,
          padding:      mini ? '4px 10px' : '6px 14px',
          borderRadius: 8, border:'0.5px solid #d1d5db',
          background:   busy ? '#f3f4f6' : '#ffffff',
          color:        '#374151', fontSize: mini ? 11 : 12.5,
          fontWeight:   500, cursor: busy ? 'wait' : 'pointer',
          whiteSpace:   'nowrap',
        }}>
        {busy
          ? <><span style={{ width:10, height:10, border:'1.5px solid #d1d5db', borderTopColor:'#6b7280', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }}/> Exporting…</>
          : <>{label} <span style={{ fontSize: mini ? 8 : 9, opacity:0.6 }}>▾</span></>
        }
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:50,
          background:'white', border:'0.5px solid #e5e7eb', borderRadius:10,
          boxShadow:'0 8px 24px rgba(0,0,0,.10)', minWidth:180, overflow:'hidden',
        }}>
          {options.map((opt, i) => (
            <button key={i} onClick={() => run(opt.action)}
              style={{
                display:'flex', alignItems:'center', gap:8,
                width:'100%', padding:'9px 14px', background:'none',
                border:'none', textAlign:'left', cursor:'pointer',
                fontSize:12.5, color:'#374151', fontWeight:400,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <span style={{ fontSize:14 }}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'

export default function ConflictBanner() {
  const { setAssessment, notify } = useStore()
  const [backup, setBackup] = useState<any>(null)

  useEffect(() => {
    function check() {
      const raw = localStorage.getItem('kmgbf-conflict-backup')
      if (raw) {
        try { setBackup(JSON.parse(raw)) }
        catch { localStorage.removeItem('kmgbf-conflict-backup') }
      } else {
        setBackup(null)
      }
    }
    check()
    // Re-check when storage changes (e.g. after conflict handler writes it)
    window.addEventListener('storage', check)
    // Also poll every second in case it's set in the same tab
    const poll = setInterval(check, 1000)
    return () => { window.removeEventListener('storage', check); clearInterval(poll) }
  }, [])

  if (!backup) return null

  function restore() {
    setAssessment(backup.assessment)
    localStorage.removeItem('kmgbf-conflict-backup')
    setBackup(null)
    notify('Your changes have been restored. Save when ready.')
  }

  function dismiss() {
    localStorage.removeItem('kmgbf-conflict-backup')
    setBackup(null)
  }

  const source =
    backup.source === 'idle-timeout' ? 'Your session timed out. Unsaved work from'
    : backup.source === 'sign-out'   ? 'You signed out with unsaved work from'
    :                                  'A teammate\'s version was loaded. Your unsaved work from'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
      background: '#fef3c7', borderBottom: '2px solid #f59e0b',
      padding: '10px 24px', display: 'flex', alignItems: 'center',
      gap: 16, fontSize: 13, color: '#92400e',
      boxShadow: '0 2px 8px rgba(0,0,0,.15)',
    }}>
      <span style={{ fontSize: 18 }}>⚠️</span>
      <span style={{ flex: 1 }}>
        {source}{' '}
        <strong>{new Date(backup.savedAt).toLocaleTimeString()}</strong> is backed up and can be restored.
      </span>
      <button onClick={restore}
        style={{
          padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: '#1b4332', color: 'white', fontWeight: 700, fontSize: 12,
          whiteSpace: 'nowrap',
        }}>
        ↩ Restore my changes
      </button>
      <button onClick={dismiss}
        style={{
          padding: '6px 12px', borderRadius: 8, border: '1px solid #d97706',
          cursor: 'pointer', background: 'transparent', color: '#92400e', fontSize: 12,
          whiteSpace: 'nowrap',
        }}>
        Discard
      </button>
    </div>
  )
}
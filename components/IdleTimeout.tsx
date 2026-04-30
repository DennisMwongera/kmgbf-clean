'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase/client'

const IDLE_MINUTES      = 60   // sign out after this long idle
const WARNING_MINUTES   = 55   // show warning at this point
const WARNING_SECONDS   = (IDLE_MINUTES - WARNING_MINUTES) * 60  // 5 min warning window
const IDLE_MS           = IDLE_MINUTES  * 60 * 1000
const WARNING_MS        = WARNING_MINUTES * 60 * 1000

const EVENTS = ['mousedown','mousemove','keydown','touchstart','scroll','click','wheel']

export default function IdleTimeout() {
  const { user, setUser } = useStore()
  const [showWarning, setShowWarning]   = useState(false)
  const [countdown,   setCountdown]     = useState(WARNING_SECONDS)
  const idleTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAll = () => {
    if (idleTimer.current)     clearTimeout(idleTimer.current)
    if (warnTimer.current)     clearTimeout(warnTimer.current)
    if (countInterval.current) clearInterval(countInterval.current)
  }

  const signOut = useCallback(async () => {
    clearAll()
    setShowWarning(false)
    await supabase.auth.signOut()
    localStorage.removeItem('kmgbf-v2')
    setUser(null)
    window.location.href = '/auth?reason=idle'
  }, [setUser])

  const resetTimer = useCallback(() => {
    if (!user) return
    clearAll()
    setShowWarning(false)
    setCountdown(WARNING_SECONDS)

    // Show warning at WARNING_MINUTES
    warnTimer.current = setTimeout(() => {
      setShowWarning(true)
      setCountdown(WARNING_SECONDS)
      // Count down every second
      countInterval.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countInterval.current!)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, WARNING_MS)

    // Sign out at IDLE_MINUTES
    idleTimer.current = setTimeout(signOut, IDLE_MS)
  }, [user, signOut])

  // Attach activity listeners
  useEffect(() => {
    if (!user) return
    resetTimer()
    EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    return () => {
      clearAll()
      EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [user, resetTimer])

  // Don't render anything if no user or no warning
  if (!user || !showWarning) return null

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60

  return (
    <>
      {/* Dark overlay */}
      <div style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
        zIndex:9998, backdropFilter:'blur(2px)',
      }}/>

      {/* Warning modal */}
      <div style={{
        position:'fixed', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        background:'white', borderRadius:16, padding:'32px 40px',
        zIndex:9999, textAlign:'center', width:380,
        boxShadow:'0 24px 60px rgba(0,0,0,.25)',
      }}>
        {/* Icon */}
        <div style={{
          width:56, height:56, borderRadius:'50%',
          background:'#fef3c7', display:'flex',
          alignItems:'center', justifyContent:'center',
          margin:'0 auto 16px', fontSize:28,
        }}>⏳</div>

        <h3 style={{
          fontFamily:'var(--font-display)', fontSize:20,
          fontWeight:700, color:'#0f2d1c', marginBottom:8,
        }}>
          Session expiring soon
        </h3>

        <p style={{ fontSize:13.5, color:'#52796f', marginBottom:16, lineHeight:1.6 }}>
          You've been inactive. For security, your session will end in:
        </p>

        {/* Countdown */}
        <div style={{
          fontSize:42, fontWeight:300, color: countdown < 60 ? '#dc2626' : '#1b4332',
          fontFamily:'var(--font-mono)', marginBottom:20,
          lineHeight:1,
        }}>
          {mins > 0 ? `${mins}:${String(secs).padStart(2,'0')}` : `${secs}s`}
        </div>

        {/* Progress bar */}
        <div style={{
          height:4, background:'#e8e3da', borderRadius:2,
          marginBottom:24, overflow:'hidden',
        }}>
          <div style={{
            height:'100%', borderRadius:2,
            background: countdown < 60 ? '#dc2626' : '#52b788',
            width:`${(countdown / WARNING_SECONDS) * 100}%`,
            transition:'width 1s linear, background 0.3s',
          }}/>
        </div>

        <div style={{ display:'flex', gap:12 }}>
          <button
            onClick={signOut}
            style={{
              flex:1, padding:'10px 0', borderRadius:10, border:'1px solid #e5e7eb',
              background:'white', color:'#6b7280', fontSize:13.5,
              fontWeight:500, cursor:'pointer', fontFamily:'var(--font-sans)',
            }}>
            Sign out now
          </button>
          <button
            onClick={resetTimer}
            style={{
              flex:2, padding:'10px 0', borderRadius:10, border:'none',
              background:'#1b4332', color:'white', fontSize:13.5,
              fontWeight:600, cursor:'pointer', fontFamily:'var(--font-sans)',
            }}>
            Stay signed in
          </button>
        </div>

        <p style={{ fontSize:11, color:'#9ca3af', marginTop:14 }}>
          Any unsaved changes will be preserved in your browser.
        </p>
      </div>
    </>
  )
}
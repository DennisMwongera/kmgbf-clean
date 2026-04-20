'use client'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { getT } from '@/lib/i18n'

// Applies dir and lang to <html> on mount and whenever lang changes.
// Must be a client component because it touches the DOM.
export default function HtmlDir() {
  const lang = useStore(s => s.lang)
  useEffect(() => {
    const t = getT(lang)
    document.documentElement.dir  = t.dir
    document.documentElement.lang = lang
  }, [lang])
  return null
}
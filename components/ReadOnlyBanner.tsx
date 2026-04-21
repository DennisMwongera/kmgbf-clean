'use client'
import { useStore } from '@/lib/store'

export default function ReadOnlyBanner() {
  const isReadOnly = useStore(s => s.isReadOnly())
  if (!isReadOnly) return null

  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-[13px] font-medium"
      style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
      <span>👁️</span>
      <span>You have <strong>viewer access</strong> — you can see all data but cannot make changes. Contact your institution lead to request contributor access.</span>
    </div>
  )
}
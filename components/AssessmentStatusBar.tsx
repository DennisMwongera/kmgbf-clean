'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase/client'
import { Send, CheckCircle2, Clock, Eye, RotateCcw } from 'lucide-react'

type Status = 'draft' | 'in_progress' | 'completed' | 'submitted' | 'in_review' | 'approved' | null

const STEPS: { status: Status; label: string; icon: React.ElementType }[] = [
  { status: 'in_progress', label: 'In Progress', icon: Clock        },
  { status: 'submitted',   label: 'Submitted',   icon: Send          },
  { status: 'in_review',   label: 'In Review',   icon: Eye           },
  { status: 'approved',    label: 'Approved',    icon: CheckCircle2  },
]

const STATUS_ORDER: Record<string, number> = {
  draft: 0, in_progress: 1, submitted: 2, in_review: 3, approved: 4
}

export default function AssessmentStatusBar() {
  const { assessment, setAssessment, user } = useStore()
  const [submitting, setSubmitting] = useState(false)

  const status    = assessment.status
  const isViewer  = user?.role === 'viewer'
  const isAdmin   = user?.role === 'admin'
  const isLocked  = ['submitted','in_review','approved'].includes(status ?? '')
  const canSubmit = !isLocked && !isViewer && assessment.id && status === 'in_progress'
  const canReopen = isLocked && !isAdmin && user?.role === 'institution_lead'
  const currentStep = STATUS_ORDER[status ?? 'in_progress'] ?? 1

  async function submit() {
    if (!assessment.id) { alert('Save your assessment first before submitting.'); return }
    if (!confirm('Submit this assessment for review?\n\nYou will not be able to edit it until the administrator sends it back.')) return
    setSubmitting(true)
    await supabase.from('assessments').update({ status: 'submitted' }).eq('id', assessment.id)
    setAssessment({ ...assessment, status: 'submitted' })
    setSubmitting(false)
  }

  async function reopen() {
    if (!assessment.id) return
    if (!confirm('Request to reopen this assessment for editing?')) return
    await supabase.from('assessments').update({ status: 'in_progress' }).eq('id', assessment.id)
    setAssessment({ ...assessment, status: 'in_progress' })
  }

  if (!user || !assessment.id) return null

  return (
    <div className="flex items-center justify-between px-4 py-2.5 mb-4 rounded-xl border border-sand-300"
      style={{ background:'#fafaf8' }}>

      {/* Progress steps */}
      <div className="flex items-center gap-1">
        {STEPS.map(({ status: s, label, icon: Icon }, i) => {
          const stepOrder = STATUS_ORDER[s!] ?? 0
          const done    = currentStep > stepOrder
          const active  = currentStep === stepOrder
          const pending = currentStep < stepOrder
          return (
            <div key={s} className="flex items-center">
              {i > 0 && (
                <div style={{ width:32, height:2, margin:'0 4px',
                  background: done ? '#52b788' : '#e8e3da' }}/>
              )}
              <div className="flex items-center gap-1.5">
                <div style={{
                  width:22, height:22, borderRadius:'50%', display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0,
                  background: done ? '#52b788' : active ? '#1b4332' : '#e8e3da',
                }}>
                  <Icon size={11} color={done || active ? 'white' : '#9ca3af'}/>
                </div>
                <span style={{
                  fontSize:11, fontWeight: active ? 700 : 400,
                  color: done ? '#2d6a4f' : active ? '#1b4332' : '#9ca3af',
                  whiteSpace:'nowrap',
                }}>
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action button */}
      <div className="flex items-center gap-2 ml-4">
        {status === 'approved' && (
          <span className="flex items-center gap-1.5 text-[11.5px] font-bold" style={{ color:'#1b4332' }}>
            <CheckCircle2 size={14}/> Approved
          </span>
        )}
        {status === 'in_review' && (
          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color:'#5b8dee' }}>
            <Eye size={13}/> Under admin review
          </span>
        )}
        {canSubmit && (
          <button
            onClick={submit}
            disabled={submitting}
            className="btn btn-primary btn-sm flex items-center gap-1.5"
            style={{ fontSize:12 }}>
            {submitting
              ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Submitting…</>
              : <><Send size={12}/> Submit for Review</>}
          </button>
        )}
        {canReopen && (
          <button
            onClick={reopen}
            className="btn btn-ghost btn-sm flex items-center gap-1.5"
            style={{ fontSize:11.5, color:'#d97706' }}>
            <RotateCcw size={11}/> Request reopen
          </button>
        )}
      </div>
    </div>
  )
}
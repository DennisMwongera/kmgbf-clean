'use client'
import { useStore } from '@/lib/store'
import { PAGE_TITLES, CORE_QUESTIONS } from '@/lib/constants'
import { supabase } from '@/lib/supabase/client'
import { loadInstitutionAssessment } from '@/lib/supabase/api'
import { useState, useEffect } from 'react'
import { LANGUAGES, getT, type LangCode } from '@/lib/i18n'
import { Save, Loader2, Globe, ChevronDown, Check } from 'lucide-react'

export default function Topbar() {
  const { activePage, assessment, setAssessment, user, notify, lang, setLang } = useStore()
  const isReadOnly = useStore(s => s.isReadOnly())
  const [saving,         setSaving]        = useState(false)
  const [showLang,       setShowLang]       = useState(false)
  const [conflictInfo,   setConflictInfo]   = useState<{ theirVersion: number; ourAssessment: any } | null>(null)
  const t = getT(lang ?? 'en')

  async function resolveConflict(choice: 'mine' | 'theirs') {
    if (!conflictInfo || !user?.institution_id) return
    if (choice === 'theirs') {
      // Load teammate's version — user's work is backed up in localStorage
      const refreshed = await loadInstitutionAssessment(user.institution_id)
      if (refreshed) setAssessment(refreshed)
    } else {
      // Force-save user's version — update our local version to match DB first
      // so the next save doesn't conflict again
      const { data: current } = await supabase
        .from('assessments').select('version').eq('id', conflictInfo.ourAssessment.id).single()
      if (current) {
        setAssessment({ ...conflictInfo.ourAssessment, version: current.version })
        // Trigger save after state update
        setTimeout(() => save(), 100)
      }
    }
    setConflictInfo(null)
  }

  async function save() {
    if (!user) { notify(t.topbar.notSignedIn); return }
    if (!user.institution_id) { notify(t.topbar.noInstitution); return }
    setSaving(true)
    try {
      // ── 1. Optimistic lock check ──────────────────────────
      // Only fires when a DIFFERENT user has saved since we last loaded
      // (same user saving = version stays same = no conflict)
      if (assessment.id && typeof assessment.version === 'number') {
        const { data: current } = await supabase
          .from('assessments')
          .select('version')
          .eq('id', assessment.id)
          .single()

        if (current && typeof current.version === 'number') {
          const diff = current.version - assessment.version
          // diff > 0 means a different user saved since we loaded
          if (diff > 0) {
            localStorage.setItem('kmgbf-conflict-backup', JSON.stringify({
              savedAt:    new Date().toISOString(),
              assessment: assessment,
              source:     'conflict',
            }))
            setConflictInfo({ theirVersion: current.version, ourAssessment: assessment })
            setSaving(false)
            return
          }
        }
      }

      // ── 2. Upsert assessment record ───────────────────────
      const { data: aData, error: aErr } = await supabase
        .from('assessments')
        .upsert({
          id:             assessment.id ?? undefined,
          institution_id: user.institution_id,
          created_by:     user.id,
          assess_date:    assessment.profile.assessDate || new Date().toISOString().slice(0,10),
          status: ['submitted','in_review','approved'].includes(assessment.status ?? '') ? assessment.status : 'in_progress',
        })
        .select('id, version')
        .single()
      if (aErr) throw aErr
      const aid     = aData.id
      const version = aData.version

      // ── 3. Core responses (upsert by index) ───────────────
      const coreUpserts = assessment.coreRows.map((r, i) => ({
        assessment_id:     aid,
        question_index:    i,
        dimension:         CORE_QUESTIONS[i].section,
        question_text:     CORE_QUESTIONS[i].q,
        score:             r.score,
        evidence:          r.evidence          || null,
        gap:               r.gap               || null,
        capacity_type:     r.capacityType      || null,
        priority:          r.priority          || null,
        suggested_support: r.suggestedSupport  || null,
      }))
      // Try upsert with N/A scores (-1). If DB constraint rejects it,
      // fall back to saving N/A rows with score=null (safe for unmigrated DBs)
      let { error: coreErr } = await supabase
        .from('core_responses')
        .upsert(coreUpserts, { onConflict: 'assessment_id,question_index' })
      if (coreErr && coreErr.message?.includes('check')) {
        // DB constraint doesn't allow -1 yet — save N/A as null
        const fallback = coreUpserts.map(r => ({ ...r, score: r.score === -1 ? null : r.score }));
        ({ error: coreErr } = await supabase
          .from('core_responses')
          .upsert(fallback, { onConflict: 'assessment_id,question_index' }))
      }
      if (coreErr) throw coreErr

      // ── 4. Target responses (upsert by target+indicator) ──
      const targetUpserts = Object.entries(assessment.targetRows).map(([key, row]) => {
        const [, tNum, iIdx] = key.match(/^t(\d+)_(\d+)$/) ?? []
        return {
          assessment_id:   aid,
          target_num:      parseInt(tNum),
          indicator_index: parseInt(iIdx),
          indicator_text:  '',
          score:           row.score,
          evidence:        row.evidence       || null,
          gap_identified:  row.gapIdentified  || null,
          capacity_need:   row.capacityNeed   || null,
        }
      })
      if (targetUpserts.length) {
        let { error: targErr } = await supabase
          .from('target_responses')
          .upsert(targetUpserts, { onConflict: 'assessment_id,target_num,indicator_index' })
        if (targErr && targErr.message?.includes('check')) {
          const fallback = targetUpserts.map(r => ({ ...r, score: r.score === -1 ? null : r.score }));
          ({ error: targErr } = await supabase
            .from('target_responses')
            .upsert(fallback, { onConflict: 'assessment_id,target_num,indicator_index' }))
        }
        if (targErr) throw targErr
      }

      // ── 5. Priority rows (delete + re-insert to preserve order) ──
      await supabase.from('priority_rows').delete().eq('assessment_id', aid)
      const activePriority = assessment.priorityRows.filter(r => r.capacityGap || r.urgency !== 3 || r.impact !== 3 || r.feasibility !== 3)
      if (activePriority.length) {
        const { error: prErr } = await supabase.from('priority_rows').insert(
          activePriority.map((r, i) => ({
            assessment_id: aid,
            sort_order:    i,
            capacity_gap:  r.capacityGap  || null,
            urgency:       r.urgency,
            impact:        r.impact,
            feasibility:   r.feasibility,
          }))
        )
        if (prErr) throw prErr
      }

      // ── 6. CDP rows (delete + re-insert to preserve order) ──
      await supabase.from('cdp_rows').delete().eq('assessment_id', aid)
      const activeCdp = assessment.cdpRows.filter(r => r.capacityGap || r.action)
      if (activeCdp.length) {
        const { error: cdpErr } = await supabase.from('cdp_rows').insert(
          activeCdp.map((r, i) => ({
            assessment_id: aid,
            sort_order:    i,
            capacity_gap:  r.capacityGap   || null,
            action:        r.action        || null,
            institution:   r.institution   || null,
            timeline:      r.timeline      || null,
            budget_usd:    r.budget        || null,
            indicator:     r.indicator     || null,
            collaboration: r.collaboration || null,
            source:        r.source        || 'core',
          }))
        )
        if (cdpErr) throw cdpErr
      }

      // ── 7. Required scores (upsert per dimension) ────────────
      const requiredUpserts = Object.entries(assessment.required).map(([dimension, score]) => ({
        assessment_id: aid,
        dimension,
        required_score: score,
      }))
      if (requiredUpserts.length) {
        await supabase
          .from('assessment_required_scores')
          .upsert(requiredUpserts, { onConflict: 'assessment_id,dimension' })
      }

      // ── 8. Institution profile ─────────────────────────────
      const { error: instErr } = await supabase.from('institutions').update({
        name:        assessment.profile.name,
        type:        assessment.profile.type  as any,
        level:       assessment.profile.level as any,
        mandate:     assessment.profile.mandate || null,
        scope:       assessment.profile.scope   || null,
        focal_name:  assessment.profile.focalName  || null,
        focal_title: assessment.profile.focalTitle || null,
        focal_email: assessment.profile.focalEmail || null,
      }).eq('id', user.institution_id)
      if (instErr) throw instErr

      // Reload from DB to confirm all data persisted correctly
      const refreshed = await loadInstitutionAssessment(user.institution_id)
      if (refreshed) setAssessment({ ...refreshed, id: aid, version })
      else setAssessment({ ...assessment, id: aid, version })
      // Clear any conflict backup — their data is now safely in DB
      localStorage.removeItem('kmgbf-conflict-backup')
      notify(t.topbar.saved)
    } catch (e: any) {
      console.error('Save error:', e)
      notify(`Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const currentLang = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0]

  return (
    <header
      className="sticky top-0 z-30 h-[58px] flex items-center justify-between px-8 border-b border-sand-300"
      style={{ background: 'rgba(246,243,238,.95)', backdropFilter: 'blur(10px)' }}
    >
      {/* Conflict banner — non-blocking, no data loss */}
      {conflictInfo && (
        <div style={{
          position:'fixed', top:58, left:0, right:0, zIndex:9998,
          background:'#1e3a5f', borderBottom:'2px solid #3b82f6',
          padding:'10px 24px', display:'flex', alignItems:'center', gap:12,
          fontSize:13, color:'white',
        }}>
          <span>👥</span>
          <span style={{ flex:1 }}>
            A teammate saved while you were editing. Your changes are backed up.
            Which version do you want to keep?
          </span>
          <button onClick={() => resolveConflict('mine')}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer',
              background:'#2d6a4f', color:'white', fontWeight:700, fontSize:12, whiteSpace:'nowrap' }}>
            Keep mine → Save now
          </button>
          <button onClick={() => resolveConflict('theirs')}
            style={{ padding:'6px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,.3)',
              cursor:'pointer', background:'transparent', color:'white', fontSize:12, whiteSpace:'nowrap' }}>
            Load theirs
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-forest-400">KMGBF CNA</span>
        <span className="text-sand-300 mx-1">/</span>
        <span className="font-semibold text-forest-600">{PAGE_TITLES[activePage]}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Not signed in warning */}
        {!user && (
          <span className="text-[11px] px-2.5 py-1 rounded-lg font-semibold"
            style={{ background: '#fef3c7', color: '#d97706' }}>
            {t.topbar.notSignedIn} — {t.topbar.localOnly}
          </span>
        )}

        {/* ── Language switcher ── */}
        <div className="relative">
          <button
            onClick={() => setShowLang(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sand-300 text-[12.5px] font-medium text-forest-600 hover:bg-forest-50 transition-colors"
          >
            <span>{currentLang.flag}</span>
            <span>{currentLang.label}</span>
            <ChevronDown size={11} style={{ opacity:0.5 }}/>
          </button>

          {showLang && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setShowLang(false)}/>
              {/* Dropdown */}
              <div className="absolute top-full mt-1.5 end-0 z-50 bg-white rounded-xl border border-sand-300 overflow-hidden"
                style={{ boxShadow: '0 8px 24px rgba(15,45,28,.12)', minWidth: 150 }}>
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code as LangCode); setShowLang(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-left hover:bg-forest-50 transition-colors"
                    style={{
                      background:  lang === l.code ? '#f0faf4' : 'white',
                      color:       lang === l.code ? '#1b4332' : '#131f18',
                      fontWeight:  lang === l.code ? 600 : 400,
                      direction:   l.code === 'ar' ? 'rtl' : 'ltr',
                    }}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                    {lang === l.code && <Check size={12} className="ms-auto" style={{ color:'#52b788' }}/>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Auto-saved indicator + Save button — hidden for viewers */}
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={save}
              disabled={saving}
              style={{ opacity: saving ? 0.7 : 1, minWidth: 90 }}
            >
              {saving
                ? <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    {t.topbar.saving}
                  </span>
                : <span className="flex items-center gap-1.5"><Save size={13}/> {t.topbar.save.replace('💾 ','')}</span>}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
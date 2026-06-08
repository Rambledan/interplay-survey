'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ResponseEntry, AdminStats } from '@/app/api/admin/responses/route'
import type { ReferralRow } from '@/lib/db'
import type { SurveySection } from '@/types/survey'
import { computeAllSectionScores, getScoreBand } from '@/lib/score'

// ── Section colour palette (light-mode readable) ───────────────────────────

const SECTION_COLORS: Record<string, string> = {
  'appetite':                  '#FF883E',
  'scale-and-delivery':        '#9D5AEF',
  'capability-sustainability':  '#3ecf6e',
  'capability-brand':           '#E8626D',
  'capability-business':        '#5F9FDF',
}

// ── Report template CMS constants ─────────────────────────────────────────

const SECTION_SLUGS_ORDERED = [
  'appetite',
  'scale-and-delivery',
  'capability-sustainability',
  'capability-brand',
  'capability-business',
]

const SECTION_SHORT_NAMES: Record<string, string> = {
  'appetite':                   'APPETITE',
  'scale-and-delivery':         'SCALE & AI',
  'capability-sustainability':  'SUSTAINABILITY',
  'capability-brand':           'BRAND',
  'capability-business':        'BUSINESS',
}

const INSIGHT_BAND_LABELS = [
  'Band 0 — EARLY STAGE (0–39%)',
  'Band 1 — DEVELOPING (40–59%)',
  'Band 2 — MATURING (60–79%)',
  'Band 3 — LEADING (80–100%)',
]

const ACTION_BAND_LABELS = [
  'Band 0 — EARLY STAGE (0–39%)',
  'Band 1 — DEVELOPING (40–59%)',
  'Band 2 — MATURING / LEADING (60–100%)',
]

function getSectionColor(slug: string) {
  return SECTION_COLORS[slug] ?? 'rgba(13,20,16,0.4)'
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

interface RespondentGroup {
  name: string
  role: string
  company: string
  sector: string
  companyType: string
  sections: ResponseEntry[]
}

// ── Group responses by respondent ─────────────────────────────────────────

function groupByRespondent(responses: ResponseEntry[]): RespondentGroup[] {
  const map = new Map<string, RespondentGroup>()

  for (const r of responses) {
    const key = r.respondentName.toLowerCase()
    if (!map.has(key)) {
      map.set(key, {
        name: r.respondentName,
        role: r.respondentRole,
        company: r.respondentCompany,
        sector: r.respondentSector,
        companyType: r.respondentType,
        sections: [],
      })
    }
    map.get(key)!.sections.push(r)
  }

  for (const group of map.values()) {
    group.sections.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTime = a.sections[0]?.timestamp ?? ''
    const bTime = b.sections[0]?.timestamp ?? ''
    return bTime.localeCompare(aTime)
  })
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-5 flex flex-col gap-1"
      style={{ backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.08)' }}>
      <span className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(13,20,16,0.45)' }}>{label}</span>
      <span className="text-2xl font-bold" style={{ color: '#0d1410' }}>{value}</span>
    </div>
  )
}

// ── Inline input helpers ────────────────────────────────────────────────────

function EditInput({ value, onChange, placeholder, multiline }: {
  value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean
}) {
  const style: React.CSSProperties = {
    width: '100%', padding: '6px 8px', fontSize: '0.8rem',
    backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.15)',
    color: '#0d1410', resize: multiline ? 'vertical' : undefined,
    fontFamily: 'inherit', outline: 'none',
  }
  return multiline
    ? <textarea rows={2} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={style}
        onFocus={e => e.currentTarget.style.borderColor = 'rgba(62,207,110,0.5)'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'} />
    : <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={style}
        onFocus={e => e.currentTarget.style.borderColor = 'rgba(62,207,110,0.5)'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'} />
}

function EditSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      width: '100%', padding: '6px 8px', fontSize: '0.8rem',
      backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.15)',
      color: '#0d1410', fontFamily: 'inherit', outline: 'none',
    }}>
      <option value="">— no answer —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

// ── Section row with answer editing ────────────────────────────────────────

function SectionRow({
  response,
  expanded,
  onToggle,
  password,
  allSections,
  onSaved,
  onDeleted,
}: {
  response: ResponseEntry
  expanded: boolean
  onToggle: () => void
  password: string
  allSections: SurveySection[]
  onSaved: () => void
  onDeleted: () => void
}) {
  const color = getSectionColor(response.sectionSlug)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editAnswers, setEditAnswers] = useState<Record<string, string>>({})
  const [editFollowUps, setEditFollowUps] = useState<Record<string, string>>({})

  const sectionMeta = allSections.find(s => s.slug === response.sectionSlug)

  function startEdit() {
    const a: Record<string, string> = {}
    const f: Record<string, string> = {}
    for (const entry of response.answers) {
      a[entry.questionId] = entry.answer
      if (entry.followUp) f[entry.questionId] = entry.followUp
    }
    setEditAnswers(a)
    setEditFollowUps(f)
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/admin/responses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
        body: JSON.stringify({ type: 'answers', id: response.id, answers: editAnswers, followUps: editFollowUps }),
      })
      setEditing(false)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm(`Delete this ${response.sectionName} section response? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/responses?id=${response.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${password}` },
      })
      onDeleted()
    } finally {
      setDeleting(false)
    }
  }

  // Questions in this section from questions.json for rendering proper inputs
  const sectionQuestions = sectionMeta?.questions ?? []

  return (
    <div style={{ borderTop: '1px solid rgba(13,20,16,0.06)' }}>
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-3 flex items-center gap-3 transition-colors"
        style={{ backgroundColor: expanded ? 'rgba(13,20,16,0.02)' : 'transparent' }}
        onMouseEnter={e => !expanded && (e.currentTarget.style.backgroundColor = 'rgba(13,20,16,0.02)')}
        onMouseLeave={e => !expanded && (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-mono px-2 py-0.5 border rounded-sm"
          style={{ borderColor: `${color}30`, backgroundColor: `${color}10`, color: '#0d1410' }}>
          {response.sectionName}
        </span>
        <span className="text-xs font-mono ml-auto" style={{ color: 'rgba(13,20,16,0.4)' }}>
          {formatDate(response.timestamp)}
        </span>
        <span className="text-xs font-mono shrink-0" style={{ color: 'rgba(13,20,16,0.35)' }}>
          {response.answers.length}q {expanded ? '▲' : '▼'}
        </span>
        <span
          role="button"
          onClick={handleDelete}
          className="text-xs font-mono px-2 py-0.5 shrink-0 transition-colors"
          style={{ color: deleting ? 'rgba(220,38,38,0.4)' : 'rgba(220,38,38,0.5)', cursor: deleting ? 'default' : 'pointer' }}
          onMouseEnter={e => !deleting && ((e.currentTarget as HTMLElement).style.color = 'rgb(220,38,38)')}
          onMouseLeave={e => !deleting && ((e.currentTarget as HTMLElement).style.color = 'rgba(220,38,38,0.5)')}
        >
          {deleting ? '…' : '✕'}
        </span>
      </button>

      {expanded && (
        <div style={{ backgroundColor: '#fafafa', borderTop: '1px solid rgba(13,20,16,0.05)' }}>
          {/* Edit / view toggle bar */}
          <div className="px-6 py-2 flex items-center justify-end gap-2"
            style={{ borderBottom: '1px solid rgba(13,20,16,0.05)' }}>
            {editing ? (
              <>
                <button onClick={() => setEditing(false)}
                  disabled={saving}
                  className="text-xs font-mono px-3 py-1 transition-colors disabled:opacity-40"
                  style={{ color: 'rgba(13,20,16,0.45)' }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="text-xs font-mono px-3 py-1 transition-colors disabled:opacity-40"
                  style={{ border: '1px solid rgba(62,207,110,0.4)', color: '#22a855' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(62,207,110,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  {saving ? 'Saving…' : 'Save answers'}
                </button>
              </>
            ) : (
              <button onClick={startEdit}
                className="text-xs font-mono px-3 py-1 transition-colors"
                style={{ border: '1px solid rgba(13,20,16,0.12)', color: 'rgba(13,20,16,0.5)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.3)'; e.currentTarget.style.color = '#0d1410' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.12)'; e.currentTarget.style.color = 'rgba(13,20,16,0.5)' }}>
                Edit answers
              </button>
            )}
          </div>

          {/* Answer rows */}
          {response.answers.length === 0 ? (
            <p className="px-6 py-4 text-sm italic" style={{ color: 'rgba(13,20,16,0.4)' }}>No answers recorded.</p>
          ) : editing ? (
            // ── Edit mode ──
            <div>
              {sectionQuestions.map(q => {
                const curAnswer = editAnswers[q.id] ?? ''
                const curFollowUp = editFollowUps[q.id] ?? ''
                return (
                  <div key={q.id} className="px-6 py-3"
                    style={{ borderBottom: '1px solid rgba(13,20,16,0.04)' }}>
                    <p className="text-xs mb-2" style={{ color: 'rgba(13,20,16,0.5)' }}>{q.text}</p>
                    {(q.type === 'text-options' || q.type === 'percentage') && q.options?.length ? (
                      <EditSelect
                        value={curAnswer}
                        onChange={v => setEditAnswers(prev => ({ ...prev, [q.id]: v }))}
                        options={q.options}
                      />
                    ) : (
                      <EditInput
                        value={curAnswer}
                        onChange={v => setEditAnswers(prev => ({ ...prev, [q.id]: v }))}
                        placeholder="Answer…"
                        multiline={q.type === 'open-answer'}
                      />
                    )}
                    {q.followUpLabel && (
                      <div className="mt-2">
                        <p className="text-[10px] font-mono uppercase tracking-wider mb-1"
                          style={{ color: 'rgba(13,20,16,0.35)' }}>{q.followUpLabel}</p>
                        <EditInput
                          value={curFollowUp}
                          onChange={v => setEditFollowUps(prev => ({ ...prev, [q.id]: v }))}
                          placeholder="Follow-up response…"
                          multiline
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            // ── View mode ──
            response.answers.map((a) => (
              <div key={a.questionId} className="px-6 py-3"
                style={{ borderBottom: '1px solid rgba(13,20,16,0.04)' }}>
                <p className="text-xs mb-1" style={{ color: 'rgba(13,20,16,0.45)' }}>{a.questionText}</p>
                <p className="text-sm font-medium" style={{ color: a.answer ? '#0d1410' : 'rgba(13,20,16,0.25)' }}>
                  {a.answer || <span className="italic">No answer</span>}
                </p>
                {a.followUp && (
                  <p className="text-xs mt-1 pl-3 italic"
                    style={{ color: 'rgba(13,20,16,0.45)', borderLeft: '2px solid rgba(13,20,16,0.1)' }}>
                    {a.followUp}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface TokenRow {
  id: number
  token: string
  respondent_name: string
  created_at: string
  revoked_at: string | null
}

function ResultsLinkPanel({ respondentName, password }: { respondentName: string; password: string }) {
  const [open, setOpen] = useState(false)
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [revokingToken, setRevokingToken] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function fetchTokens() {
    setLoadingTokens(true)
    try {
      const res = await fetch(
        `/api/admin/tokens?respondent=${encodeURIComponent(respondentName)}`,
        { headers: { Authorization: `Bearer ${password}` } }
      )
      if (res.ok) {
        const data = await res.json()
        setTokens(data.tokens ?? [])
      }
    } finally {
      setLoadingTokens(false)
    }
  }

  function handleToggle() {
    if (!open) fetchTokens()
    setOpen(o => !o)
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
        body: JSON.stringify({ respondentName }),
      })
      if (res.ok) await fetchTokens()
    } finally {
      setGenerating(false)
    }
  }

  async function handleRevoke(token: string) {
    setRevokingToken(token)
    try {
      const res = await fetch(
        `/api/admin/tokens?token=${encodeURIComponent(token)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${password}` } }
      )
      if (res.ok) await fetchTokens()
    } finally {
      setRevokingToken(null)
      setConfirmRevoke(null)
    }
  }

  function getResultsUrl(token: string) {
    return `${window.location.origin}/results/${token}`
  }

  async function handleCopy(token: string) {
    await navigator.clipboard.writeText(getResultsUrl(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const activeTokens = tokens.filter(t => !t.revoked_at)

  return (
    <div style={{ borderTop: '1px solid rgba(13,20,16,0.06)' }}>
      <button
        onClick={handleToggle}
        className="w-full text-left px-5 py-3 flex items-center gap-3 transition-colors"
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(13,20,16,0.02)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(62,207,110,0.7)' }} />
        <span className="text-xs font-mono" style={{ color: 'rgba(62,207,110,0.9)' }}>RESULTS LINKS</span>
        {activeTokens.length > 0 && (
          <span className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
            style={{ backgroundColor: 'rgba(62,207,110,0.1)', border: '1px solid rgba(62,207,110,0.25)', color: '#22a855' }}>
            {activeTokens.length} active
          </span>
        )}
        <span className="text-xs font-mono ml-auto shrink-0" style={{ color: 'rgba(13,20,16,0.35)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="px-5 py-4 flex flex-col gap-4" style={{ backgroundColor: '#fafafa' }}>
          {loadingTokens ? (
            <p className="text-xs font-mono animate-pulse" style={{ color: 'rgba(13,20,16,0.4)' }}>Loading…</p>
          ) : tokens.length === 0 ? (
            <p className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>No links generated yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {tokens.map(t => (
                <div key={t.token}
                  className="flex items-center gap-3 flex-wrap p-3"
                  style={{
                    border: `1px solid ${t.revoked_at ? 'rgba(13,20,16,0.06)' : 'rgba(13,20,16,0.1)'}`,
                    backgroundColor: t.revoked_at ? 'transparent' : '#fff',
                    opacity: t.revoked_at ? 0.45 : 1,
                  }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate" style={{ color: 'rgba(13,20,16,0.6)' }}>
                      /results/{t.token.slice(0, 12)}…
                    </p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(13,20,16,0.35)' }}>
                      Created {formatDate(t.created_at)}
                      {t.revoked_at && <span style={{ color: '#dc2626', marginLeft: '0.5rem' }}>Revoked</span>}
                    </p>
                  </div>
                  {!t.revoked_at && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleCopy(t.token)}
                        className="text-xs font-mono px-2 py-1 transition-colors"
                        style={{ border: '1px solid rgba(13,20,16,0.15)', color: 'rgba(13,20,16,0.55)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.35)'; e.currentTarget.style.color = '#0d1410' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'; e.currentTarget.style.color = 'rgba(13,20,16,0.55)' }}>
                        {copied === t.token ? 'Copied ✓' : 'Copy URL'}
                      </button>
                      <button onClick={() => window.open(getResultsUrl(t.token), '_blank')}
                        className="text-xs font-mono px-2 py-1 transition-colors"
                        style={{ border: '1px solid rgba(13,20,16,0.15)', color: 'rgba(13,20,16,0.55)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(62,207,110,0.4)'; e.currentTarget.style.color = '#22a855' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'; e.currentTarget.style.color = 'rgba(13,20,16,0.55)' }}>
                        Preview ↗
                      </button>
                      <button onClick={() => window.open(`${window.location.origin}/api/results/${t.token}/pdf`, '_blank')}
                        className="text-xs font-mono px-2 py-1 transition-colors"
                        style={{ border: '1px solid rgba(13,20,16,0.15)', color: 'rgba(13,20,16,0.55)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(95,159,223,0.5)'; e.currentTarget.style.color = '#5F9FDF' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'; e.currentTarget.style.color = 'rgba(13,20,16,0.55)' }}>
                        PDF ↓
                      </button>
                      {confirmRevoke === t.token ? (
                        <>
                          <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.45)' }}>Revoke?</span>
                          <button onClick={() => handleRevoke(t.token)} disabled={revokingToken === t.token}
                            className="text-xs font-mono px-2 py-1 transition-colors disabled:opacity-40"
                            style={{ border: '1px solid rgba(220,38,38,0.4)', color: '#dc2626' }}>
                            {revokingToken === t.token ? '…' : 'Yes'}
                          </button>
                          <button onClick={() => setConfirmRevoke(null)}
                            className="text-xs font-mono transition-colors"
                            style={{ color: 'rgba(13,20,16,0.45)' }}>
                            No
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmRevoke(t.token)}
                          className="text-xs font-mono px-2 py-1 transition-colors"
                          style={{ border: '1px solid rgba(13,20,16,0.15)', color: 'rgba(13,20,16,0.45)' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(220,38,38,0.4)'; e.currentTarget.style.color = '#dc2626' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'; e.currentTarget.style.color = 'rgba(13,20,16,0.45)' }}>
                          Revoke
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button onClick={handleGenerate} disabled={generating}
            className="self-start text-xs font-mono px-4 py-2 transition-colors disabled:opacity-40"
            style={{ border: '1px solid rgba(62,207,110,0.35)', color: '#22a855' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(62,207,110,0.07)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            {generating ? 'Generating…' : '+ Generate new link'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Referrals panel ────────────────────────────────────────────────────────

function ReferralsPanel({ referrals }: { referrals: ReferralRow[] }) {
  const [open, setOpen] = useState(false)
  if (referrals.length === 0) return null

  return (
    <div style={{ borderTop: '1px solid rgba(13,20,16,0.06)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-3 flex items-center gap-3 transition-colors"
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(13,20,16,0.02)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(250,240,0,0.8)' }} />
        <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.55)' }}>REFERRALS</span>
        <span className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
          style={{ backgroundColor: 'rgba(250,240,0,0.15)', border: '1px solid rgba(250,240,0,0.4)', color: '#7a7000' }}>
          {referrals.length}
        </span>
        <span className="text-xs font-mono ml-auto shrink-0" style={{ color: 'rgba(13,20,16,0.35)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-4" style={{ backgroundColor: '#fafafa' }}>
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(13,20,16,0.08)' }}>
                <th className="text-left py-2 font-mono uppercase tracking-wider" style={{ color: 'rgba(13,20,16,0.4)', fontWeight: 500 }}>Name</th>
                <th className="text-left py-2 font-mono uppercase tracking-wider" style={{ color: 'rgba(13,20,16,0.4)', fontWeight: 500 }}>Email</th>
                <th className="text-left py-2 font-mono uppercase tracking-wider" style={{ color: 'rgba(13,20,16,0.4)', fontWeight: 500 }}>Referred</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(13,20,16,0.04)' }}>
                  <td className="py-2 pr-4" style={{ color: '#0d1410' }}>{r.referee_name}</td>
                  <td className="py-2 pr-4">
                    <a href={`mailto:${r.referee_email}`}
                      className="font-mono transition-colors"
                      style={{ color: 'rgba(13,20,16,0.6)' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#0d1410'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(13,20,16,0.6)'}>
                      {r.referee_email}
                    </a>
                  </td>
                  <td className="py-2 font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>
                    {formatDate(r.submitted_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Global Report Template Editor ─────────────────────────────────────────

type HwchItem = { title: string; content: string }
type HwchBand = { intro?: string; items?: HwchItem[] }

type TemplateSectionContent = {
  insights: string[]
  actions: string[]
  howWeCanHelp: HwchBand[]  // 3 entries, one per action band
}

type TemplateContent = {
  sections: Record<string, TemplateSectionContent>
  evidence: string[]
}

// ── How We Can Help band editor ────────────────────────────────────────────

function HwchBandEditor({
  band,
  onChange,
}: {
  band: HwchBand
  onChange: (updated: HwchBand) => void
}) {
  const items = band.items ?? []

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '5px 8px', fontSize: '0.78rem',
    backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.15)',
    color: '#0d1410', fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Intro */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-wider mb-1"
          style={{ color: 'rgba(13,20,16,0.35)' }}>Introduction (optional)</p>
        <CmsTextarea rows={2} value={band.intro ?? ''}
          placeholder="Optional intro paragraph shown above the items…"
          onChange={v => onChange({ ...band, intro: v })} />
      </div>

      {/* Items */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-wider mb-2"
          style={{ color: 'rgba(13,20,16,0.35)' }}>
          Recommendation items ({items.length})
        </p>
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <div key={i} style={{ border: '1px solid rgba(13,20,16,0.08)', padding: '10px', backgroundColor: '#fafafa' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono" style={{ color: 'rgba(13,20,16,0.3)' }}>#{i + 1}</span>
                <input
                  value={item.title}
                  onChange={e => {
                    const newItems = items.map((it, idx) => idx === i ? { ...it, title: e.target.value } : it)
                    onChange({ ...band, items: newItems })
                  }}
                  placeholder="Title…"
                  style={{ ...inputStyle, fontWeight: 600 }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(62,207,110,0.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'}
                />
                <button
                  onClick={() => onChange({ ...band, items: items.filter((_, idx) => idx !== i) })}
                  style={{ fontSize: '0.7rem', color: 'rgba(220,50,50,0.6)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 4px' }}
                  title="Remove item"
                >✕</button>
              </div>
              <CmsTextarea rows={2} value={item.content} placeholder="Content…"
                onChange={v => {
                  const newItems = items.map((it, idx) => idx === i ? { ...it, content: v } : it)
                  onChange({ ...band, items: newItems })
                }} />
            </div>
          ))}
        </div>
        <button
          onClick={() => onChange({ ...band, items: [...items, { title: '', content: '' }] })}
          className="mt-2 text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 transition-colors"
          style={{ border: '1px dashed rgba(13,20,16,0.2)', color: 'rgba(13,20,16,0.45)', background: 'none', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(62,207,110,0.5)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.2)'}
        >+ Add item</button>
      </div>
    </div>
  )
}

function CmsTextarea({ value, onChange, rows, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <textarea
      rows={rows ?? 3}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '6px 8px', fontSize: '0.8rem',
        backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.15)',
        color: '#0d1410', resize: 'vertical', fontFamily: 'inherit', outline: 'none',
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'rgba(62,207,110,0.5)'}
      onBlur={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'}
    />
  )
}

function GlobalTemplatePanel({ password }: { password: string }) {
  const [open, setOpen] = useState(false)
  const [activeSlug, setActiveSlug] = useState<string>('appetite')
  const [content, setContent] = useState<TemplateContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  async function fetchTemplate() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/report-cms?type=global', {
        headers: { Authorization: `Bearer ${password}` },
      })
      if (res.ok) {
        const data = await res.json()
        setContent(data.template as TemplateContent)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleToggle() {
    if (!open && !content) fetchTemplate()
    setOpen(o => !o)
  }

  async function handleSave() {
    if (!content) return
    setSaving(true)
    setSavedMsg(false)
    try {
      await fetch('/api/admin/report-cms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
        body: JSON.stringify({ type: 'global', content }),
      })
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  function updateField(
    slug: string,
    field: 'insights' | 'actions',
    idx: number,
    value: string
  ) {
    setContent(prev => {
      if (!prev) return prev
      const newArr = [...(prev.sections[slug]?.[field] ?? [])]
      newArr[idx] = value
      return {
        ...prev,
        sections: { ...prev.sections, [slug]: { ...prev.sections[slug], [field]: newArr } },
      }
    })
  }

  function updateHwch(slug: string, bandIdx: number, updated: HwchBand) {
    setContent(prev => {
      if (!prev) return prev
      const newBands = [...(prev.sections[slug]?.howWeCanHelp ?? [])]
      newBands[bandIdx] = updated
      return {
        ...prev,
        sections: { ...prev.sections, [slug]: { ...prev.sections[slug], howWeCanHelp: newBands } },
      }
    })
  }

  function updateEvidence(idx: number, value: string) {
    setContent(prev => {
      if (!prev) return prev
      const ev = [...prev.evidence]
      ev[idx] = value
      return { ...prev, evidence: ev }
    })
  }

  const activeSection = content?.sections[activeSlug]

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.08)', marginBottom: '1.5rem' }}>
      <button
        onClick={handleToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-3 transition-colors"
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(13,20,16,0.015)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#faf000' }} />
        <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: '#0d1410' }}>
          Report Templates
        </span>
        <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.4)' }}>
          — edit global report content for all participants
        </span>
        <span className="text-xs font-mono ml-auto shrink-0" style={{ color: 'rgba(13,20,16,0.35)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid rgba(13,20,16,0.06)' }}>
          {loading ? (
            <p className="px-5 py-8 text-xs font-mono animate-pulse" style={{ color: 'rgba(13,20,16,0.4)' }}>
              Loading template…
            </p>
          ) : !content ? (
            <p className="px-5 py-8 text-xs font-mono" style={{ color: 'rgba(13,20,16,0.4)' }}>
              Could not load template.
            </p>
          ) : (
            <div>
              {/* Section tabs */}
              <div className="flex gap-0 px-5 pt-4 flex-wrap"
                style={{ borderBottom: '1px solid rgba(13,20,16,0.06)' }}>
                {SECTION_SLUGS_ORDERED.map(slug => {
                  const color = SECTION_COLORS[slug] ?? '#888'
                  const isActive = activeSlug === slug
                  return (
                    <button
                      key={slug}
                      onClick={() => setActiveSlug(slug)}
                      className="text-xs font-mono px-3 py-2 transition-colors"
                      style={{
                        borderWidth: '1px 1px 0 1px', borderStyle: 'solid',
                        borderColor: isActive ? `${color}40` : 'transparent',
                        color: isActive ? color : 'rgba(13,20,16,0.45)',
                        backgroundColor: isActive ? `${color}08` : 'transparent',
                        marginBottom: isActive ? '-1px' : '0',
                      }}
                    >
                      {SECTION_SHORT_NAMES[slug]}
                    </button>
                  )
                })}
                <button
                  onClick={() => setActiveSlug('evidence')}
                  className="text-xs font-mono px-3 py-2 transition-colors"
                  style={{
                    borderWidth: '1px 1px 0 1px', borderStyle: 'solid',
                    borderColor: activeSlug === 'evidence' ? 'rgba(62,207,110,0.4)' : 'transparent',
                    color: activeSlug === 'evidence' ? '#22a855' : 'rgba(13,20,16,0.45)',
                    backgroundColor: activeSlug === 'evidence' ? 'rgba(62,207,110,0.06)' : 'transparent',
                    marginBottom: activeSlug === 'evidence' ? '-1px' : '0',
                  }}
                >
                  EVIDENCE
                </button>
              </div>

              {/* Evidence tab */}
              {activeSlug === 'evidence' && (
                <div className="px-5 py-5 flex flex-col gap-4">
                  <p className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.4)' }}>
                    These references appear on the final page of every report.
                  </p>
                  {content.evidence.map((ev, i) => (
                    <div key={i}>
                      <p className="text-[10px] font-mono uppercase tracking-wider mb-1"
                        style={{ color: 'rgba(13,20,16,0.35)' }}>Reference {i + 1}</p>
                      <CmsTextarea rows={3} value={ev} onChange={v => updateEvidence(i, v)} />
                    </div>
                  ))}
                </div>
              )}

              {/* Section content tab */}
              {activeSlug !== 'evidence' && activeSection && (
                <div className="px-5 py-5 flex flex-col gap-6">
                  {/* Insights */}
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider mb-3"
                      style={{ color: 'rgba(13,20,16,0.5)', fontWeight: 600 }}>Insights</p>
                    {INSIGHT_BAND_LABELS.map((label, i) => (
                      <div key={i} className="mb-4">
                        <p className="text-[10px] font-mono uppercase tracking-wider mb-1"
                          style={{ color: 'rgba(13,20,16,0.35)' }}>{label}</p>
                        <CmsTextarea rows={3} value={activeSection.insights[i] ?? ''}
                          onChange={v => updateField(activeSlug, 'insights', i, v)} />
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider mb-3"
                      style={{ color: 'rgba(13,20,16,0.5)', fontWeight: 600 }}>Recommended Actions</p>
                    {ACTION_BAND_LABELS.map((label, i) => (
                      <div key={i} className="mb-4">
                        <p className="text-[10px] font-mono uppercase tracking-wider mb-1"
                          style={{ color: 'rgba(13,20,16,0.35)' }}>{label}</p>
                        <CmsTextarea rows={2} value={activeSection.actions[i] ?? ''}
                          onChange={v => updateField(activeSlug, 'actions', i, v)} />
                      </div>
                    ))}
                  </div>

                  {/* How We Can Help */}
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider mb-3"
                      style={{ color: 'rgba(13,20,16,0.5)', fontWeight: 600 }}>How We Can Help</p>
                    {ACTION_BAND_LABELS.map((label, i) => (
                      <div key={i} className="mb-5" style={{ borderLeft: '2px solid rgba(13,20,16,0.08)', paddingLeft: '12px' }}>
                        <p className="text-[10px] font-mono uppercase tracking-wider mb-2"
                          style={{ color: 'rgba(13,20,16,0.4)' }}>{label}</p>
                        <HwchBandEditor
                          band={activeSection.howWeCanHelp[i] ?? { items: [] }}
                          onChange={updated => updateHwch(activeSlug, i, updated)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="px-5 py-4 flex items-center gap-4"
                style={{ borderTop: '1px solid rgba(13,20,16,0.06)', backgroundColor: '#fafafa' }}>
                <button
                  onClick={handleSave} disabled={saving}
                  className="text-xs font-mono px-4 py-2 transition-colors disabled:opacity-40"
                  style={{ border: '1px solid rgba(62,207,110,0.4)', color: '#22a855' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(62,207,110,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {saving ? 'Saving…' : 'Save template'}
                </button>
                {savedMsg && (
                  <span className="text-xs font-mono" style={{ color: '#22a855' }}>Saved ✓</span>
                )}
                <span className="text-xs font-mono ml-auto" style={{ color: 'rgba(13,20,16,0.3)' }}>
                  Applies to all future PDF exports
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Per-respondent Report Override Editor ──────────────────────────────────

type OverrideSection = { insight: string; action: string; howWeCanHelp: HwchBand }
type OverrideState = Record<string, OverrideSection>

function ReportOverridePanel({
  respondentName,
  password,
  completedSlugs,
}: {
  respondentName: string
  password: string
  completedSlugs: string[]
}) {
  const [open, setOpen] = useState(false)
  const [overrides, setOverrides] = useState<OverrideState>({})
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  async function fetchOverride() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/report-cms?type=respondent&name=${encodeURIComponent(respondentName)}`,
        { headers: { Authorization: `Bearer ${password}` } }
      )
      if (res.ok) {
        const data = await res.json()
        const init: OverrideState = {}
        for (const slug of completedSlugs) {
          init[slug] = {
            insight: data.override?.sections?.[slug]?.insight ?? '',
            action: data.override?.sections?.[slug]?.action ?? '',
            howWeCanHelp: data.override?.sections?.[slug]?.howWeCanHelp ?? { items: [] },
          }
        }
        setOverrides(init)
        setLoaded(true)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleToggle() {
    if (!open && !loaded) fetchOverride()
    setOpen(o => !o)
  }

  async function handleSave() {
    setSaving(true)
    setSavedMsg(false)
    try {
      const sections: Record<string, Record<string, unknown>> = {}
      for (const [slug, vals] of Object.entries(overrides)) {
        const sec: Record<string, unknown> = {}
        if (vals.insight.trim()) sec.insight = vals.insight
        if (vals.action.trim()) sec.action = vals.action
        const hwch = vals.howWeCanHelp
        const hasHwch = hwch.intro?.trim() || hwch.items?.some(it => it.title.trim() || it.content.trim())
        if (hasHwch) sec.howWeCanHelp = hwch
        if (Object.keys(sec).length > 0) sections[slug] = sec
      }
      await fetch('/api/admin/report-cms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
        body: JSON.stringify({ type: 'respondent', name: respondentName, content: { sections } }),
      })
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  function updateField(slug: string, field: 'insight' | 'action', value: string) {
    setOverrides(prev => ({
      ...prev,
      [slug]: { ...(prev[slug] ?? { insight: '', action: '', howWeCanHelp: { items: [] } }), [field]: value },
    }))
  }

  function updateOverrideHwch(slug: string, updated: HwchBand) {
    setOverrides(prev => ({
      ...prev,
      [slug]: { ...(prev[slug] ?? { insight: '', action: '', howWeCanHelp: { items: [] } }), howWeCanHelp: updated },
    }))
  }

  const sectionsToShow = SECTION_SLUGS_ORDERED.filter(s => completedSlugs.includes(s))

  return (
    <div style={{ borderTop: '1px solid rgba(13,20,16,0.06)' }}>
      <button
        onClick={handleToggle}
        className="w-full text-left px-5 py-3 flex items-center gap-3 transition-colors"
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(13,20,16,0.02)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: 'rgba(168,85,247,0.6)' }} />
        <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.55)' }}>REPORT OVERRIDES</span>
        <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>
          — custom content for this participant&apos;s report
        </span>
        <span className="text-xs font-mono ml-auto shrink-0" style={{ color: 'rgba(13,20,16,0.35)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="px-5 py-4 flex flex-col gap-5" style={{ backgroundColor: '#fafafa' }}>
          {loading ? (
            <p className="text-xs font-mono animate-pulse" style={{ color: 'rgba(13,20,16,0.4)' }}>
              Loading overrides…
            </p>
          ) : (
            <>
              <p className="text-xs" style={{ color: 'rgba(13,20,16,0.45)' }}>
                Override specific report content for this participant only.
                Leave any field blank to use the global template content.
              </p>

              {sectionsToShow.map(slug => (
                <div key={slug}>
                  <p className="text-xs font-mono font-bold uppercase tracking-wider mb-3"
                    style={{ color: SECTION_COLORS[slug] ?? '#888' }}>
                    {SECTION_SHORT_NAMES[slug] ?? slug}
                  </p>
                  <div className="flex flex-col gap-3">
                    {(
                      [
                        { key: 'insight' as const, label: 'Insight', rows: 3 },
                        { key: 'action' as const, label: 'Recommended Action', rows: 2 },
                      ] as Array<{ key: 'insight' | 'action'; label: string; rows: number }>
                    ).map(({ key, label, rows }) => (
                      <div key={key}>
                        <p className="text-[10px] font-mono uppercase tracking-wider mb-1"
                          style={{ color: 'rgba(13,20,16,0.35)' }}>{label}</p>
                        <CmsTextarea
                          rows={rows}
                          value={overrides[slug]?.[key] ?? ''}
                          onChange={v => updateField(slug, key, v)}
                          placeholder="Leave blank to use template content"
                        />
                      </div>
                    ))}
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider mb-2"
                        style={{ color: 'rgba(13,20,16,0.35)' }}>How We Can Help (overrides template)</p>
                      <HwchBandEditor
                        band={overrides[slug]?.howWeCanHelp ?? { items: [] }}
                        onChange={updated => updateOverrideHwch(slug, updated)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSave} disabled={saving}
                  className="self-start text-xs font-mono px-4 py-2 transition-colors disabled:opacity-40"
                  style={{ border: '1px solid rgba(62,207,110,0.35)', color: '#22a855' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(62,207,110,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {saving ? 'Saving…' : 'Save overrides'}
                </button>
                {savedMsg && (
                  <span className="text-xs font-mono" style={{ color: '#22a855' }}>Saved ✓</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function RespondentCard({
  group,
  password,
  activeSection,
  expandedSectionId,
  onToggleSection,
  onDelete,
  deleting,
  allSections,
  onRefresh,
  referrals,
}: {
  group: RespondentGroup
  password: string
  activeSection: string
  expandedSectionId: string | null
  onToggleSection: (id: string) => void
  onDelete: (name: string) => void
  deleting: boolean
  allSections: SurveySection[]
  onRefresh: () => void
  referrals: ReferralRow[]
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profile, setProfile] = useState({
    name: group.name, role: group.role, company: group.company,
    sector: group.sector, companyType: group.companyType,
  })

  // Keep local profile in sync if group prop changes (after refresh)
  useEffect(() => {
    setProfile({ name: group.name, role: group.role, company: group.company, sector: group.sector, companyType: group.companyType })
  }, [group.name, group.role, group.company, group.sector, group.companyType])

  async function handleSaveProfile() {
    setSavingProfile(true)
    try {
      await fetch('/api/admin/responses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
        body: JSON.stringify({ type: 'profile', oldName: group.name, ...profile }),
      })
      setEditingProfile(false)
      onRefresh()
    } finally {
      setSavingProfile(false)
    }
  }

  const visibleSections =
    activeSection === 'all'
      ? group.sections
      : group.sections.filter(s => s.sectionSlug === activeSection)

  if (visibleSections.length === 0) return null

  const latest = group.sections.reduce((a, b) =>
    a.timestamp > b.timestamp ? a : b
  )

  const fieldStyle: React.CSSProperties = {
    padding: '5px 8px', fontSize: '0.8rem', backgroundColor: '#fff',
    border: '1px solid rgba(13,20,16,0.15)', color: '#0d1410',
    fontFamily: 'inherit', outline: 'none', width: '100%',
  }

  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.08)' }}>
      {/* Respondent header */}
      <div className="px-5 py-4">
        {editingProfile ? (
          // ── Profile edit form ──
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'rgba(13,20,16,0.4)' }}>Name</p>
                <input style={fieldStyle} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(62,207,110,0.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'} />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'rgba(13,20,16,0.4)' }}>Role</p>
                <input style={fieldStyle} value={profile.role} onChange={e => setProfile(p => ({ ...p, role: e.target.value }))}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(62,207,110,0.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'} />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'rgba(13,20,16,0.4)' }}>Company</p>
                <input style={fieldStyle} value={profile.company} onChange={e => setProfile(p => ({ ...p, company: e.target.value }))}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(62,207,110,0.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'} />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'rgba(13,20,16,0.4)' }}>Sector</p>
                <input style={fieldStyle} value={profile.sector} onChange={e => setProfile(p => ({ ...p, sector: e.target.value }))}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(62,207,110,0.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'} />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'rgba(13,20,16,0.4)' }}>Type</p>
                <select style={fieldStyle} value={profile.companyType} onChange={e => setProfile(p => ({ ...p, companyType: e.target.value }))}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(62,207,110,0.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'}>
                  <option value="">—</option>
                  <option value="Public">Public</option>
                  <option value="Private">Private</option>
                  <option value="Not-for-profit">Not-for-profit</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSaveProfile} disabled={savingProfile || !profile.name.trim()}
                className="text-xs font-mono px-3 py-1.5 transition-colors disabled:opacity-40"
                style={{ border: '1px solid rgba(62,207,110,0.4)', color: '#22a855' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(62,207,110,0.07)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
              <button onClick={() => { setEditingProfile(false); setProfile({ name: group.name, role: group.role, company: group.company, sector: group.sector, companyType: group.companyType }) }}
                className="text-xs font-mono px-2 py-1.5" style={{ color: 'rgba(13,20,16,0.45)' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // ── Profile display ──
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-bold" style={{ color: '#0d1410' }}>{group.name}</span>
                {group.role && <span className="text-xs" style={{ color: 'rgba(13,20,16,0.5)' }}>{group.role}</span>}
                {group.companyType && (
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
                    style={{ border: '1px solid rgba(13,20,16,0.12)', color: 'rgba(13,20,16,0.45)' }}>
                    {group.companyType}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {group.company && <span className="text-xs" style={{ color: 'rgba(13,20,16,0.6)' }}>{group.company}</span>}
                {group.company && group.sector && <span className="text-xs" style={{ color: 'rgba(13,20,16,0.2)' }}>·</span>}
                {group.sector && <span className="text-xs" style={{ color: 'rgba(13,20,16,0.4)' }}>{group.sector}</span>}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.4)' }}>
                  {group.sections.length} section{group.sections.length !== 1 ? 's' : ''} completed
                </span>
                <span className="text-xs" style={{ color: 'rgba(13,20,16,0.2)' }}>·</span>
                <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.4)' }}>
                  Last: {formatDate(latest.timestamp)}
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {/* Edit profile button */}
              <button onClick={() => setEditingProfile(true)}
                className="text-xs font-mono px-3 py-1.5 transition-colors"
                style={{ border: '1px solid rgba(13,20,16,0.12)', color: 'rgba(13,20,16,0.45)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.3)'; e.currentTarget.style.color = '#0d1410' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.12)'; e.currentTarget.style.color = 'rgba(13,20,16,0.45)' }}>
                Edit
              </button>

              {/* Delete control */}
              {confirmDelete ? (
                <>
                  <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.5)' }}>Delete all?</span>
                  <button onClick={() => { setConfirmDelete(false); onDelete(group.name) }} disabled={deleting}
                    className="text-xs font-mono px-3 py-1.5 transition-colors disabled:opacity-40"
                    style={{ border: '1px solid rgba(220,38,38,0.5)', color: '#dc2626' }}>
                    {deleting ? '…' : 'Confirm'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="text-xs font-mono px-2 py-1.5" style={{ color: 'rgba(13,20,16,0.45)' }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="text-xs font-mono px-3 py-1.5 transition-colors"
                  style={{ border: '1px solid rgba(13,20,16,0.12)', color: 'rgba(13,20,16,0.45)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(220,38,38,0.4)'; e.currentTarget.style.color = '#dc2626' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.12)'; e.currentTarget.style.color = 'rgba(13,20,16,0.45)' }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section rows */}
      {visibleSections.map(r => (
        <SectionRow
          key={r.id}
          response={r}
          expanded={expandedSectionId === r.id}
          onToggle={() => onToggleSection(r.id)}
          password={password}
          allSections={allSections}
          onSaved={onRefresh}
          onDeleted={onRefresh}
        />
      ))}

      {/* Results link panel */}
      <ResultsLinkPanel respondentName={group.name} password={password} />

      {/* Referrals panel */}
      <ReferralsPanel referrals={referrals} />

      {/* Per-respondent report overrides */}
      <ReportOverridePanel
        respondentName={group.name}
        password={password}
        completedSlugs={[...new Set(group.sections.map(s => s.sectionSlug))]}
      />
    </div>
  )
}

// ── Dashboard helpers ──────────────────────────────────────────────────────

function buildAnswerMap(sections: ResponseEntry[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const section of sections) {
    for (const a of section.answers) {
      if (a.answer) map[a.questionId] = a.answer
    }
  }
  return map
}

const BAND_COLORS = ['#dc2626', '#d97706', '#3b82f6', '#22a855']
const BAND_LABELS = ['Early Stage', 'Developing', 'Maturing', 'Leading']

// Simple horizontal bar (used for pillar averages, sector counts, etc.)
function HBar({
  label, value, max = 100, color, labelWidth = 110, unit = '%',
}: { label: string; value: number; max?: number; color: string; labelWidth?: number; unit?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="font-mono uppercase tracking-wider text-right shrink-0 truncate"
        style={{ width: labelWidth, color: 'rgba(13,20,16,0.5)', fontSize: '11px' }}>
        {label}
      </span>
      <div className="relative h-6 flex-1 rounded-sm overflow-hidden" style={{ backgroundColor: 'rgba(13,20,16,0.04)', minWidth: 0 }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, opacity: 0.82, transition: 'width 0.5s ease' }} />
        <span className="absolute right-2 inset-y-0 flex items-center font-mono text-xs"
          style={{ color: 'rgba(13,20,16,0.55)' }}>
          {value}{unit === '%' ? '%' : unit === 'n' ? '' : unit}
        </span>
      </div>
    </div>
  )
}

// Micro score chip shown in the respondent table
function ScoreChip({ pct, color }: { pct: number | null; color: string }) {
  if (pct === null) return <span style={{ color: 'rgba(13,20,16,0.2)', fontFamily: 'monospace' }}>—</span>
  const { label } = getScoreBand(pct)
  return (
    <span title={label} style={{
      display: 'inline-block',
      fontFamily: 'monospace', fontSize: '12px', fontWeight: 600,
      color, minWidth: 36, textAlign: 'center',
    }}>
      {pct}%
    </span>
  )
}

// Pentagon SVG for a respondent's scores
function MiniPentagon({ scores, size = 72 }: { scores: Record<string, number>; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38
  const slugs = SECTION_SLUGS_ORDERED
  const pts = slugs.map((_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })
  const outerPoly = pts.map(p => `${p.x},${p.y}`).join(' ')
  const innerPts = slugs.map((slug, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
    const pct = (scores[slug] ?? 0) / 100
    return { x: cx + r * pct * Math.cos(angle), y: cy + r * pct * Math.sin(angle) }
  })
  const innerPoly = innerPts.map(p => `${p.x},${p.y}`).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={outerPoly} fill="rgba(13,20,16,0.05)" stroke="rgba(13,20,16,0.12)" strokeWidth="0.8" />
      {slugs.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={pts[i].x} y2={pts[i].y}
          stroke="rgba(13,20,16,0.08)" strokeWidth="0.6" />
      ))}
      <polygon points={innerPoly} fill="rgba(250,240,0,0.55)" stroke="#d4c000" strokeWidth="0.8" />
      {slugs.map((slug, i) => (
        <circle key={slug} cx={innerPts[i].x} cy={innerPts[i].y} r="2.5"
          fill={SECTION_COLORS[slug]} />
      ))}
    </svg>
  )
}

// ── Main Dashboard Panel ───────────────────────────────────────────────────

// ── Question-level response breakdown ─────────────────────────────────────

function QuestionInsightsSection({
  allSections,
  respondentGroups,
}: {
  allSections: SurveySection[]
  respondentGroups: RespondentGroup[]
}) {
  const firstSlug = allSections[0]?.slug ?? null
  const [openSlug, setOpenSlug] = useState<string | null>(firstSlug)

  const sectionData = useMemo(() => {
    return allSections.map(section => {
      // Use latest submission per respondent for this section
      const submissions = respondentGroups.flatMap(group => {
        const latest = group.sections
          .filter(r => r.sectionSlug === section.slug)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
        return latest ? [latest.answers] : []
      })
      const total = submissions.length

      const qCounts: Record<string, Record<string, number>> = {}
      const qTexts: Record<string, string[]> = {}
      const qFollowUps: Record<string, string[]> = {}

      for (const answers of submissions) {
        for (const a of answers) {
          if (a.type === 'open-answer' || a.type === 'revenue-input') {
            if (a.answer) { (qTexts[a.questionId] ??= []).push(a.answer) }
          } else if (a.answer) {
            qCounts[a.questionId] ??= {}
            const vals = a.type === 'multiple-select'
              ? a.answer.split(',').map(s => s.trim()).filter(Boolean)
              : [a.answer]
            for (const v of vals) qCounts[a.questionId][v] = (qCounts[a.questionId][v] ?? 0) + 1
          }
          if (a.followUp) { (qFollowUps[a.questionId] ??= []).push(a.followUp) }
        }
      }

      return { section, total, qCounts, qTexts, qFollowUps }
    }).filter(d => d.total > 0)
  }, [allSections, respondentGroups])

  return (
    <div className="flex flex-col gap-3 mt-6">
      <h3 className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(13,20,16,0.4)' }}>
        Question-level response breakdown
      </h3>
      {sectionData.map(({ section, total, qCounts, qTexts, qFollowUps }) => {
        const color = SECTION_COLORS[section.slug] ?? '#3ecf6e'
        const isOpen = openSlug === section.slug
        return (
          <div key={section.slug} style={{ backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.08)' }}>
            {/* Section header toggle */}
            <button
              className="w-full text-left px-6 py-4 flex items-center gap-3"
              style={{ cursor: 'pointer' }}
              onClick={() => setOpenSlug(isOpen ? null : section.slug)}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="font-mono uppercase tracking-[0.12em] text-sm font-bold" style={{ color }}>
                {SECTION_SHORT_NAMES[section.slug] ?? section.name}
              </span>
              <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>
                {total} respondent{total !== 1 ? 's' : ''}
              </span>
              <span className="ml-auto text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>
                {isOpen ? '▲' : '▼'}
              </span>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid rgba(13,20,16,0.06)' }}>
                {section.questions.map((q, qi) => {
                  if (q.type === 'revenue-input') return null
                  const counts = qCounts[q.id] ?? {}
                  const texts = qTexts[q.id] ?? []
                  const followUps = qFollowUps[q.id] ?? []
                  const opts = q.options ?? []
                  const isClosedQ = q.type !== 'open-answer'
                  const maxCount = Math.max(1, ...Object.values(counts))
                  const mostCommonCount = Math.max(0, ...Object.values(counts))
                  // How many respondents answered this question at all
                  const answeredN = q.type === 'multiple-select'
                    ? Object.values(counts).reduce((a, b) => a + b, 0)  // sum of all selections
                    : Object.values(counts).reduce((a, b) => a + b, 0)
                  const uniqueAnswers = isClosedQ ? (
                    q.type === 'multiple-select' ? answeredN : Object.values(counts).reduce((a, b) => a + b, 0)
                  ) : texts.length

                  return (
                    <div key={q.id} className="px-6 py-5"
                      style={{ borderTop: qi === 0 ? 'none' : '1px solid rgba(13,20,16,0.05)' }}>
                      {/* Question text */}
                      <div className="flex gap-2 mb-3">
                        <span className="text-xs font-mono shrink-0 pt-0.5"
                          style={{ color: color, opacity: 0.7, minWidth: 22, fontWeight: 700 }}>
                          Q{qi + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: '#0d1410', lineHeight: 1.5 }}>{q.text}</p>
                          {q.type === 'multiple-select' && (
                            <p className="text-xs mt-0.5 font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>Multi-select — respondents could choose more than one</p>
                          )}
                        </div>
                      </div>

                      {/* Closed question — response bars */}
                      {isClosedQ && (
                        <div className="ml-7 flex flex-col gap-1">
                          {/* Options in questions.json order */}
                          {opts.map(opt => {
                            const count = counts[opt] ?? 0
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0
                            const isTop = count === mostCommonCount && count > 0
                            return (
                              <div key={opt} className="flex items-center gap-3">
                                <div className="relative flex-1 rounded-sm overflow-hidden"
                                  style={{ height: 32, backgroundColor: 'rgba(13,20,16,0.03)', minWidth: 0 }}>
                                  <div style={{
                                    position: 'absolute', inset: 0, right: 'auto',
                                    width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`,
                                    backgroundColor: color,
                                    opacity: isTop ? 0.18 : 0.07,
                                  }} />
                                  {isTop && (
                                    <div style={{
                                      position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                                      backgroundColor: color, opacity: 0.9,
                                    }} />
                                  )}
                                  <span className="absolute inset-y-0 left-3 right-20 flex items-center text-xs truncate"
                                    style={{ color: isTop ? '#0d1410' : 'rgba(13,20,16,0.55)', fontWeight: isTop ? 600 : 400 }}>
                                    {opt}
                                  </span>
                                </div>
                                {/* Count chip */}
                                <div className="shrink-0 flex items-center gap-2" style={{ minWidth: 80 }}>
                                  <span className="font-mono text-sm font-bold"
                                    style={{ color: isTop ? '#0d1410' : 'rgba(13,20,16,0.35)', minWidth: 20, textAlign: 'right' }}>
                                    {count}
                                  </span>
                                  <span className="font-mono text-xs"
                                    style={{ color: isTop ? 'rgba(13,20,16,0.55)' : 'rgba(13,20,16,0.25)', minWidth: 36 }}>
                                    {pct}%
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                          {/* Footer: answered / no response */}
                          <div className="flex justify-between items-center mt-1 pt-1">
                            <span className="text-[10px] font-mono" style={{ color: 'rgba(13,20,16,0.3)' }}>
                              {q.type === 'multiple-select'
                                ? `${answeredN} selections from ${total} respondents`
                                : `${uniqueAnswers}/${total} answered`}
                            </span>
                            {mostCommonCount > 0 && q.type !== 'multiple-select' && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm"
                                style={{ backgroundColor: `${color}15`, color, fontWeight: 600 }}>
                                Most common: {Math.round((mostCommonCount / total) * 100)}% chose the same answer
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Open-answer — show text responses */}
                      {q.type === 'open-answer' && (
                        <div className="ml-7">
                          {texts.length === 0 ? (
                            <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.3)' }}>No responses.</span>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {texts.map((text, ti) => (
                                <div key={ti} className="px-3 py-2 text-sm rounded-sm"
                                  style={{ backgroundColor: `${color}0d`, borderLeft: `2px solid ${color}50`, color: '#0d1410', lineHeight: 1.55 }}>
                                  {text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Follow-up notes */}
                      {followUps.length > 0 && (
                        <div className="ml-7 mt-2">
                          <p className="text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'rgba(13,20,16,0.35)' }}>
                            Follow-up notes ({followUps.length})
                          </p>
                          <div className="flex flex-col gap-1">
                            {followUps.map((fu, fi) => (
                              <div key={fi} className="px-3 py-1.5 text-xs italic rounded-sm"
                                style={{ backgroundColor: 'rgba(13,20,16,0.03)', borderLeft: '2px solid rgba(13,20,16,0.1)', color: 'rgba(13,20,16,0.6)', lineHeight: 1.5 }}>
                                {fu}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Dashboard Panel ────────────────────────────────────────────────────────

function DashboardPanel({ responses, allSections }: { responses: ResponseEntry[]; allSections: SurveySection[] }) {
  const respondentGroups = useMemo(() => groupByRespondent(responses), [responses])

  const respondentData = useMemo(() =>
    respondentGroups.map(group => ({
      group,
      scores: computeAllSectionScores(buildAnswerMap(group.sections)),
    })), [respondentGroups])

  // KPIs
  const totalRespondents = respondentGroups.length
  const completedAll = useMemo(() =>
    respondentData.filter(d => {
      const slugs = new Set(d.group.sections.map(s => s.sectionSlug))
      return SECTION_SLUGS_ORDERED.every(s => slugs.has(s))
    }).length, [respondentData])

  const avgOverall = useMemo(() =>
    respondentData.length > 0
      ? Math.round(respondentData.reduce((sum, d) => sum + d.scores.overall, 0) / respondentData.length)
      : 0, [respondentData])

  // Section averages (mean pct across respondents who answered each section)
  const sectionAvgs = useMemo(() => {
    const totals: Record<string, number[]> = {}
    for (const { scores } of respondentData) {
      for (const s of scores.sections) {
        if (s.max > 0 && s.answeredCount > 0) {
          ;(totals[s.slug] ??= []).push(s.pct)
        }
      }
    }
    return Object.fromEntries(
      SECTION_SLUGS_ORDERED.map(slug => [
        slug,
        totals[slug]?.length
          ? Math.round(totals[slug].reduce((a, b) => a + b, 0) / totals[slug].length)
          : 0,
      ])
    )
  }, [respondentData])

  // Band distribution [EARLY, DEVELOPING, MATURING, LEADING] counts per section
  const bandDist = useMemo(() => {
    const dist: Record<string, [number, number, number, number]> = {}
    for (const slug of SECTION_SLUGS_ORDERED) dist[slug] = [0, 0, 0, 0]
    for (const { scores } of respondentData) {
      for (const s of scores.sections) {
        if (s.max > 0 && s.answeredCount > 0) {
          dist[s.slug][getScoreBand(s.pct).index]++
        }
      }
    }
    return dist
  }, [respondentData])

  // Export scores as CSV
  function handleExportScores() {
    const header = ['Name', 'Company', 'Role', 'Sector', 'Type',
      'Appetite%', 'Scale%', 'Sustainability%', 'Brand%', 'Business%', 'Overall%'].join(',')
    const rows = respondentData
      .sort((a, b) => b.scores.overall - a.scores.overall)
      .map(({ group, scores }) => {
        const bySlug = Object.fromEntries(scores.sections.map(s => [s.slug, s.pct]))
        return [
          `"${group.name}"`, `"${group.company}"`, `"${group.role}"`,
          `"${group.sector}"`, `"${group.companyType}"`,
          bySlug['appetite'] ?? '',
          bySlug['scale-and-delivery'] ?? '',
          bySlug['capability-sustainability'] ?? '',
          bySlug['capability-brand'] ?? '',
          bySlug['capability-business'] ?? '',
          scores.overall,
        ].join(',')
      })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `interplay-scores-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (totalRespondents === 0) {
    return (
      <div className="px-6 py-16 text-center" style={{ backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.08)' }}>
        <p className="text-sm" style={{ color: 'rgba(13,20,16,0.5)' }}>No responses yet — analytics will appear here once the first survey is submitted.</p>
      </div>
    )
  }

  const cardStyle: React.CSSProperties = { backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.08)' }

  return (
    <div id="dashboard-print">
      {/* Action bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 no-print">
        <span className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(13,20,16,0.4)' }}>
          {totalRespondents} respondent{totalRespondents !== 1 ? 's' : ''} · {responses.length} section submission{responses.length !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-3">
          <button onClick={handleExportScores}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 border transition-colors"
            style={{ border: '1px solid rgba(13,20,16,0.12)', color: 'rgba(13,20,16,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(62,207,110,0.4)'; e.currentTarget.style.color = '#22a855' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.12)'; e.currentTarget.style.color = 'rgba(13,20,16,0.5)' }}>
            Export scores CSV ↓
          </button>
          <button onClick={() => window.print()}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 border transition-colors"
            style={{ border: '1px solid rgba(13,20,16,0.12)', color: 'rgba(13,20,16,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.3)'; e.currentTarget.style.color = '#0d1410' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.12)'; e.currentTarget.style.color = 'rgba(13,20,16,0.5)' }}>
            Print / Save PDF ⎙
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-5 flex flex-col gap-1" style={cardStyle}>
          <span className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(13,20,16,0.45)' }}>Respondents</span>
          <span className="text-3xl font-bold" style={{ color: '#0d1410' }}>{totalRespondents}</span>
        </div>
        <div className="p-5 flex flex-col gap-1" style={cardStyle}>
          <span className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(13,20,16,0.45)' }}>Avg overall score</span>
          <span className="text-3xl font-bold" style={{ color: avgOverall >= 60 ? '#22a855' : avgOverall >= 40 ? '#d97706' : '#dc2626' }}>{avgOverall}%</span>
        </div>
        <div className="p-5 flex flex-col gap-1" style={cardStyle}>
          <span className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(13,20,16,0.45)' }}>Fully completed</span>
          <span className="text-3xl font-bold" style={{ color: '#0d1410' }}>{completedAll}</span>
          <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>of {totalRespondents} · all 5 pillars</span>
        </div>
        <div className="p-5 flex flex-col gap-1" style={cardStyle}>
          <span className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(13,20,16,0.45)' }}>Completion rate</span>
          <span className="text-3xl font-bold" style={{ color: '#0d1410' }}>
            {totalRespondents > 0 ? Math.round((completedAll / totalRespondents) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Charts row 1: pillar averages + band distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Pillar averages */}
        <div className="p-6" style={cardStyle}>
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] mb-5" style={{ color: 'rgba(13,20,16,0.4)' }}>
            Average score by pillar
          </h3>
          {SECTION_SLUGS_ORDERED.map(slug => (
            <HBar key={slug} label={SECTION_SHORT_NAMES[slug]} value={sectionAvgs[slug] ?? 0}
              color={SECTION_COLORS[slug]} />
          ))}
          {/* Benchmark line overlay description */}
          <div className="mt-4 pt-4 flex gap-6 flex-wrap" style={{ borderTop: '1px solid rgba(13,20,16,0.06)' }}>
            {[{ pct: 0, label: 'Early Stage', color: BAND_COLORS[0] }, { pct: 40, label: 'Developing', color: BAND_COLORS[1] }, { pct: 60, label: 'Maturing', color: BAND_COLORS[2] }, { pct: 80, label: 'Leading', color: BAND_COLORS[3] }].map(b => (
              <div key={b.pct} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: b.color }} />
                <span className="text-[10px] font-mono uppercase" style={{ color: 'rgba(13,20,16,0.45)' }}>{b.label}</span>
                <span className="text-[10px] font-mono" style={{ color: 'rgba(13,20,16,0.3)' }}>{b.pct === 0 ? '< 40%' : b.pct === 40 ? '40–59%' : b.pct === 60 ? '60–79%' : '80%+'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Band distribution */}
        <div className="p-6" style={cardStyle}>
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] mb-5" style={{ color: 'rgba(13,20,16,0.4)' }}>
            Score band distribution by pillar
          </h3>
          {SECTION_SLUGS_ORDERED.map(slug => {
            const dist = bandDist[slug] ?? [0, 0, 0, 0]
            const total = dist.reduce((a, b) => a + b, 0)
            return (
              <div key={slug} className="flex items-center gap-3 py-1.5">
                <span className="font-mono uppercase tracking-wider text-right shrink-0"
                  style={{ width: 110, color: 'rgba(13,20,16,0.5)', fontSize: '11px' }}>
                  {SECTION_SHORT_NAMES[slug]}
                </span>
                <div className="flex-1 h-6 flex rounded-sm overflow-hidden" style={{ backgroundColor: 'rgba(13,20,16,0.04)', minWidth: 0 }}>
                  {total > 0 ? dist.map((count, i) =>
                    count > 0 ? (
                      <div key={i} title={`${BAND_LABELS[i]}: ${count} respondent${count > 1 ? 's' : ''}`}
                        style={{ width: `${(count / total) * 100}%`, height: '100%', backgroundColor: BAND_COLORS[i], opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 18 }}>
                        <span style={{ color: '#fff', fontSize: '10px', fontFamily: 'monospace', fontWeight: 700 }}>{count}</span>
                      </div>
                    ) : null
                  ) : (
                    <span className="font-mono px-3 flex items-center text-xs" style={{ color: 'rgba(13,20,16,0.3)' }}>—</span>
                  )}
                </div>
              </div>
            )
          })}
          <div className="flex gap-4 mt-4 pt-4 flex-wrap" style={{ borderTop: '1px solid rgba(13,20,16,0.06)' }}>
            {BAND_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: BAND_COLORS[i] }} />
                <span className="text-[10px] font-mono uppercase" style={{ color: 'rgba(13,20,16,0.5)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Respondent scores table */}
      <div className="p-6" style={cardStyle}>
        <h3 className="text-xs font-mono uppercase tracking-[0.15em] mb-5" style={{ color: 'rgba(13,20,16,0.4)' }}>
          All respondents — scores
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 680 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(13,20,16,0.08)' }}>
                <th className="text-left pb-3 pr-4 font-mono uppercase tracking-wider text-xs" style={{ color: 'rgba(13,20,16,0.4)', fontWeight: 500 }}>Name</th>
                <th className="text-left pb-3 pr-4 font-mono uppercase tracking-wider text-xs" style={{ color: 'rgba(13,20,16,0.4)', fontWeight: 500 }}>Company</th>
                <th className="text-left pb-3 pr-4 font-mono uppercase tracking-wider text-xs" style={{ color: 'rgba(13,20,16,0.4)', fontWeight: 500 }}>Sector</th>
                {SECTION_SLUGS_ORDERED.map(slug => (
                  <th key={slug} className="text-center pb-3 px-2 font-mono uppercase tracking-wider text-xs"
                    style={{ color: SECTION_COLORS[slug], fontWeight: 600, minWidth: 58 }}>
                    {SECTION_SHORT_NAMES[slug].split(' ')[0]}
                  </th>
                ))}
                <th className="text-center pb-3 px-2 font-mono uppercase tracking-wider text-xs" style={{ color: 'rgba(13,20,16,0.7)', fontWeight: 700 }}>OVR</th>
                <th className="pb-3 pl-3 font-mono uppercase tracking-wider text-xs no-print" style={{ color: 'rgba(13,20,16,0.4)', fontWeight: 500 }}></th>
              </tr>
            </thead>
            <tbody>
              {respondentData
                .sort((a, b) => b.scores.overall - a.scores.overall)
                .map(({ group, scores }) => {
                  const bySlug = Object.fromEntries(scores.sections.map(s => [s.slug, s]))
                  const scoreMap = Object.fromEntries(
                    SECTION_SLUGS_ORDERED.map(slug => {
                      const s = bySlug[slug]
                      return [slug, s?.max > 0 && s?.answeredCount > 0 ? s.pct : null]
                    })
                  )
                  return (
                    <tr key={group.name} style={{ borderBottom: '1px solid rgba(13,20,16,0.04)' }}>
                      <td className="py-3 pr-4 text-sm font-medium" style={{ color: '#0d1410' }}>{group.name}</td>
                      <td className="py-3 pr-4 text-xs" style={{ color: 'rgba(13,20,16,0.55)' }}>{group.company || '—'}</td>
                      <td className="py-3 pr-4 text-xs font-mono" style={{ color: 'rgba(13,20,16,0.45)' }}>{group.sector || '—'}</td>
                      {SECTION_SLUGS_ORDERED.map(slug => (
                        <td key={slug} className="py-3 px-2 text-center">
                          <ScoreChip pct={scoreMap[slug] as number | null} color={SECTION_COLORS[slug]} />
                        </td>
                      ))}
                      <td className="py-3 px-2 text-center">
                        <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: scores.overall > 0 ? '#0d1410' : 'rgba(13,20,16,0.2)' }}>
                          {scores.overall > 0 ? `${scores.overall}%` : '—'}
                        </span>
                      </td>
                      <td className="py-3 pl-3 no-print">
                        <MiniPentagon size={48} scores={Object.fromEntries(
                          SECTION_SLUGS_ORDERED.map(slug => [slug, scoreMap[slug] ?? 0])
                        ) as Record<string, number>} />
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question-level response breakdown */}
      <QuestionInsightsSection allSections={allSections} respondentGroups={respondentGroups} />
    </div>
  )
}

// ── Leads Panel ───────────────────────────────────────────────────────────

interface LeadRow {
  id: number
  name: string | null
  email: string
  company: string | null
  role: string | null
  source: string
  email_sent: boolean
  email_sent_at: string | null
  email_error: string | null
  created_at: string
}

interface SessionSummary {
  id: number
  email: string
  survey_token: string
  results_token: string | null
  sections_done: string[]
  completed_at: string | null
  nudge_sent_at: string | null
  created_at: string
}

function SurveyProgressChip({ session, totalSections = 5 }: { session: SessionSummary | undefined; totalSections?: number }) {
  if (!session) return <span style={{ color: 'rgba(13,20,16,0.25)' }}>—</span>
  const done = session.sections_done?.length ?? 0
  if (session.completed_at) {
    return (
      <a
        href={session.results_token ? `/results/${session.results_token}` : undefined}
        target="_blank"
        rel="noreferrer"
        onClick={e => e.stopPropagation()}
        className="text-xs font-mono px-2 py-0.5 rounded-sm transition-opacity"
        style={{ background: 'rgba(62,207,110,0.1)', border: '1px solid rgba(62,207,110,0.3)', color: '#22a855', textDecoration: 'none' }}
        title={session.results_token ? 'View report' : undefined}
      >
        Complete ✓
      </a>
    )
  }
  if (done === 0) {
    return (
      <span className="text-xs font-mono px-2 py-0.5 rounded-sm"
        style={{ background: 'rgba(250,240,0,0.1)', border: '1px solid rgba(250,240,0,0.35)', color: '#a08a00' }}>
        Started
      </span>
    )
  }
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded-sm"
      style={{ background: 'rgba(250,160,0,0.1)', border: '1px solid rgba(250,160,0,0.3)', color: '#b06000' }}>
      {done}/{totalSections}
    </span>
  )
}

function LeadsPanel({ password }: { password: string }) {
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [nudging, setNudging] = useState(false)
  const [nudgeResult, setNudgeResult] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  async function fetchLeads() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/leads', {
        headers: { Authorization: `Bearer ${password}` },
      })
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads ?? [])
        setSessions(data.sessions ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLeads() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResend(lead: LeadRow) {
    setResending(lead.id)
    try {
      await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
        body: JSON.stringify({ id: lead.id, email: lead.email, name: lead.name ?? undefined }),
      })
      await fetchLeads()
    } finally {
      setResending(null)
    }
  }

  async function handleSendNudges() {
    setNudging(true)
    setNudgeResult(null)
    try {
      const res = await fetch('/api/admin/send-nudges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
        body: JSON.stringify({ cutoffHours: 48 }),
      })
      const data = await res.json()
      if (data.ok) {
        setNudgeResult(`Sent ${data.sent}, failed ${data.failed} (${data.total} eligible)`)
        await fetchLeads()
      } else {
        setNudgeResult(`Error: ${data.error ?? 'unknown'}`)
      }
    } catch {
      setNudgeResult('Request failed')
    } finally {
      setNudging(false)
    }
  }

  async function handleDeleteLead(lead: LeadRow) {
    setDeletingId(lead.id)
    setConfirmDeleteId(null)
    try {
      await fetch('/api/admin/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${password}` },
        body: JSON.stringify({ id: lead.id }),
      })
      await fetchLeads()
      setExpandedId(null)
    } finally {
      setDeletingId(null)
    }
  }

  function handleExportCsv() {
    const header = 'Name,Email,Company,Role,Source,Email Sent,Survey Progress,Registered At'
    const rows = leads.map(l => {
      const session = sessions.find(s => s.email.toLowerCase() === l.email.toLowerCase())
      const progress = session
        ? (session.completed_at ? 'Complete' : `${session.sections_done?.length ?? 0}/5`)
        : '—'
      return [
        `"${l.name ?? ''}"`,
        `"${l.email}"`,
        `"${l.company ?? ''}"`,
        `"${l.role ?? ''}"`,
        `"${l.source}"`,
        l.email_sent ? 'Yes' : 'No',
        progress,
        `"${formatDate(l.created_at)}"`,
      ].join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `interplay-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const cardStyle: React.CSSProperties = { backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.08)' }

  const completedCount = sessions.filter(s => s.completed_at).length
  const inProgressCount = sessions.filter(s => !s.completed_at && (s.sections_done?.length ?? 0) > 0).length

  if (loading) {
    return (
      <p className="text-sm font-mono animate-pulse" style={{ color: 'rgba(13,20,16,0.4)' }}>Loading leads…</p>
    )
  }

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-5 flex flex-col gap-1" style={cardStyle}>
          <span className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(13,20,16,0.45)' }}>Total registered</span>
          <span className="text-3xl font-bold" style={{ color: '#0d1410' }}>{leads.length}</span>
        </div>
        <div className="p-5 flex flex-col gap-1" style={cardStyle}>
          <span className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(13,20,16,0.45)' }}>Survey complete</span>
          <span className="text-3xl font-bold" style={{ color: '#22a855' }}>{completedCount}</span>
        </div>
        <div className="p-5 flex flex-col gap-1" style={cardStyle}>
          <span className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(13,20,16,0.45)' }}>In progress</span>
          <span className="text-3xl font-bold" style={{ color: '#b06000' }}>{inProgressCount}</span>
        </div>
        <div className="p-5 flex flex-col gap-1" style={cardStyle}>
          <span className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(13,20,16,0.45)' }}>Email delivered</span>
          <span className="text-3xl font-bold" style={{ color: '#0d1410' }}>
            {leads.filter(l => l.email_sent).length}
          </span>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <span className="text-xs font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(13,20,16,0.4)' }}>
          {leads.length} lead{leads.length !== 1 ? 's' : ''} registered
        </span>
        <div className="flex flex-wrap gap-3 items-center">
          {nudgeResult && (
            <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.5)' }}>{nudgeResult}</span>
          )}
          <button
            onClick={handleSendNudges}
            disabled={nudging}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 border transition-colors disabled:opacity-40"
            style={{ border: '1px solid rgba(13,20,16,0.12)', color: 'rgba(13,20,16,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(180,100,0,0.35)'; e.currentTarget.style.color = '#b06000' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.12)'; e.currentTarget.style.color = 'rgba(13,20,16,0.5)' }}>
            {nudging ? 'Sending…' : '✉ Send nudges'}
          </button>
          <button onClick={fetchLeads}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 border transition-colors"
            style={{ border: '1px solid rgba(13,20,16,0.12)', color: 'rgba(13,20,16,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.3)'; e.currentTarget.style.color = '#0d1410' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.12)'; e.currentTarget.style.color = 'rgba(13,20,16,0.5)' }}>
            ↺ Refresh
          </button>
          {leads.length > 0 && (
            <button onClick={handleExportCsv}
              className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 border transition-colors"
              style={{ border: '1px solid rgba(13,20,16,0.12)', color: 'rgba(13,20,16,0.5)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(62,207,110,0.4)'; e.currentTarget.style.color = '#22a855' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.12)'; e.currentTarget.style.color = 'rgba(13,20,16,0.5)' }}>
              Export CSV ↓
            </button>
          )}
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="px-6 py-14 text-center" style={cardStyle}>
          <p className="text-sm" style={{ color: 'rgba(13,20,16,0.5)' }}>No leads yet.</p>
          <p className="text-xs mt-1 font-mono" style={{ color: 'rgba(13,20,16,0.3)' }}>
            Registrations via the landing page will appear here.
          </p>
        </div>
      ) : (
        <div style={cardStyle}>
          {/* Table header */}
          <div className="px-5 py-3 grid gap-3 text-[10px] font-mono uppercase tracking-[0.15em]"
            style={{
              gridTemplateColumns: '1fr 1.5fr 1fr 1fr 80px 90px 90px',
              borderBottom: '2px solid rgba(13,20,16,0.07)',
              color: 'rgba(13,20,16,0.4)',
            }}>
            <span>Name</span>
            <span>Email</span>
            <span>Company</span>
            <span>Role</span>
            <span>Email</span>
            <span>Survey</span>
            <span>Registered</span>
          </div>

          {/* Rows */}
          {leads.map(lead => {
            const isExpanded = expandedId === lead.id
            const session = sessions.find(s => s.email.toLowerCase() === lead.email.toLowerCase())
            return (
              <div key={lead.id} style={{ borderBottom: '1px solid rgba(13,20,16,0.05)' }}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                  className="w-full text-left px-5 py-3 grid gap-3 transition-colors"
                  style={{
                    gridTemplateColumns: '1fr 1.5fr 1fr 1fr 80px 90px 90px',
                    backgroundColor: isExpanded ? 'rgba(13,20,16,0.02)' : 'transparent',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => !isExpanded && (e.currentTarget.style.backgroundColor = 'rgba(13,20,16,0.015)')}
                  onMouseLeave={e => !isExpanded && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span className="text-sm font-medium truncate" style={{ color: '#0d1410' }}>
                    {lead.name ?? <span style={{ color: 'rgba(13,20,16,0.3)', fontStyle: 'italic' }}>—</span>}
                  </span>
                  <a
                    href={`mailto:${lead.email}`}
                    onClick={e => e.stopPropagation()}
                    className="text-xs font-mono truncate transition-colors"
                    style={{ color: 'rgba(13,20,16,0.65)' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#0d1410'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(13,20,16,0.65)'}
                  >
                    {lead.email}
                  </a>
                  <span className="text-xs truncate" style={{ color: 'rgba(13,20,16,0.55)' }}>
                    {lead.company ?? <span style={{ color: 'rgba(13,20,16,0.25)' }}>—</span>}
                  </span>
                  <span className="text-xs truncate" style={{ color: 'rgba(13,20,16,0.45)' }}>
                    {lead.role ?? <span style={{ color: 'rgba(13,20,16,0.25)' }}>—</span>}
                  </span>
                  <span>
                    {lead.email_sent ? (
                      <span className="text-xs font-mono px-2 py-0.5 rounded-sm"
                        style={{ background: 'rgba(62,207,110,0.1)', border: '1px solid rgba(62,207,110,0.3)', color: '#22a855' }}>
                        Sent ✓
                      </span>
                    ) : (
                      <span className="text-xs font-mono px-2 py-0.5 rounded-sm"
                        style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', color: '#dc2626' }}>
                        Failed
                      </span>
                    )}
                  </span>
                  <span onClick={e => e.stopPropagation()}>
                    <SurveyProgressChip session={session} />
                  </span>
                  <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>
                    {formatDate(lead.created_at)}
                  </span>
                </button>

                {/* Expanded detail row */}
                {isExpanded && (
                  <div className="px-6 py-4 flex flex-col gap-3"
                    style={{ backgroundColor: '#fafafa', borderTop: '1px solid rgba(13,20,16,0.04)' }}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Source', value: lead.source },
                        { label: 'Email sent at', value: lead.email_sent_at ? formatDate(lead.email_sent_at) : '—' },
                        { label: 'Lead ID', value: `#${lead.id}` },
                        { label: 'Registered', value: formatDate(lead.created_at) },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px] font-mono uppercase tracking-wider mb-0.5"
                            style={{ color: 'rgba(13,20,16,0.35)' }}>{label}</p>
                          <p className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.7)' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {session && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-wider mb-0.5" style={{ color: 'rgba(13,20,16,0.35)' }}>Sections done</p>
                          <p className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.7)' }}>
                            {session.sections_done?.join(', ') || 'none'}
                          </p>
                        </div>
                        {session.nudge_sent_at && (
                          <div>
                            <p className="text-[10px] font-mono uppercase tracking-wider mb-0.5" style={{ color: 'rgba(13,20,16,0.35)' }}>Nudge sent</p>
                            <p className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.7)' }}>{formatDate(session.nudge_sent_at)}</p>
                          </div>
                        )}
                        {session.completed_at && (
                          <div>
                            <p className="text-[10px] font-mono uppercase tracking-wider mb-0.5" style={{ color: 'rgba(13,20,16,0.35)' }}>Completed</p>
                            <p className="text-xs font-mono" style={{ color: '#22a855' }}>{formatDate(session.completed_at)}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {lead.email_error && (
                      <div className="px-3 py-2 text-xs font-mono"
                        style={{ backgroundColor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', color: '#dc2626' }}>
                        Email error: {lead.email_error}
                      </div>
                    )}

                    {/* Action buttons row */}
                    <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid rgba(13,20,16,0.06)' }}>
                      {!lead.email_sent && (
                        <button
                          onClick={() => handleResend(lead)}
                          disabled={resending === lead.id}
                          className="text-xs font-mono px-4 py-2 transition-colors disabled:opacity-40"
                          style={{ border: '1px solid rgba(62,207,110,0.35)', color: '#22a855' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(62,207,110,0.07)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          {resending === lead.id ? 'Sending…' : '↺ Resend confirmation email'}
                        </button>
                      )}

                      {/* Delete — two-step confirm */}
                      {confirmDeleteId === lead.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.5)' }}>
                            Delete {lead.email}?
                          </span>
                          <button
                            onClick={() => handleDeleteLead(lead)}
                            disabled={deletingId === lead.id}
                            className="text-xs font-mono px-3 py-1.5 transition-colors disabled:opacity-40"
                            style={{ background: '#dc2626', color: '#fff', border: '1px solid #dc2626', borderRadius: '3px' }}>
                            {deletingId === lead.id ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-mono px-3 py-1.5 transition-colors"
                            style={{ border: '1px solid rgba(13,20,16,0.15)', color: 'rgba(13,20,16,0.5)' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.3)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.15)'}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(lead.id)}
                          className="text-xs font-mono px-4 py-2 transition-colors ml-auto"
                          style={{ border: '1px solid rgba(220,38,38,0.25)', color: 'rgba(220,38,38,0.7)' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(220,38,38,0.5)'; e.currentTarget.style.color = '#dc2626' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(220,38,38,0.25)'; e.currentTarget.style.color = 'rgba(220,38,38,0.7)' }}>
                          Delete lead
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Login screen ───────────────────────────────────────────────────────────

function LoginScreen({ onSuccess }: { onSuccess: (pw: string) => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/admin/responses', {
      headers: { Authorization: `Bearer ${pw}` },
    })

    setLoading(false)

    if (res.status === 401) { setError('Incorrect password.'); return }
    if (!res.ok) { setError('Something went wrong. Please try again.'); return }

    sessionStorage.setItem('admin-auth', pw)
    onSuccess(pw)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#f6f8f6' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(13,20,16,0.4)' }}>
            Interrupt × Like So
          </p>
          <h1 className="text-xl font-bold" style={{ color: '#0d1410' }}>Admin Access</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(13,20,16,0.5)' }}>Interplay Method — Response Review</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            autoFocus
            className="w-full px-4 py-3 text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.12)', color: '#0d1410' }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(62,207,110,0.5)'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(13,20,16,0.12)'}
          />

          {error && <p className="text-xs font-mono" style={{ color: '#dc2626' }}>{error}</p>}

          <button type="submit" disabled={loading || !pw}
            className="bg-brand-green text-brand-bg font-bold uppercase tracking-widest text-sm px-8 py-4 hover:bg-brand-green/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? 'Checking…' : 'Enter →'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main admin dashboard ───────────────────────────────────────────────────

export default function AdminPage() {
  const [authState, setAuthState] = useState<'checking' | 'unauthenticated' | 'authenticated'>('checking')
  const [password, setPassword] = useState('')
  const [responses, setResponses] = useState<ResponseEntry[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [referralsByRespondent, setReferralsByRespondent] = useState<Record<string, ReferralRow[]>>({})
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('all')
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)
  const [deletingRespondent, setDeletingRespondent] = useState<string | null>(null)
  const [allSections, setAllSections] = useState<SurveySection[]>([])
  const [activeTab, setActiveTab] = useState<'dashboard' | 'responses' | 'cms' | 'leads'>('dashboard')

  const fetchData = useCallback(async (pw: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/responses', {
        headers: { Authorization: `Bearer ${pw}` },
      })
      if (res.status === 401) {
        sessionStorage.removeItem('admin-auth')
        setAuthState('unauthenticated')
        return
      }
      const data = await res.json()
      setResponses(data.responses ?? [])
      setStats(data.stats ?? null)
      setReferralsByRespondent(data.referralsByRespondent ?? {})
      setAuthState('authenticated')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/questions').then(r => r.json()).then(d => setAllSections(d.sections ?? []))
    const saved = sessionStorage.getItem('admin-auth')
    if (saved) {
      setPassword(saved)
      fetchData(saved)
    } else {
      setAuthState('unauthenticated')
    }
  }, [fetchData])

  function handleLogin(pw: string) { setPassword(pw); fetchData(pw) }

  function handleLogout() {
    sessionStorage.removeItem('admin-auth')
    setPassword('')
    setAuthState('unauthenticated')
    setResponses([])
    setStats(null)
  }

  function handleExport() {
    window.open(`/api/admin/export?token=${encodeURIComponent(password)}`, '_blank')
  }

  async function handleDelete(respondentName: string) {
    setDeletingRespondent(respondentName)
    try {
      const res = await fetch(
        `/api/admin/responses?respondent=${encodeURIComponent(respondentName)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${password}` } }
      )
      if (res.ok) await fetchData(password)
    } finally {
      setDeletingRespondent(null)
    }
  }

  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f6f8f6' }}>
        <span className="text-sm font-mono animate-pulse" style={{ color: '#6b8c74' }}>Loading…</span>
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return <LoginScreen onSuccess={handleLogin} />
  }

  const sections = Array.from(
    new Map(responses.map(r => [r.sectionSlug, r.sectionName])).entries()
  ).sort()

  const respondentGroups = groupByRespondent(responses)
  const visibleGroups = activeSection === 'all'
    ? respondentGroups
    : respondentGroups.filter(g => g.sections.some(s => s.sectionSlug === activeSection))

  const tabStyle = (tab: string): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: '12px',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #3ecf6e' : '2px solid transparent',
    color: activeTab === tab ? '#22a855' : 'rgba(13,20,16,0.45)',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'color 0.15s',
  })

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #dashboard-print { display: block !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f6f8f6' }}>
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between no-print"
          style={{ backgroundColor: '#fff', borderBottom: '1px solid rgba(13,20,16,0.08)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(13,20,16,0.4)' }}>Interrupt</span>
            <span style={{ color: 'rgba(13,20,16,0.2)' }}>×</span>
            <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(13,20,16,0.4)' }}>Like So</span>
            <span className="ml-4 text-xs font-mono uppercase tracking-[0.2em]" style={{ color: '#3ecf6e' }}>Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/start"
              className="text-xs font-mono transition-colors"
              style={{ color: 'rgba(13,20,16,0.4)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#0d1410'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(13,20,16,0.4)'}>
              Start survey →
            </a>
            <button onClick={() => fetchData(password)}
              className="text-xs font-mono transition-colors"
              style={{ color: 'rgba(13,20,16,0.4)' }}
              title="Refresh data"
              onMouseEnter={e => e.currentTarget.style.color = '#0d1410'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(13,20,16,0.4)'}>
              ↺ Refresh
            </button>
            <button onClick={handleLogout}
              className="text-xs font-mono transition-colors"
              style={{ color: 'rgba(13,20,16,0.4)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#0d1410'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(13,20,16,0.4)'}>
              Sign out
            </button>
          </div>
        </header>

        {/* Tab nav */}
        <div className="flex px-6 no-print" style={{ backgroundColor: '#fff', borderBottom: '1px solid rgba(13,20,16,0.08)' }}>
          <button style={tabStyle('dashboard')} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button style={tabStyle('responses')} onClick={() => setActiveTab('responses')}>Responses</button>
          <button style={tabStyle('cms')} onClick={() => setActiveTab('cms')}>CMS</button>
          <button style={tabStyle('leads')} onClick={() => setActiveTab('leads')}>Leads</button>
        </div>

        <main className="flex-1 px-6 py-8 w-full" style={{ maxWidth: (activeTab === 'dashboard' || activeTab === 'leads') ? 1200 : 900, margin: '0 auto' }}>

          {loading && (
            <p className="text-sm font-mono animate-pulse mb-6" style={{ color: 'rgba(13,20,16,0.4)' }}>Loading…</p>
          )}

          {/* ── Dashboard tab ── */}
          {activeTab === 'dashboard' && (
            <DashboardPanel responses={responses} allSections={allSections} />
          )}

          {/* ── Responses tab ── */}
          {activeTab === 'responses' && (
            <>
              {/* Section filter tabs + CSV export */}
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setActiveSection('all')}
                    className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 border transition-colors"
                    style={{
                      borderColor: activeSection === 'all' ? '#3ecf6e' : 'rgba(13,20,16,0.12)',
                      color: activeSection === 'all' ? '#22a855' : 'rgba(13,20,16,0.5)',
                      backgroundColor: activeSection === 'all' ? 'rgba(62,207,110,0.07)' : 'transparent',
                    }}>
                    All ({respondentGroups.length} respondents)
                  </button>
                  {sections.map(([slug, name]) => {
                    const count = stats?.bySection[slug] ?? 0
                    const color = getSectionColor(slug)
                    const isActive = activeSection === slug
                    return (
                      <button key={slug} onClick={() => setActiveSection(slug)}
                        className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 border transition-colors"
                        style={{
                          borderColor: isActive ? `${color}60` : 'rgba(13,20,16,0.12)',
                          color: isActive ? color : 'rgba(13,20,16,0.5)',
                          backgroundColor: isActive ? `${color}0d` : 'transparent',
                        }}>
                        {name} ({count})
                      </button>
                    )
                  })}
                </div>
                <button onClick={handleExport}
                  className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 border transition-colors"
                  style={{ border: '1px solid rgba(13,20,16,0.12)', color: 'rgba(13,20,16,0.5)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(62,207,110,0.4)'; e.currentTarget.style.color = '#22a855' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.12)'; e.currentTarget.style.color = 'rgba(13,20,16,0.5)' }}>
                  Export raw CSV ↓
                </button>
              </div>

              {visibleGroups.length === 0 ? (
                <div className="px-6 py-12 text-center" style={{ backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.08)' }}>
                  <p className="text-sm" style={{ color: 'rgba(13,20,16,0.5)' }}>No responses yet.</p>
                  <p className="text-xs mt-1 font-mono" style={{ color: 'rgba(13,20,16,0.3)' }}>Responses will appear here after the first survey submission.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {visibleGroups.map(group => (
                    <RespondentCard
                      key={group.name.toLowerCase()}
                      group={group}
                      password={password}
                      activeSection={activeSection}
                      expandedSectionId={expandedSectionId}
                      onToggleSection={(id) => setExpandedSectionId(expandedSectionId === id ? null : id)}
                      onDelete={handleDelete}
                      deleting={deletingRespondent === group.name}
                      allSections={allSections}
                      onRefresh={() => fetchData(password)}
                      referrals={referralsByRespondent[group.name.toLowerCase()] ?? []}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── CMS tab ── */}
          {activeTab === 'cms' && (
            <GlobalTemplatePanel password={password} />
          )}

          {/* ── Leads tab ── */}
          {activeTab === 'leads' && (
            <LeadsPanel password={password} />
          )}

        </main>

        <footer className="px-6 py-4 no-print" style={{ borderTop: '1px solid rgba(13,20,16,0.08)' }}>
          <p className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>
            Interplay Admin · Responses stored in Postgres
          </p>
        </footer>
      </div>
    </>
  )
}

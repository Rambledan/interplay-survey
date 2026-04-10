'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ResponseEntry, AdminStats } from '@/app/api/admin/responses/route'
import type { SurveySection } from '@/types/survey'

// ── Section colour palette (light-mode readable) ───────────────────────────

const SECTION_COLORS: Record<string, string> = {
  'appetite':                  '#f4821f',
  'scale-and-delivery':        '#4a9ff5',
  'capability-sustainability':  '#3ecf6e',
  'capability-brand':           '#a855f7',
  'capability-business':        '#d97706',  // amber instead of yellow for contrast
}

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
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('all')
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)
  const [deletingRespondent, setDeletingRespondent] = useState<string | null>(null)
  const [allSections, setAllSections] = useState<SurveySection[]>([])

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

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f6f8f6' }}>
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between"
        style={{ backgroundColor: '#fff', borderBottom: '1px solid rgba(13,20,16,0.08)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(13,20,16,0.4)' }}>Interrupt</span>
          <span style={{ color: 'rgba(13,20,16,0.2)' }}>×</span>
          <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(13,20,16,0.4)' }}>Like So</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: '#3ecf6e' }}>
            Admin — Response Review
          </span>
          <button onClick={() => fetchData(password)}
            className="text-xs font-mono transition-colors"
            style={{ color: 'rgba(13,20,16,0.4)' }}
            title="Refresh"
            onMouseEnter={e => e.currentTarget.style.color = '#0d1410'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(13,20,16,0.4)'}>
            ↺
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

      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard label="Total responses" value={stats.total} />
            <StatCard label="Unique respondents" value={stats.uniqueRespondents} />
            <StatCard label="Sections covered" value={Object.keys(stats.bySection).length} />
            <StatCard
              label="Last submission"
              value={stats.lastSubmission ? formatDate(stats.lastSubmission).split(',')[0] : '—'}
            />
          </div>
        )}

        {/* Section tabs + export */}
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
                <button
                  key={slug}
                  onClick={() => setActiveSection(slug)}
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

          <button
            onClick={handleExport}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 border transition-colors"
            style={{ border: '1px solid rgba(13,20,16,0.12)', color: 'rgba(13,20,16,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(62,207,110,0.4)'; e.currentTarget.style.color = '#22a855' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,20,16,0.12)'; e.currentTarget.style.color = 'rgba(13,20,16,0.5)' }}>
            Export CSV ↓
          </button>
        </div>

        {/* Respondent list */}
        {loading ? (
          <p className="text-sm font-mono animate-pulse" style={{ color: 'rgba(13,20,16,0.4)' }}>Loading responses…</p>
        ) : visibleGroups.length === 0 ? (
          <div className="px-6 py-12 text-center"
            style={{ backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.08)' }}>
            <p className="text-sm" style={{ color: 'rgba(13,20,16,0.5)' }}>No responses yet.</p>
            <p className="text-xs mt-1 font-mono" style={{ color: 'rgba(13,20,16,0.3)' }}>
              Responses will appear here after the first survey submission.
            </p>
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
              />
            ))}
          </div>
        )}
      </main>

      <footer className="px-6 py-4 max-w-4xl mx-auto w-full" style={{ borderTop: '1px solid rgba(13,20,16,0.08)' }}>
        <p className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>
          Responses stored in Postgres — edit <code>data/questions.json</code> to update the survey.
        </p>
      </footer>
    </div>
  )
}

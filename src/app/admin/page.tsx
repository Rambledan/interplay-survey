'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ResponseEntry, AdminStats } from '@/app/api/admin/responses/route'

// ── Section colour palette ─────────────────────────────────────────────────
const SECTION_STYLES: Record<string, { badge: string; dot: string }> = {
  'appetite':                 { badge: 'text-brand-orange border-brand-orange/40 bg-brand-orange/10',  dot: 'bg-brand-orange' },
  'scale-and-delivery':       { badge: 'text-brand-blue   border-brand-blue/40   bg-brand-blue/10',    dot: 'bg-brand-blue' },
  'capability-sustainability': { badge: 'text-brand-green  border-brand-green/40  bg-brand-green/10',   dot: 'bg-brand-green' },
  'capability-brand':         { badge: 'text-purple-400   border-purple-400/40   bg-purple-400/10',    dot: 'bg-purple-400' },
  'capability-business':      { badge: 'text-yellow-400   border-yellow-400/40   bg-yellow-400/10',    dot: 'bg-yellow-400' },
}

const defaultStyle = { badge: 'text-white/60 border-white/20 bg-white/5', dot: 'bg-white/40' }

function sectionStyle(slug: string) {
  return SECTION_STYLES[slug] ?? defaultStyle
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
  sections: ResponseEntry[]
}

// ── Group responses by respondent ─────────────────────────────────────────

function groupByRespondent(responses: ResponseEntry[]): RespondentGroup[] {
  const map = new Map<string, RespondentGroup>()

  for (const r of responses) {
    const key = r.respondentName.toLowerCase()
    if (!map.has(key)) {
      map.set(key, { name: r.respondentName, role: r.respondentRole, sections: [] })
    }
    map.get(key)!.sections.push(r)
  }

  // Sort sections within each respondent by submission time ascending
  for (const group of map.values()) {
    group.sections.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  // Sort respondents by their earliest submission descending
  return Array.from(map.values()).sort((a, b) => {
    const aTime = a.sections[0]?.timestamp ?? ''
    const bTime = b.sections[0]?.timestamp ?? ''
    return bTime.localeCompare(aTime)
  })
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-white/8 bg-brand-surface p-5 flex flex-col gap-1">
      <span className="text-xs font-mono uppercase tracking-[0.15em] text-brand-muted">{label}</span>
      <span className="text-2xl font-bold text-white">{value}</span>
    </div>
  )
}

function SectionRow({
  response,
  expanded,
  onToggle,
}: {
  response: ResponseEntry
  expanded: boolean
  onToggle: () => void
}) {
  const { badge, dot } = sectionStyle(response.sectionSlug)

  return (
    <div className="border-t border-white/5">
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
        <span className={`text-xs font-mono px-2 py-0.5 border rounded-sm ${badge}`}>
          {response.sectionName}
        </span>
        <span className="text-xs text-brand-muted font-mono ml-auto">
          {formatDate(response.timestamp)}
        </span>
        <span className="text-brand-muted text-xs font-mono shrink-0">
          {response.answers.length}q {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="divide-y divide-white/5 bg-black/20">
          {response.answers.length === 0 ? (
            <p className="px-6 py-4 text-sm text-brand-muted italic">No answers recorded.</p>
          ) : (
            response.answers.map((a) => (
              <div key={a.questionId} className="px-6 py-3">
                <p className="text-xs text-brand-muted mb-1">{a.questionText}</p>
                <p className="text-sm text-white font-medium">
                  {a.answer || <span className="italic text-white/30">No answer</span>}
                </p>
                {a.followUp && (
                  <p className="text-xs text-white/50 mt-1 pl-3 border-l border-white/10 italic">
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

function RespondentCard({
  group,
  activeSection,
  expandedSectionId,
  onToggleSection,
  onDelete,
  deleting,
}: {
  group: RespondentGroup
  activeSection: string
  expandedSectionId: string | null
  onToggleSection: (id: string) => void
  onDelete: (name: string) => void
  deleting: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const visibleSections =
    activeSection === 'all'
      ? group.sections
      : group.sections.filter(s => s.sectionSlug === activeSection)

  if (visibleSections.length === 0) return null

  const latest = group.sections.reduce((a, b) =>
    a.timestamp > b.timestamp ? a : b
  )

  return (
    <div className="border border-white/8 bg-brand-surface">
      {/* Respondent header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-bold text-white">{group.name}</span>
            {group.role && (
              <span className="text-brand-muted text-xs">{group.role}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-brand-muted font-mono">
              {group.sections.length} section{group.sections.length !== 1 ? 's' : ''} completed
            </span>
            <span className="text-white/15 text-xs">·</span>
            <span className="text-xs text-brand-muted font-mono">
              Last: {formatDate(latest.timestamp)}
            </span>
          </div>
        </div>

        {/* Delete control */}
        <div className="shrink-0 flex items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-xs text-white/50 font-mono">Delete all responses?</span>
              <button
                onClick={() => {
                  setConfirmDelete(false)
                  onDelete(group.name)
                }}
                disabled={deleting}
                className="text-xs font-mono px-3 py-1.5 border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs font-mono px-2 py-1.5 text-brand-muted hover:text-white transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-mono px-3 py-1.5 border border-white/10 text-brand-muted hover:border-red-500/40 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Section rows */}
      {visibleSections.map(r => (
        <SectionRow
          key={r.id}
          response={r}
          expanded={expandedSectionId === r.id}
          onToggle={() => onToggleSection(r.id)}
        />
      ))}
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

    if (res.status === 401) {
      setError('Incorrect password.')
      return
    }

    if (!res.ok) {
      setError('Something went wrong. Please try again.')
      return
    }

    sessionStorage.setItem('admin-auth', pw)
    onSuccess(pw)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-brand-muted mb-2">
            Interrupt × Like So
          </p>
          <h1 className="text-xl font-bold text-white">Admin Access</h1>
          <p className="text-sm text-brand-muted mt-1">Interplay Method — Response Review</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            autoFocus
            className="w-full bg-brand-surface border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-green/60 transition-colors"
          />

          {error && (
            <p className="text-red-400 text-xs font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !pw}
            className="bg-brand-green text-brand-bg font-bold uppercase tracking-widest text-sm px-8 py-4 hover:bg-brand-green/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
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
    const saved = sessionStorage.getItem('admin-auth')
    if (saved) {
      setPassword(saved)
      fetchData(saved)
    } else {
      setAuthState('unauthenticated')
    }
  }, [fetchData])

  function handleLogin(pw: string) {
    setPassword(pw)
    fetchData(pw)
  }

  function handleLogout() {
    sessionStorage.removeItem('admin-auth')
    setPassword('')
    setAuthState('unauthenticated')
    setResponses([])
    setStats(null)
  }

  function handleExport() {
    const url = `/api/admin/export?token=${encodeURIComponent(password)}`
    window.open(url, '_blank')
  }

  async function handleDelete(respondentName: string) {
    setDeletingRespondent(respondentName)
    try {
      const res = await fetch(
        `/api/admin/responses?respondent=${encodeURIComponent(respondentName)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${password}` } }
      )
      if (res.ok) {
        await fetchData(password)
      }
    } finally {
      setDeletingRespondent(null)
    }
  }

  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-brand-muted text-sm font-mono animate-pulse">Loading…</span>
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return <LoginScreen onSuccess={handleLogin} />
  }

  // ── Derive section list for tabs ──────────────────────────────────────────
  const sections = Array.from(
    new Map(responses.map(r => [r.sectionSlug, r.sectionName])).entries()
  ).sort()

  const respondentGroups = groupByRespondent(responses)

  const visibleGroups = activeSection === 'all'
    ? respondentGroups
    : respondentGroups.filter(g => g.sections.some(s => s.sectionSlug === activeSection))

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-muted">Interrupt</span>
          <span className="text-white/20">×</span>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-muted">Like So</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-green">
            Admin — Response Review
          </span>
          <button
            onClick={() => fetchData(password)}
            className="text-xs text-brand-muted hover:text-white font-mono transition-colors"
            title="Refresh"
          >
            ↺
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-brand-muted hover:text-white font-mono transition-colors"
          >
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
              className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 border transition-colors ${
                activeSection === 'all'
                  ? 'border-brand-green text-brand-green bg-brand-green/10'
                  : 'border-white/10 text-brand-muted hover:border-white/30 hover:text-white'
              }`}
            >
              All ({respondentGroups.length} respondents)
            </button>

            {sections.map(([slug, name]) => {
              const count = stats?.bySection[slug] ?? 0
              const { badge } = sectionStyle(slug)
              return (
                <button
                  key={slug}
                  onClick={() => setActiveSection(slug)}
                  className={`text-xs font-mono uppercase tracking-wider px-3 py-1.5 border transition-colors ${
                    activeSection === slug
                      ? badge
                      : 'border-white/10 text-brand-muted hover:border-white/30 hover:text-white'
                  }`}
                >
                  {name} ({count})
                </button>
              )
            })}
          </div>

          <button
            onClick={handleExport}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 border border-white/10 text-brand-muted hover:border-brand-green/40 hover:text-brand-green transition-colors"
          >
            Export CSV ↓
          </button>
        </div>

        {/* Respondent list */}
        {loading ? (
          <p className="text-brand-muted text-sm font-mono animate-pulse">Loading responses…</p>
        ) : visibleGroups.length === 0 ? (
          <div className="border border-white/5 bg-brand-surface px-6 py-12 text-center">
            <p className="text-brand-muted text-sm">No responses yet.</p>
            <p className="text-white/30 text-xs mt-1 font-mono">
              Responses will appear here after the first survey submission.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleGroups.map(group => (
              <RespondentCard
                key={group.name.toLowerCase()}
                group={group}
                activeSection={activeSection}
                expandedSectionId={expandedSectionId}
                onToggleSection={(id) => setExpandedSectionId(expandedSectionId === id ? null : id)}
                onDelete={handleDelete}
                deleting={deletingRespondent === group.name}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="px-6 py-4 border-t border-white/5 max-w-4xl mx-auto w-full">
        <p className="text-xs text-brand-muted font-mono">
          Responses stored in Postgres — edit <code>data/questions.json</code> to update the survey.
        </p>
      </footer>
    </div>
  )
}

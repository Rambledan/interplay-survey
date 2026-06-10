'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RespondentInfo, SurveySection } from '@/types/survey'

// ── Styles ────────────────────────────────────────────────────────────────────

const inputCls = [
  'w-full px-4 py-3 text-sm',
  'focus:outline-none transition-colors',
].join(' ')

const inputStyle = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.88)',
  borderRadius: '4px',
}

// ── Session data shape ────────────────────────────────────────────────────────

interface SessionData {
  email: string | null
  name: string | null
  role: string | null
  company: string | null
  sector: string | null
  companyType: string | null
  sectionsDone: string[]
  isComplete: boolean
  resultsToken: string | null
}

// ── Inner form component (uses useSearchParams — must be inside Suspense) ─────

function StartForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const surveyToken = searchParams.get('token')

  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [sector, setSector] = useState('')
  const [companyType, setCompanyType] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sections, setSections] = useState<SurveySection[]>([])
  const [firstSection, setFirstSection] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const [tokenInvalid, setTokenInvalid] = useState(false)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  // Show a loading overlay while we fetch the session + sections and decide where to redirect.
  // Only relevant when arriving via a magic-link token.
  const [resuming, setResuming] = useState(!!surveyToken)

  // ── 1. Fetch survey sections ──────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/questions')
      .then(r => r.json())
      .then((data: { sections: SurveySection[] }) => {
        if (data.sections?.length > 0) {
          setSections(data.sections)
          setFirstSection(data.sections[0].slug)
        }
      })
      .catch(() => setFetchError(true))
  }, [])

  // ── 2. Load session from magic-link token ─────────────────────────────────
  useEffect(() => {
    if (!surveyToken) return

    fetch(`/api/session/${surveyToken}`)
      .then(r => {
        if (!r.ok) { setTokenInvalid(true); setResuming(false); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        const { session } = data as { session: SessionData }

        // Pre-populate form fields with whatever we have
        if (session.name)        setName(session.name)
        if (session.role)        setRole(session.role)
        if (session.company)     setCompany(session.company)
        if (session.sector)      setSector(session.sector)
        if (session.companyType) setCompanyType(session.companyType)
        if (session.email)       setEmail(session.email)

        // Store for the resume effect (step 3 below)
        setSessionData(session)
      })
      .catch(() => { setTokenInvalid(true); setResuming(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyToken])

  // ── 3. Resume redirect — runs once BOTH sections and session are ready ────
  // This effect waits for the sections list so we use real slugs, not a
  // hardcoded fallback that might not match the API.
  useEffect(() => {
    if (!sessionData || !sections.length || !surveyToken) return

    // Already finished — go to results
    if (sessionData.isComplete && sessionData.resultsToken) {
      router.replace(`/results/${sessionData.resultsToken}`)
      return
    }

    // Profile is saved → the respondent has been here before; go to their next section.
    // We check sessionData.name (not sectionsDone.length) so this also fires when
    // the user closed the tab mid-section 1 (before completing any section).
    if (sessionData.name) {
      const done = new Set(sessionData.sectionsDone ?? [])
      const targetSection = sections.find(s => !done.has(s.slug))
      if (targetSection) {
        // CRITICAL: populate sessionStorage before navigating to the survey page.
        // The survey page checks sessionStorage for the respondent on every load —
        // without this write it finds nothing, bounces back here, and loops.
        const respondent = {
          name:        sessionData.name,
          role:        sessionData.role        ?? '',
          company:     sessionData.company     ?? '',
          sector:      sessionData.sector      ?? '',
          companyType: sessionData.companyType ?? '',
          token:       surveyToken,
        }
        sessionStorage.setItem('interplay-respondent', JSON.stringify(respondent))
        persistToken(surveyToken)
        router.replace(`/survey/${targetSection.slug}?token=${surveyToken}`)
        // Leave resuming=true — overlay stays visible until navigation completes
        return
      }
    }

    // No redirect fired — show the form (pre-populated from session data)
    setResuming(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData, sections])

  // ── Form submit ───────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !role.trim() || !firstSection) return

    setLoading(true)

    // If an email is provided but we have no session token yet, create one now.
    // This handles the "Take survey now" flow where the user lands directly on /start.
    let activeToken = surveyToken
    const trimmedEmail = email.trim()

    if (!activeToken && trimmedEmail && trimmedEmail.includes('@')) {
      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:        name.trim(),
            email:       trimmedEmail,
            company:     company.trim(),
            role:        role.trim(),
            source:      'survey-start',
            startSurvey: true,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.surveyToken) activeToken = data.surveyToken
        }
      } catch {
        // Non-fatal — proceed anonymously if API fails
      }
    }

    const respondent: RespondentInfo = {
      name:        name.trim(),
      role:        role.trim(),
      company:     company.trim(),
      sector:      sector.trim(),
      companyType,
      token:       activeToken,
    }

    // Persist to sessionStorage + localStorage
    sessionStorage.setItem('interplay-respondent', JSON.stringify(respondent))
    persistToken(activeToken)

    // Save full profile to the survey session (non-blocking, non-fatal)
    if (activeToken) {
      try {
        await fetch(`/api/session/${activeToken}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:        respondent.name,
            role:        respondent.role,
            company:     respondent.company,
            sector:      respondent.sector,
            companyType: respondent.companyType,
          }),
        })
      } catch {
        // Non-fatal — survey still proceeds
      }
    }

    const dest = `/survey/${firstSection}${activeToken ? `?token=${activeToken}` : ''}`
    router.push(dest)
  }

  function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'rgba(250,240,0,0.55)'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(250,240,0,0.08)'
  }
  function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
    e.currentTarget.style.boxShadow = 'none'
  }

  // ── Loading overlay (shown while resolving magic-link token) ─────────────
  if (resuming) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ backgroundColor: '#2f2a2a' }}
      >
        <div
          style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid rgba(250,240,0,0.15)',
            borderRadius: '6px',
            padding: '48px 56px',
            textAlign: 'center',
            maxWidth: '380px',
            width: '100%',
          }}
        >
          {/* Pulsing yellow dots */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '28px' }}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#faf000',
                  opacity: 0.9,
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <p
            style={{
              fontFamily: 'Almarai, monospace',
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(250,240,0,0.55)',
              margin: '0 0 8px',
            }}
          >
            Resuming your survey
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            Taking you back to where you left off…
          </p>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.25; transform: scale(0.85); }
            50%       { opacity: 1;    transform: scale(1.1);  }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#2f2a2a', color: 'rgba(255,255,255,0.92)' }}>

      {/* Header — matches survey shell */}
      <header className="px-6 py-5 flex items-center justify-between"
        style={{ backgroundColor: '#1a1717', borderBottom: '1px solid rgba(250,240,0,0.15)' }}>
        <div className="flex items-center">
          <img src="/interplay-logo-yellow.png" alt="Interplay" style={{ height: '28px', width: 'auto' }} />
        </div>
        <span className="text-xs uppercase tracking-[0.2em]"
          style={{ fontFamily: 'Almarai, sans-serif', color: '#2f2a2a', backgroundColor: '#faf000', padding: '3px 8px' }}>
          Interplay Method
        </span>
      </header>

      {/* Yellow accent line */}
      <div style={{ height: '2px', backgroundColor: 'rgba(250,240,0,0.25)' }} />

      <main className="flex-1 px-6 py-16 max-w-xl mx-auto w-full">

        {/* Eyebrow */}
        <p className="text-xs uppercase tracking-[0.25em] mb-6"
          style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.6)' }}>
          Get ready to Interplay
        </p>

        {/* Main headline */}
        <h1 className="uppercase leading-none mb-6"
          style={{
            fontFamily: 'Robson, sans-serif',
            fontSize: 'clamp(2.4rem, 5.5vw, 3.75rem)',
            color: '#faf000',
            fontWeight: 400,
            letterSpacing: '-0.01em',
            lineHeight: 0.9,
          }}>
          Test your sustainability<br />
          growth potential
        </h1>

        {/* Subtitle — expectation setting */}
        <p className="text-sm leading-relaxed mb-10 max-w-md"
          style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'Open Sans, sans-serif' }}>
          The diagnostic takes around 15 minutes. Your answers save automatically as you go — to pick up where you left off, use the link we&apos;ll send to your email. At the end you&apos;ll see your Interplay scores straight away, and you can come back to them any time.
        </p>

        {/* Invalid token notice */}
        {tokenInvalid && (
          <div className="px-5 py-4 text-sm mb-6"
            style={{ border: '1px solid rgba(250,200,0,0.3)', backgroundColor: 'rgba(250,200,0,0.06)', color: 'rgba(250,200,0,0.85)' }}>
            This link has expired or is not valid. You can still complete the survey below — your answers will be saved as you go.
          </div>
        )}

        {/* Form */}
        {fetchError ? (
          <div className="px-5 py-4 text-sm mb-14" style={{ border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#dc2626' }}>
            Failed to load survey. Please refresh the page.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mb-16">

            {[
              { id: 'name',    label: 'Your name',  value: name,    set: setName,    placeholder: 'Jane Smith' },
              { id: 'role',    label: 'Your role',  value: role,    set: setRole,    placeholder: 'Head of Sustainability' },
              { id: 'company', label: 'Company',    value: company, set: setCompany, placeholder: 'Acme Corp' },
              { id: 'sector',  label: 'Sector',     value: sector,  set: setSector,  placeholder: 'Food & Beverage' },
            ].map(({ id, label, value, set, placeholder }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-xs uppercase tracking-widest mb-2"
                  style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.55)' }}>
                  {label}
                </label>
                <input
                  id={id}
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  required
                  className={inputCls}
                  style={{ ...inputStyle, caretColor: '#faf000', colorScheme: 'dark' }}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
            ))}

            {/* Email — optional but strongly encouraged; creates a save link */}
            {!surveyToken && (
              <div>
                <label htmlFor="email" className="block text-xs uppercase tracking-widest mb-2"
                  style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.55)' }}>
                  Work email <span style={{ color: 'rgba(250,240,0,0.35)', textTransform: 'none', letterSpacing: 0 }}>*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  autoComplete="email"
                  required
                  className={inputCls}
                  style={{ ...inputStyle, caretColor: '#faf000', colorScheme: 'dark' }}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
                <p className="mt-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  We&apos;ll send your report here and a save link so you can pick up where you left off.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="companyType" className="block text-xs uppercase tracking-widest mb-2"
                style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.55)' }}>
                Company type
              </label>
              <select
                id="companyType"
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
                required
                className={`${inputCls} appearance-none`}
                style={{ ...inputStyle, color: companyType ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.3)', colorScheme: 'dark' }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              >
                <option value="" disabled>Select one…</option>
                <option value="Public">Public</option>
                <option value="Private">Private</option>
                <option value="Not-for-profit">Not-for-profit</option>
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={!name.trim() || !role.trim() || !company.trim() || !sector.trim() || !companyType || !firstSection || loading || (!surveyToken && !email.trim().includes('@'))}
                className="w-full font-bold uppercase tracking-widest py-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: '#faf000', color: '#2f2a2a', borderRadius: '6px' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#e8df00' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#faf000' }}
              >
                {loading ? 'Starting…' : 'Start survey →'}
              </button>
            </div>

          </form>
        )}

      </main>

      <footer className="px-6 py-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs" style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(255,255,255,0.25)' }}>
          Interrupt × Like So — The Interplay Method®
        </p>
      </footer>
    </div>
  )
}

// ── Token persistence helpers ─────────────────────────────────────────────────

function persistToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) {
    sessionStorage.setItem('interplay-survey-token', token)
    localStorage.setItem('interplay-survey-token', token)
  }
}

// ── Page shell with Suspense (required for useSearchParams in App Router) ─────

export default function StartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2f2a2a' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Loading…</p>
      </div>
    }>
      <StartForm />
    </Suspense>
  )
}

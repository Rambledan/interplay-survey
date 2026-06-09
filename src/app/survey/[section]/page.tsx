'use client'

import { Suspense, useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RespondentInfo, SurveySection, SurveyResponse } from '@/types/survey'
import { SurveyShell } from '@/components/survey/SurveyShell'
import { QuestionRenderer } from '@/components/survey/QuestionRenderer'
import { Button } from '@/components/ui/Button'

interface SectionPageProps {
  params: Promise<{ section: string }>
}

type Status = 'idle' | 'loading' | 'saving' | 'error'

// ── Draft persistence (survives Back navigation and tab refresh) ──────────────

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000  // 24 hours

function saveDraft(
  slug: string,
  answers: Record<string, string>,
  followUps: Record<string, string>
) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      `interplay-draft-${slug}`,
      JSON.stringify({ answers, followUps, ts: Date.now() })
    )
  } catch { /* quota error — ignore */ }
}

function loadDraft(
  slug: string
): { answers: Record<string, string>; followUps: Record<string, string> } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`interplay-draft-${slug}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { answers: Record<string, string>; followUps: Record<string, string>; ts: number }
    if (Date.now() - parsed.ts > DRAFT_TTL_MS) {
      localStorage.removeItem(`interplay-draft-${slug}`)
      return null
    }
    return { answers: parsed.answers, followUps: parsed.followUps }
  } catch { return null }
}

function clearDraft(slug: string) {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(`interplay-draft-${slug}`) } catch { /* ignore */ }
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function getSurveyToken(urlToken: string | null): string | null {
  if (urlToken) return urlToken
  if (typeof window === 'undefined') return null
  return (
    sessionStorage.getItem('interplay-survey-token') ??
    localStorage.getItem('interplay-survey-token') ??
    null
  )
}

function persistToken(token: string | null) {
  if (typeof window === 'undefined' || !token) return
  sessionStorage.setItem('interplay-survey-token', token)
  localStorage.setItem('interplay-survey-token', token)
}

// ── Inner section component (uses useSearchParams — must be inside Suspense) ──

function SectionContent({ params }: SectionPageProps) {
  const { section: sectionSlug } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlToken = searchParams.get('token')

  const [sections, setSections] = useState<SurveySection[]>([])
  const [respondent, setRespondent] = useState<RespondentInfo | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [followUps, setFollowUps] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [emailOk, setEmailOk] = useState(true)  // false = show bounce warning

  useEffect(() => {
    // Persist URL token to storage so subsequent sections keep it
    if (urlToken) persistToken(urlToken)

    const stored = sessionStorage.getItem('interplay-respondent')
    if (!stored) {
      // SessionStorage lost (tab closed and reopened) — try localStorage for token
      const lsToken = localStorage.getItem('interplay-survey-token')
      if (lsToken) {
        router.replace(`/start?token=${lsToken}`)
      } else {
        router.replace('/')
      }
      return
    }
    setRespondent(JSON.parse(stored))

    fetch('/api/questions')
      .then(r => r.json())
      .then((data: { sections: SurveySection[] }) => {
        setSections(data.sections ?? [])
        setStatus('idle')
      })
      .catch(() => {
        setErrorMsg('Failed to load questions. Please refresh.')
        setStatus('error')
      })
  }, [router, urlToken])

  // Restore saved draft when the section and its questions are available.
  // This fires after the questions load AND whenever sectionSlug changes (Back nav).
  useEffect(() => {
    if (sections.length === 0) return
    const draft = loadDraft(sectionSlug)
    if (draft) {
      setAnswers(draft.answers)
      setFollowUps(draft.followUps)
    } else {
      // Clear stale answers when switching to a section without a saved draft
      setAnswers({})
      setFollowUps({})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionSlug, sections.length])

  // ── Send a beacon when the user leaves mid-survey ─────────────────────────
  // visibilitychange fires reliably on tab close, navigate away, and device lock.
  // navigator.sendBeacon survives the page being unloaded.
  useEffect(() => {
    const surveyToken = getSurveyToken(urlToken)
    if (!surveyToken) return  // anonymous session — no email to send

    function handleLeave() {
      if (document.visibilityState !== 'hidden') return
      // Don't ping if survey is complete or we're on the last section submit
      if (status === 'saving') return

      const next = sections.length > 0
        ? sections[sections.findIndex(s => s.slug === sectionSlug) + 1]?.slug ?? null
        : null

      const payload = JSON.stringify({
        surveyToken,
        sectionSlug,
        nextSectionSlug: next,
      })

      try {
        navigator.sendBeacon('/api/survey/ping', new Blob([payload], { type: 'application/json' }))
      } catch {
        // sendBeacon not supported — silent fail, nudge via admin panel instead
      }
    }

    document.addEventListener('visibilitychange', handleLeave)
    return () => document.removeEventListener('visibilitychange', handleLeave)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken, sectionSlug, sections, status])

  const currentSection = sections.find(s => s.slug === sectionSlug)
  const currentIndex   = sections.findIndex(s => s.slug === sectionSlug)
  const nextSection    = currentIndex >= 0 ? sections[currentIndex + 1] : null
  const isLastSection  = currentIndex === sections.length - 1 && sections.length > 0

  function handleAnswerChange(questionId: string, value: string) {
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: value }
      saveDraft(sectionSlug, updated, followUps)
      return updated
    })
  }

  function handleFollowUpChange(questionId: string, value: string) {
    setFollowUps(prev => {
      const updated = { ...prev, [questionId]: value }
      saveDraft(sectionSlug, answers, updated)
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!respondent || !currentSection) return

    setStatus('saving')
    setErrorMsg(null)

    const surveyToken = getSurveyToken(urlToken)

    const payload: SurveyResponse = {
      respondent,
      sectionSlug,
      answers,
      followUps,
      submittedAt: new Date().toISOString(),
      surveyToken:   surveyToken ?? undefined,
      isLastSection,
    }

    // ── Network-error retry (up to 3 attempts with backoff) ───────────────────
    // Only retries on fetch() throwing (network unreachable / DNS failure).
    // A non-2xx HTTP response is NOT retried — the server intentionally rejected it.
    const MAX_ATTEMPTS = 3
    let response: Response | null = null

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) {
        setErrorMsg(`Connection issue — retrying (${attempt} of ${MAX_ATTEMPTS})…`)
        await new Promise(r => setTimeout(r, 1500 * (attempt - 1)))
      }
      try {
        response = await fetch('/api/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        setErrorMsg(null)  // Clear any retry message once we have a response
        break  // Got an HTTP response — stop retrying regardless of status
      } catch {
        if (attempt === MAX_ATTEMPTS) {
          setErrorMsg('Could not reach the server. Please check your connection and try again.')
          setStatus('idle')
          return
        }
      }
    }

    if (!response) return  // Unreachable but satisfies TypeScript

    if (!response.ok) {
      let errMsg = 'Submission failed'
      try {
        const err = await response.json()
        errMsg = err.error ?? errMsg
      } catch { /* non-JSON error body */ }
      setErrorMsg(errMsg)
      setStatus('idle')
      return
    }

    const data = await response.json()

    // Relay email delivery status for the bounce warning
    if (typeof data.emailOk === 'boolean' && !data.emailOk) {
      setEmailOk(false)
    }

    // Survey complete — navigate to referral; results email already sent
    if (data.completed || isLastSection) {
      // Clear all section drafts now that the survey is fully submitted
      sections.forEach(s => clearDraft(s.slug))
      const tokenSuffix = surveyToken ? `?token=${surveyToken}` : ''
      router.push(`/referral${tokenSuffix}`)
      return
    }

    if (nextSection) {
      const tokenSuffix = surveyToken ? `?token=${surveyToken}` : ''
      router.push(`/survey/${nextSection.slug}${tokenSuffix}`)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2f2a2a' }}>
        <div className="text-sm animate-pulse" style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.4)' }}>Loading…</div>
      </div>
    )
  }

  if (status === 'error' || !currentSection) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#2f2a2a' }}>
        <div className="max-w-sm text-center">
          <p className="text-sm mb-4" style={{ color: '#dc2626' }}>{errorMsg ?? `Section "${sectionSlug}" not found.`}</p>
          <button onClick={() => router.push('/')} className="text-sm underline" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Return to start
          </button>
        </div>
      </div>
    )
  }

  const surveyToken = getSurveyToken(urlToken)

  return (
    <>
      {/* Email bounce warning banner */}
      {!emailOk && (
        <div
          role="alert"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: 'rgba(180,100,0,0.92)',
            padding: '10px 20px',
            fontSize: '13px',
            lineHeight: 1.5,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠</span>
          <span>
            Your save link couldn&apos;t be delivered — keep this tab open or you may lose your progress if you close it.
          </span>
        </div>
      )}

      <SurveyShell sections={sections} currentSection={currentSection}>
        <form onSubmit={handleSubmit}>
          {currentSection.questions.map(question => (
            <QuestionRenderer
              key={question.id}
              question={question}
              answer={answers[question.id] ?? ''}
              followUp={followUps[question.id] ?? ''}
              onAnswerChange={handleAnswerChange}
              onFollowUpChange={handleFollowUpChange}
            />
          ))}

          {errorMsg && (
            <div className="mb-6 px-4 py-3 text-sm"
              style={{ border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#dc2626' }}>
              {errorMsg}
            </div>
          )}

          <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {currentIndex > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const tokenSuffix = surveyToken ? `?token=${surveyToken}` : ''
                  router.push(`/survey/${sections[currentIndex - 1].slug}${tokenSuffix}`)
                }}
                className="text-sm transition-colors"
                style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
              >
                ← Back
              </button>
            ) : <span />}

            <Button type="submit" loading={status === 'saving'}>
              {isLastSection ? 'Complete diagnostic →' : 'Next section →'}
            </Button>
          </div>
        </form>
      </SurveyShell>
    </>
  )
}

// ── Page shell with Suspense (required for useSearchParams in App Router) ─────

export default function SectionPage({ params }: SectionPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2f2a2a' }}>
        <div className="text-sm animate-pulse" style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.4)' }}>Loading…</div>
      </div>
    }>
      <SectionContent params={params} />
    </Suspense>
  )
}

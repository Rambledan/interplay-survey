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
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  function handleFollowUpChange(questionId: string, value: string) {
    setFollowUps(prev => ({ ...prev, [questionId]: value }))
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

    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let errMsg = 'Submission failed'
        try {
          const err = await res.json()
          errMsg = err.error ?? errMsg
        } catch { /* non-JSON error body */ }
        throw new Error(errMsg)
      }

      const data = await res.json()

      // Relay email delivery status for the bounce warning
      if (typeof data.emailOk === 'boolean' && !data.emailOk) {
        setEmailOk(false)
      }

      // Survey complete — navigate to referral; results email already sent
      if (data.completed) {
        const tokenSuffix = surveyToken ? `?token=${surveyToken}` : ''
        router.push(`/referral${tokenSuffix}`)
        return
      }

      if (isLastSection) {
        const tokenSuffix = surveyToken ? `?token=${surveyToken}` : ''
        router.push(`/referral${tokenSuffix}`)
      } else if (nextSection) {
        setAnswers({})
        setFollowUps({})
        const tokenSuffix = surveyToken ? `?token=${surveyToken}` : ''
        router.push(`/survey/${nextSection.slug}${tokenSuffix}`)
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('idle')
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

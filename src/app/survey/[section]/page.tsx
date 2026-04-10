'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import type { RespondentInfo, SurveySection, SurveyResponse } from '@/types/survey'
import { SurveyShell } from '@/components/survey/SurveyShell'
import { QuestionRenderer } from '@/components/survey/QuestionRenderer'
import { Button } from '@/components/ui/Button'

interface SectionPageProps {
  params: Promise<{ section: string }>
}

type Status = 'idle' | 'loading' | 'saving' | 'error'

export default function SectionPage({ params }: SectionPageProps) {
  const { section: sectionSlug } = use(params)
  const router = useRouter()

  const [sections, setSections] = useState<SurveySection[]>([])
  const [respondent, setRespondent] = useState<RespondentInfo | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [followUps, setFollowUps] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('interplay-respondent')
    if (!stored) {
      router.replace('/')
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
  }, [router])

  const currentSection = sections.find(s => s.slug === sectionSlug)
  const currentIndex = sections.findIndex(s => s.slug === sectionSlug)
  const nextSection = currentIndex >= 0 ? sections[currentIndex + 1] : null
  const isLastSection = currentIndex === sections.length - 1 && sections.length > 0

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

    const payload: SurveyResponse = {
      respondent,
      sectionSlug,
      answers,
      followUps,
      submittedAt: new Date().toISOString(),
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

      if (isLastSection) {
        router.push('/referral')
      } else if (nextSection) {
        setAnswers({})
        setFollowUps({})
        router.push(`/survey/${nextSection.slug}`)
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('idle')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#faf9f5' }}>
        <div className="text-sm animate-pulse" style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(47,42,42,0.4)' }}>Loading…</div>
      </div>
    )
  }

  if (status === 'error' || !currentSection) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#faf9f5' }}>
        <div className="max-w-sm text-center">
          <p className="text-sm mb-4" style={{ color: '#dc2626' }}>{errorMsg ?? `Section "${sectionSlug}" not found.`}</p>
          <button onClick={() => router.push('/')} className="text-sm underline" style={{ color: '#2f2a2a' }}>
            Return to start
          </button>
        </div>
      </div>
    )
  }

  return (
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

        <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid rgba(47,42,42,0.1)' }}>
          {currentIndex > 0 ? (
            <button
              type="button"
              onClick={() => router.push(`/survey/${sections[currentIndex - 1].slug}`)}
              className="text-sm transition-colors hover:opacity-100"
              style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(47,42,42,0.45)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#2f2a2a'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(47,42,42,0.45)'}
            >
              ← Back
            </button>
          ) : <span />}

          <Button
            type="submit"
            loading={status === 'saving'}
          >
            {isLastSection ? 'Complete diagnostic →' : 'Next section →'}
          </Button>
        </div>
      </form>
    </SurveyShell>
  )
}

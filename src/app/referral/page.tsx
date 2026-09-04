'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import type { RespondentInfo } from '@/types/survey'

interface Referee {
  name: string
  email: string
}

const EMPTY_REFEREE: Referee = { name: '', email: '' }

const inputCls = 'w-full px-4 py-3 text-sm focus:outline-none transition-colors'

const inputStyle = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.88)',
  borderRadius: '4px',
}

function ReferralForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const surveyToken = searchParams.get('token')

  const [respondent, setRespondent] = useState<RespondentInfo | null>(null)
  const [referees, setReferees] = useState<Referee[]>(
    Array.from({ length: 5 }, () => ({ ...EMPTY_REFEREE }))
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('interplay-respondent')
    if (!stored) {
      const lsToken = localStorage.getItem('interplay-survey-token')
      router.replace(lsToken ? `/start?token=${lsToken}` : '/')
      return
    }
    setRespondent(JSON.parse(stored))
  }, [router])

  function updateReferee(index: number, field: keyof Referee, value: string) {
    setReferees(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const filledCount = referees.filter(r => r.name.trim() && r.email.trim()).length

  const nextDest = `/next-steps${surveyToken ? `?token=${surveyToken}` : ''}`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerName: respondent?.name ?? '',
          referees,
          submittedAt: new Date().toISOString(),
        }),
      })
    } catch {
      // Best-effort — don't block progression
    }

    router.push(nextDest)
  }

  function focusBorder(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(250,240,0,0.5)'
  }
  function blurBorder(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#2f2a2a', color: 'rgba(255,255,255,0.92)' }}>

      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(250,240,0,0.12)' }}>
        <div className="flex items-center gap-4">
          <img src="/Logo+small.png.webp" alt="Interrupt" style={{ height: '36px', width: 'auto', filter: 'invert(1)' }} />
        </div>
        <span className="text-xs uppercase tracking-[0.2em]"
          style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.45)' }}>
          Interplay Method
        </span>
      </header>

      <main className="flex-1 px-6 py-16 max-w-2xl mx-auto w-full">

        <p className="text-xs uppercase tracking-[0.25em] mb-6"
          style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.55)' }}>
          Almost done
        </p>

        <h1 className="uppercase leading-none mb-8"
          style={{
            fontFamily: 'Robson, sans-serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            color: 'rgba(255,255,255,0.95)',
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}>
          Know anyone else<br />
          <span style={{ color: '#faf000' }}>in the interplay?</span>
        </h1>

        <p className="text-sm leading-relaxed mb-10 max-w-lg"
          style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.01em' }}>
          Introduce colleagues from your sustainability, brand or business teams — they can take the same diagnostic and we&apos;ll map the interplay across your organisation.
        </p>

        <form onSubmit={handleSubmit} className="max-w-lg">

          {/* Column headers */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <span className="text-xs uppercase tracking-widest"
              style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.4)' }}>Name</span>
            <span className="text-xs uppercase tracking-widest"
              style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.4)' }}>Email address</span>
          </div>

          <div className="space-y-2 mb-8">
            {referees.map((referee, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={referee.name}
                  onChange={e => updateReferee(i, 'name', e.target.value)}
                  placeholder={`Person ${i + 1}`}
                  className={inputCls}
                  style={{ ...inputStyle, caretColor: '#faf000', colorScheme: 'dark' }}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
                <input
                  type="email"
                  value={referee.email}
                  onChange={e => updateReferee(i, 'email', e.target.value)}
                  placeholder="name@company.com"
                  className={inputCls}
                  style={{ ...inputStyle, caretColor: '#faf000', colorScheme: 'dark' }}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              type="button"
              onClick={() => router.push(nextDest)}
              className="text-sm transition-colors"
              style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
            >
              Skip →
            </button>

            <button
              type="submit"
              disabled={submitting || filledCount === 0}
              className="font-bold uppercase tracking-widest py-4 px-8 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: '#faf000', color: '#2f2a2a', borderRadius: '6px' }}
              onMouseEnter={e => { if (!submitting && filledCount > 0) e.currentTarget.style.backgroundColor = '#e8df00' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#faf000' }}
            >
              {submitting
                ? 'Sending…'
                : filledCount > 0
                  ? `Introduce ${filledCount} colleague${filledCount !== 1 ? 's' : ''} →`
                  : 'Add colleagues above →'}
            </button>
          </div>
        </form>
      </main>

      <footer className="px-6 py-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs" style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(255,255,255,0.25)' }}>
          Interrupt — The Interplay Method®
        </p>
      </footer>
    </div>
  )
}

export default function ReferralPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2f2a2a' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Loading…</p>
      </div>
    }>
      <ReferralForm />
    </Suspense>
  )
}

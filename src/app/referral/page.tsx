'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { RespondentInfo } from '@/types/survey'

interface Referee {
  name: string
  email: string
}

const EMPTY_REFEREE: Referee = { name: '', email: '' }

const inputStyle = {
  backgroundColor: '#fff',
  border: '1px solid rgba(13,20,16,0.12)',
  color: '#0d1410',
}

export default function ReferralPage() {
  const router = useRouter()
  const [respondent, setRespondent] = useState<RespondentInfo | null>(null)
  const [referees, setReferees] = useState<Referee[]>(
    Array.from({ length: 5 }, () => ({ ...EMPTY_REFEREE }))
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('interplay-respondent')
    if (!stored) {
      router.replace('/')
      return
    }
    setRespondent(JSON.parse(stored))
  }, [router])

  function updateReferee(index: number, field: keyof Referee, value: string) {
    setReferees(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const filledCount = referees.filter(r => r.name.trim() && r.email.trim()).length

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
      // Best-effort — don't block progression on referral errors
    }

    router.push('/complete')
  }

  function handleSkip() {
    router.push('/complete')
  }

  function focusBorder(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(62,207,110,0.5)'
  }
  function blurBorder(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(13,20,16,0.12)'
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f6f8f6' }}>
      <header className="px-6 py-5 flex items-center justify-between"
        style={{ backgroundColor: '#fff', borderBottom: '1px solid rgba(13,20,16,0.08)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(13,20,16,0.4)' }}>Interrupt</span>
          <span style={{ color: 'rgba(13,20,16,0.2)' }}>×</span>
          <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(13,20,16,0.4)' }}>Like So</span>
        </div>
        <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: '#3ecf6e' }}>Interplay Method</span>
      </header>

      <main className="flex-1 flex flex-col justify-center px-6 py-16 max-w-2xl mx-auto w-full">

        <p className="text-xs font-mono uppercase tracking-[0.3em] mb-6" style={{ color: '#3ecf6e' }}>
          Almost done
        </p>

        <h1 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tight mb-6" style={{ color: '#0d1410' }}>
          Know anyone else<br />
          <span style={{ color: '#3ecf6e' }}>in the interplay?</span>
        </h1>

        <p className="text-base leading-relaxed mb-10 max-w-lg" style={{ color: 'rgba(13,20,16,0.6)' }}>
          Introduce colleagues from your sustainability, brand or business teams — they can take the same diagnostic and we'll map the interplay across your organisation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Column headers */}
          <div className="grid grid-cols-2 gap-3 mb-1">
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'rgba(13,20,16,0.4)' }}>Name</span>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'rgba(13,20,16,0.4)' }}>Email address</span>
          </div>

          {referees.map((referee, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={referee.name}
                onChange={e => updateReferee(i, 'name', e.target.value)}
                placeholder={`Person ${i + 1}`}
                className="px-4 py-3 text-sm focus:outline-none transition-colors"
                style={{ ...inputStyle }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              <input
                type="email"
                value={referee.email}
                onChange={e => updateReferee(i, 'email', e.target.value)}
                placeholder="name@company.com"
                className="px-4 py-3 text-sm focus:outline-none transition-colors"
                style={{ ...inputStyle }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </div>
          ))}

          <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(13,20,16,0.08)' }}>
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm font-mono transition-colors"
              style={{ color: 'rgba(13,20,16,0.45)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#0d1410'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(13,20,16,0.45)'}
            >
              Skip →
            </button>

            <button
              type="submit"
              disabled={submitting || filledCount === 0}
              className="bg-brand-green text-brand-bg font-black uppercase tracking-widest py-4 px-8 text-sm hover:bg-brand-green/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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

      <footer className="px-6 py-4 text-center" style={{ borderTop: '1px solid rgba(13,20,16,0.08)' }}>
        <p className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>
          Interrupt × Like So — The Interplay Method®
        </p>
      </footer>
    </div>
  )
}

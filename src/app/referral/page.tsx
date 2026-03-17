'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { RespondentInfo } from '@/types/survey'

interface Referee {
  name: string
  email: string
}

const EMPTY_REFEREE: Referee = { name: '', email: '' }

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-muted">Interrupt</span>
          <span className="text-white/20">×</span>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-muted">Like So</span>
        </div>
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-green">Interplay Method</span>
      </header>

      <main className="flex-1 flex flex-col justify-center px-6 py-16 max-w-2xl mx-auto w-full">

        <p className="text-xs font-mono uppercase tracking-[0.3em] text-brand-green mb-6">
          Almost done
        </p>

        <h1 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tight text-white mb-6">
          Know anyone else<br />
          <span className="text-brand-green">in the interplay?</span>
        </h1>

        <p className="text-white/60 text-base leading-relaxed mb-10 max-w-lg">
          Introduce colleagues from your sustainability, brand or business teams — they can take the same diagnostic and we'll map the interplay across your organisation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Column headers */}
          <div className="grid grid-cols-2 gap-3 mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-brand-muted">Name</span>
            <span className="text-xs font-mono uppercase tracking-widest text-brand-muted">Email address</span>
          </div>

          {referees.map((referee, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={referee.name}
                onChange={e => updateReferee(i, 'name', e.target.value)}
                placeholder={`Person ${i + 1}`}
                className="bg-white/5 border border-white/10 text-white placeholder-white/20 px-4 py-3 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
              />
              <input
                type="email"
                value={referee.email}
                onChange={e => updateReferee(i, 'email', e.target.value)}
                placeholder="name@company.com"
                className="bg-white/5 border border-white/10 text-white placeholder-white/20 px-4 py-3 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
              />
            </div>
          ))}

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={handleSkip}
              className="text-brand-muted text-sm hover:text-white transition-colors font-mono"
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

      <footer className="px-6 py-4 border-t border-white/5 text-center">
        <p className="text-xs text-brand-muted font-mono">
          Interrupt × Like So — The Interplay Method®
        </p>
      </footer>
    </div>
  )
}

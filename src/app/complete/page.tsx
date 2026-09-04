'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function CompleteContent() {
  const searchParams = useSearchParams()
  const tokenParam = searchParams.get('token')

  const [resultsToken, setResultsToken] = useState<string | null>(null)

  useEffect(() => {
    // Try to get the results token via the survey session
    const surveyToken = tokenParam ?? (typeof localStorage !== 'undefined'
      ? localStorage.getItem('interplay-survey-token')
      : null)

    if (!surveyToken) return

    fetch(`/api/session/${surveyToken}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.session?.resultsToken) {
          setResultsToken(data.session.resultsToken)
        }
      })
      .catch(() => {/* non-fatal */})
  }, [tokenParam])

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

        {/* Eyebrow */}
        <p className="text-xs uppercase tracking-[0.25em] mb-6"
          style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.55)' }}>
          You&rsquo;re done
        </p>

        {/* Headline */}
        <h1 className="uppercase leading-none mb-8"
          style={{
            fontFamily: 'Robson, sans-serif',
            fontSize: 'clamp(2.4rem, 5.5vw, 3.75rem)',
            color: 'rgba(255,255,255,0.95)',
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}>
          Thank you for<br />
          <span style={{ color: '#faf000' }}>playing.</span>
        </h1>

        <p className="text-sm leading-relaxed mb-4 max-w-lg"
          style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.01em' }}>
          Your personalised Interplay report is on its way — check your inbox.
        </p>

        <p className="text-sm leading-relaxed mb-10 max-w-lg"
          style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.01em' }}>
          The report maps how your sustainability, brand and business strategies interact — and where the biggest value opportunities lie.
        </p>

        {/* View report CTA — shown once the results token is resolved */}
        {resultsToken && (
          <div className="mb-10">
            <a
              href={`/results/${resultsToken}`}
              className="font-bold uppercase tracking-widest py-4 px-8 text-sm transition-all inline-block"
              style={{ backgroundColor: '#faf000', color: '#2f2a2a', borderRadius: '6px', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#e8df00'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#faf000'}
            >
              View my report →
            </a>
          </div>
        )}

        {/* Triple value recap */}
        <div className="flex gap-3 max-w-lg">
          {[
            { label: 'Sustainability value', desc: 'Impact on society and planet', color: 'rgba(62,207,110,0.7)' },
            { label: 'Brand value',          desc: 'Desirability and differentiation', color: 'rgba(232,98,109,0.7)' },
            { label: 'Business value',       desc: 'Margins and growth', color: 'rgba(95,159,223,0.7)' },
          ].map(({ label, desc, color }) => (
            <div key={label} className="flex-1 px-3 py-4"
              style={{ border: `1px solid ${color}`, borderRadius: '4px' }}>
              <p className="text-[10px] uppercase tracking-widest mb-1"
                style={{ fontFamily: 'Almarai, sans-serif', color }}>{label}</p>
              <p className="text-[11px] leading-tight" style={{ color: 'rgba(255,255,255,0.35)' }}>{desc}</p>
            </div>
          ))}
        </div>

      </main>

      <footer className="px-6 py-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs" style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(255,255,255,0.25)' }}>
          Interrupt — The Interplay Method®
        </p>
      </footer>
    </div>
  )
}

export default function CompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2f2a2a' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Loading…</p>
      </div>
    }>
      <CompleteContent />
    </Suspense>
  )
}

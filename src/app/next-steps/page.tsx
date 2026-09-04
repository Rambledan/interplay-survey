'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const CALENDAR_URL = 'https://calendar.app.google/aBnk5aQYmSQMXFwN8'

function NextStepsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const surveyToken = searchParams.get('token')

  const completeDest = `/complete${surveyToken ? `?token=${surveyToken}` : ''}`

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
          Diagnostic complete
        </p>

        {/* Headline */}
        <h1 className="uppercase leading-none mb-8"
          style={{
            fontFamily: 'Robson, sans-serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            color: 'rgba(255,255,255,0.95)',
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}>
          Take it further<br />
          <span style={{ color: '#faf000' }}>with a full assessment</span>
        </h1>

        <p className="text-sm leading-relaxed mb-8 max-w-lg"
          style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.01em' }}>
          Your Interplay score gives you the picture. A full 30-minute assessment with the Interrupt team turns it into a plan — with bespoke recommendations, a quantified financial opportunity, and a board-ready report tailored to your organisation.
        </p>

        {/* Value props */}
        <div className="space-y-3 mb-10 max-w-lg">
          {[
            { label: 'Bespoke analysis', body: 'Deep-dive into your specific sector, business model and competitive context.' },
            { label: 'Quantified opportunity', body: 'Financial modelling of the value unlocked by closing your Interplay gaps.' },
            { label: 'Board-ready report', body: 'A presentation-format report with prioritised recommendations and next actions.' },
            { label: 'No obligation', body: 'A genuine conversation. No sales pitch, no pressure — just clarity.' },
          ].map(({ label, body }) => (
            <div key={label} className="px-4 py-4"
              style={{
                borderLeft: '2px solid rgba(250,240,0,0.4)',
                backgroundColor: 'rgba(250,240,0,0.04)',
              }}>
              <p className="text-xs uppercase tracking-widest mb-1"
                style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.65)' }}>
                {label}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <a
            href={CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
            className="font-bold uppercase tracking-widest py-4 px-8 text-sm transition-all"
            style={{ backgroundColor: '#faf000', color: '#2f2a2a', borderRadius: '6px', textDecoration: 'none', display: 'inline-block' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#e8df00'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#faf000'}
          >
            Book a 30-min assessment →
          </a>

          <button
            onClick={() => router.push(completeDest)}
            className="text-sm transition-colors py-4"
            style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
          >
            Continue to my report →
          </button>
        </div>

        {/* Contact */}
        <div className="mt-12 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs uppercase tracking-widest mb-3"
            style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(255,255,255,0.25)' }}>
            Questions? Reach us directly
          </p>
          <div className="space-y-1">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Nina Pickup &nbsp;·&nbsp;
              <a href="mailto:ninapickup@interrupt-sustainability.com"
                style={{ color: 'rgba(250,240,0,0.6)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#faf000'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(250,240,0,0.6)'}>
                ninapickup@interrupt-sustainability.com
              </a>
            </p>
          </div>
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

export default function NextStepsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2f2a2a' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Loading…</p>
      </div>
    }>
      <NextStepsContent />
    </Suspense>
  )
}

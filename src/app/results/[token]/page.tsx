'use client'

import { useEffect, useState, use } from 'react'
import type { SectionScore, RespondentScores } from '@/lib/score'
import { SECTION_META, getScoreBand } from '@/lib/score'
import type { FinancialModel, SectionOpportunity } from '@/lib/financial'
import { formatCurrency, SLUG_TO_SECTION_KEY } from '@/lib/financial'
import type { QuestionResponse, SectionResponses } from '@/app/api/results/[token]/route'
import type { ReportTemplateContent, ReportOverrideContent, HowWeCanHelpBand } from '@/lib/report-defaults'

// ── Editable introduction content ─────────────────────────────────────────────

const INTRO = {
  headline: 'Are you ready to Interplay for growth?',
  welcome: [
    'Welcome back to Interplay. We hope that you find your results useful and that it inspires your organisation to take action – and unlock value from sustainability.',
    'This ground-breaking industry first study is based on the premise that: When sustainability + business + brand interplay > growth accelerates. There is huge value potential in sustainability, but it\'s mostly sitting in a compliance silo – disconnected from the commercials. This report aims to demonstrate the sustainability value potential of your organisation through interplay.',
  ],
  reportSections: [
    {
      title: 'Interplay score',
      desc: 'This will indicate your organisation\'s current growth potential – through interplay. The higher the score, the higher the potential.',
    },
    {
      title: 'Value opportunity',
      desc: 'Based on your current revenue, you will see conservative, moderate and optimistic predictions of the potential value your organisation could unlock through greater interplay.',
    },
    {
      title: 'Recommendations',
      desc: 'Our diagnostic tool will uncover the gaps and opportunity between your sustainability, business and brand – and where their interplay can unlock triple value.',
    },
    {
      title: 'How we can help',
      desc: 'You are not obliged to use our services, but we will outline how we could potentially help your organisation to grow through interplay.',
    },
  ],
  pillarsIntro: 'The interview questions have been structured around 5 pillars, to enable you to see exactly where your strengths and weaknesses lie. Pillar one measures appetite for growth. Pillars 2–5 indicate your current ability to grow through interplay.',
  pillars: [
    {
      num: '1', name: 'Appetite', color: '#f4821f',
      desc: 'Gauges your organisation\'s sentiment around sustainability, as a cost centre or a growth driver. This is important because growth needs to be led from the top.',
    },
    {
      num: '2', name: 'Scale and AI', color: '#4a9ff5',
      desc: 'Measures your current ability to grow with AI as the accelerator. Your capability in leveraging sustainability for growth relies in part on your digital innovation capability.',
    },
    {
      num: '3', name: 'Sustainability', color: '#3ecf6e',
      desc: 'Measures the connectivity between sustainability activity and your business and brand.',
    },
    {
      num: '4', name: 'Brand', color: '#a855f7',
      desc: 'Measures the connectivity between brand (through campaigns, products and services etc) and your sustainability function.',
    },
    {
      num: '5', name: 'Business', color: '#eab308',
      desc: 'Measures how central sustainability is to the business strategy, decisions and capital allocation.',
    },
  ],
  bands: [
    {
      label: 'Early Stage', range: '0–39%',
      desc: 'Sustainability is a low priority and disconnected from the business, leading to poor potential for growth.',
    },
    {
      label: 'Developing', range: '40–59%',
      desc: 'Sustainability is important but has limited connectivity across the organisation, limiting growth.',
    },
    {
      label: 'Maturing', range: '60–79%',
      desc: 'Sustainability strategy is mature and you are starting to integrate it with other business functions. However it needs more encouragement to unlock growth and get you into a leadership position.',
    },
    {
      label: 'Leading', range: '80–100%',
      desc: 'Sustainability is well integrated across the business. There is ongoing potential to unlock greater value – to stay ahead of the competition.',
    },
  ],
}

// ── Steps definition ───────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Welcome' },
  { label: 'In this report' },
  { label: 'The 5 pillars' },
  { label: 'Rating explanation' },
  { label: 'Your results' },
  { label: 'Interplay map' },
  { label: 'Appetite' },
  { label: 'Scale & AI' },
  { label: 'Sustainability' },
  { label: 'Brand' },
  { label: 'Business' },
  { label: 'Evidence base' },
  { label: 'How we can help' },
  { label: "What's next" },
]

// Section slugs in order matching steps 6–10 (0-indexed)
const SECTION_STEP_SLUGS = [
  'appetite',
  'scale-and-delivery',
  'capability-sustainability',
  'capability-brand',
  'capability-business',
]

// ── Progress Bar ───────────────────────────────────────────────────────────────

function ProgressBar({
  current,
  total,
  onStep,
  onPrev,
  onNext,
  token,
}: {
  current: number
  total: number
  onStep: (i: number) => void
  onPrev: () => void
  onNext: () => void
  token: string
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: '#1a1717',
        borderBottom: '1px solid rgba(250,240,0,0.12)',
      }}
    >
      <div className="flex items-center gap-3 px-4" style={{ height: '52px' }}>

        {/* Back button */}
        <button
          onClick={onPrev}
          disabled={current === 0}
          style={{
            fontFamily: 'Almarai, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: current === 0 ? 'rgba(255,255,255,0.2)' : '#faf000',
            background: 'none',
            border: 'none',
            cursor: current === 0 ? 'default' : 'pointer',
            padding: '4px 8px',
            flexShrink: 0,
          }}
        >
          ← Back
        </button>

        {/* Step dots — scrollable on small screens */}
        <div
          className="flex items-center gap-1.5 flex-1 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {STEPS.map((step, i) => {
            const isCurrent = i === current
            const isPast = i < current
            return (
              <button
                key={i}
                onClick={() => onStep(i)}
                title={step.label}
                style={{
                  flexShrink: 0,
                  width: isCurrent ? '28px' : '22px',
                  height: isCurrent ? '28px' : '22px',
                  borderRadius: '50%',
                  border: isCurrent
                    ? '2px solid #faf000'
                    : isPast
                      ? '1.5px solid rgba(250,240,0,0.4)'
                      : '1.5px solid rgba(255,255,255,0.15)',
                  backgroundColor: isCurrent
                    ? '#faf000'
                    : isPast
                      ? 'rgba(250,240,0,0.12)'
                      : 'transparent',
                  color: isCurrent
                    ? '#1a1717'
                    : isPast
                      ? 'rgba(250,240,0,0.7)'
                      : 'rgba(255,255,255,0.3)',
                  fontFamily: 'Almarai, sans-serif',
                  fontSize: isCurrent ? '11px' : '10px',
                  fontWeight: isCurrent ? '700' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {i + 1}
              </button>
            )
          })}
        </div>

        {/* Next button */}
        <button
          onClick={onNext}
          disabled={current === total - 1}
          style={{
            fontFamily: 'Almarai, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: current === total - 1 ? 'rgba(255,255,255,0.2)' : '#faf000',
            background: 'none',
            border: 'none',
            cursor: current === total - 1 ? 'default' : 'pointer',
            padding: '4px 8px',
            flexShrink: 0,
          }}
        >
          Next →
        </button>


      </div>

      {/* Progress line */}
      <div style={{ height: '2px', backgroundColor: 'rgba(250,240,0,0.08)' }}>
        <div
          style={{
            height: '100%',
            backgroundColor: '#faf000',
            width: `${((current + 1) / total) * 100}%`,
            transition: 'width 0.2s ease',
          }}
        />
      </div>
    </div>
  )
}

// ── Dark step wrapper ──────────────────────────────────────────────────────────

function StepWrap({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) {
  return (
    <div style={{ backgroundColor: '#2f2a2a', minHeight: 'calc(100vh - 54px)', color: '#fff' }}
      className="px-6 py-16">
      <div className="max-w-3xl mx-auto">
        {eyebrow && (
          <p className="text-xs font-mono uppercase tracking-[0.25em] mb-6"
            style={{ color: 'rgba(250,240,0,0.6)', fontFamily: 'Open Sans, sans-serif' }}>
            {eyebrow}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}

// ── Step 1: Welcome ────────────────────────────────────────────────────────────

function StepWelcome() {
  return (
    <StepWrap eyebrow="Interplay Method — Diagnostic Report">
      <h1 className="uppercase leading-none mb-10"
        style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(36px, 5vw, 64px)', color: '#faf000', lineHeight: 0.9 }}>
        {INTRO.headline}
      </h1>
      <div className="space-y-5 max-w-2xl">
        {INTRO.welcome.map((p, i) => (
          <p key={i} className="text-base leading-relaxed"
            style={{ color: i === 1 ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.95)', fontFamily: 'Open Sans, sans-serif' }}>
            {i === 1 ? (
              <>
                This ground-breaking industry first study is based on the premise that:{' '}
                <strong style={{ color: '#faf000' }}>
                  When sustainability + business + brand interplay &gt; growth accelerates.
                </strong>{' '}
                There is huge value potential in sustainability, but it&apos;s mostly sitting in a compliance silo – disconnected from the commercials. This report aims to demonstrate the sustainability value potential of your organisation through interplay.
              </>
            ) : p}
          </p>
        ))}
      </div>
    </StepWrap>
  )
}

// ── Step 2: In this report ─────────────────────────────────────────────────────

function StepInReport() {
  return (
    <StepWrap eyebrow="In this report you will find">
      <h2 className="uppercase leading-none mb-10"
        style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)', color: '#faf000', lineHeight: 0.9 }}>
        What&apos;s inside
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {INTRO.reportSections.map(item => (
          <div key={item.title} style={{ borderLeft: '2px solid rgba(250,240,0,0.5)', paddingLeft: '1.25rem' }}>
            <p className="font-bold text-sm uppercase mb-2"
              style={{ color: '#faf000', fontFamily: 'Open Sans, sans-serif', letterSpacing: '0.05em' }}>
              {item.title}
            </p>
            <p className="text-sm leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Open Sans, sans-serif' }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </StepWrap>
  )
}

// ── Step 3: The 5 pillars ──────────────────────────────────────────────────────

function StepPillars() {
  return (
    <StepWrap eyebrow="The 5 pillars of our scorecard">
      <h2 className="uppercase leading-none mb-6"
        style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)', color: '#faf000', lineHeight: 0.9 }}>
        How we measure
      </h2>
      <p className="text-sm leading-relaxed mb-10 max-w-2xl"
        style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Open Sans, sans-serif' }}>
        {INTRO.pillarsIntro}
      </p>
      <div className="space-y-5">
        {INTRO.pillars.map(p => (
          <div key={p.num} className="flex gap-4 items-start"
            style={{ borderLeft: `2px solid ${p.color}`, paddingLeft: '1.25rem' }}>
            <p className="text-sm leading-relaxed" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              <strong style={{ color: p.color, fontSize: '1rem' }}>{p.num}. {p.name} </strong>
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>{p.desc}</span>
            </p>
          </div>
        ))}
      </div>
    </StepWrap>
  )
}

// ── Step 4: Rating explanation ─────────────────────────────────────────────────

function StepRating() {
  return (
    <StepWrap eyebrow="Rating explanation">
      <h2 className="uppercase leading-none mb-10"
        style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)', color: '#faf000', lineHeight: 0.9 }}>
        What the scores mean
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {INTRO.bands.map(b => (
          <div key={b.label}
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', borderRadius: '6px' }}>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-sm font-bold uppercase" style={{ color: '#faf000', fontFamily: 'Open Sans, sans-serif' }}>
                {b.label}
              </span>
              <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{b.range}</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.88)', fontFamily: 'Open Sans, sans-serif' }}>
              {b.desc}
            </p>
          </div>
        ))}
      </div>
    </StepWrap>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface ResultsData {
  respondent: {
    name: string
    role: string
    company: string
    sector: string
    companyType: string
  }
  completedAt: string
  scores: RespondentScores
  benchmark: Record<string, number>
  benchmarkN: number
  financial: FinancialModel | null
  sectionResponses: SectionResponses[]
  contentOverrides?: {
    globalTemplate?: ReportTemplateContent
    respondentOverride?: ReportOverrideContent | null
  }
}

// ── CMS content resolver ───────────────────────────────────────────────────────
// Priority: respondent override > global template saved value > SECTION_META default

function resolveSectionContent(
  slug: string,
  bandIndex: number,
  actionIndex: 0 | 1 | 2,
  contentOverrides: ResultsData['contentOverrides']
): { insight: string; action: string; howWeCanHelp: HowWeCanHelpBand | null } {
  const respSec = contentOverrides?.respondentOverride?.sections?.[slug]
  const globalSec = contentOverrides?.globalTemplate?.sections?.[slug]
  const meta = SECTION_META[slug]
  return {
    insight:
      respSec?.insight ||
      globalSec?.insights?.[bandIndex] ||
      meta?.insights[bandIndex] || '',
    action:
      respSec?.action ||
      globalSec?.actions?.[actionIndex] ||
      meta?.actions[actionIndex] || '',
    howWeCanHelp:
      respSec?.howWeCanHelp ||
      globalSec?.howWeCanHelp?.[actionIndex] ||
      meta?.howWeCanHelp[actionIndex] ||
      null,
  }
}

// ── Shared howWeCanHelp renderer ──────────────────────────────────────────────

function HowWeCanHelpContent({ band, color }: { band: HowWeCanHelpBand; color: string }) {
  const hasContent = band.intro?.trim() || (band.items && band.items.length > 0)
  if (!hasContent) return null
  return (
    <>
      {band.intro?.trim() && (
        <p className="text-sm leading-relaxed mb-4"
          style={{ color: 'rgba(255,255,255,0.92)', fontFamily: 'Open Sans, sans-serif' }}>
          {band.intro}
        </p>
      )}
      {band.items && band.items.length > 0 && (
        <div className="space-y-3">
          {band.items.map((item, i) => (
            <div key={i} style={{ borderLeft: `2px solid ${color}60`, paddingLeft: '0.875rem' }}>
              {item.title && (
                <p className="text-sm font-semibold mb-1"
                  style={{ color: '#fff', fontFamily: 'Open Sans, sans-serif' }}>
                  {item.title}
                </p>
              )}
              {item.content && (
                <p className="text-sm leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Open Sans, sans-serif' }}>
                  {item.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Pentagon vertex order (clockwise from top) ─────────────────────────────────

const PENTAGON_ORDER = [
  'appetite',
  'scale-and-delivery',
  'capability-sustainability',
  'capability-brand',
  'capability-business',
]

// ── Pentagon Radar Chart ───────────────────────────────────────────────────────

function pentagonPoint(cx: number, cy: number, r: number, i: number) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), angle }
}

function pointsToStr(pts: Array<{ x: number; y: number }>) {
  return pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
}

function RadarChart({
  scores,
  benchmark,
  benchmarkN,
}: {
  scores: SectionScore[]
  benchmark: Record<string, number>
  benchmarkN: number
}) {
  const cx = 350, cy = 350, R = 175
  const GRID = [0.25, 0.5, 0.75, 1]

  function scorePolygon(pctMap: Record<string, number>) {
    return PENTAGON_ORDER.map((slug, i) => {
      const pct = pctMap[slug] ?? 0
      return pentagonPoint(cx, cy, R * pct / 100, i)
    })
  }

  const myPctMap = Object.fromEntries(scores.map(s => [s.slug, s.pct]))
  const myPts = scorePolygon(myPctMap)
  const bmPts = benchmarkN > 0 ? scorePolygon(benchmark) : null
  const outerPts = PENTAGON_ORDER.map((_, i) => pentagonPoint(cx, cy, R, i))

  return (
    <svg viewBox="0 0 700 700" className="w-full max-w-[580px] mx-auto" aria-label="Interplay radar chart">
      {/* Dark background fill */}
      <polygon points={pointsToStr(outerPts)} fill="#1e1b1b" stroke="none" />

      {/* Grid rings */}
      {GRID.map(level => (
        <polygon key={level}
          points={pointsToStr(PENTAGON_ORDER.map((_, i) => pentagonPoint(cx, cy, R * level, i)))}
          fill="none" stroke="#ffffff"
          strokeOpacity={level === 1 ? 0.15 : 0.07} strokeWidth="1" />
      ))}

      {/* Axis lines */}
      {outerPts.map((pt, i) => (
        <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y}
          stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />
      ))}

      {/* Grid level labels */}
      {[0.25, 0.5, 0.75].map(level => {
        const pt = pentagonPoint(cx, cy, R * level, 1)
        return (
          <text key={level} x={pt.x + 4} y={pt.y - 3}
            fontSize="13" fill="#ffffff" fillOpacity="0.25" fontFamily="Almarai, sans-serif">
            {Math.round(level * 100)}
          </text>
        )
      })}

      {/* Benchmark polygon */}
      {bmPts && (
        <polygon points={pointsToStr(bmPts)}
          fill="#ffffff" fillOpacity="0.04"
          stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="5 4" />
      )}

      {/* Respondent polygon */}
      <polygon points={pointsToStr(myPts)}
        fill="#faf000" fillOpacity="0.12"
        stroke="#faf000" strokeWidth="2" strokeLinejoin="round" />

      {/* Respondent dots */}
      {myPts.map((pt, i) => {
        const slug = PENTAGON_ORDER[i]
        const color = SECTION_META[slug]?.color ?? '#faf000'
        return <circle key={i} cx={pt.x} cy={pt.y} r="6" fill={color} stroke="#1e1b1b" strokeWidth="2" />
      })}

      {/* Vertex labels */}
      {outerPts.map((outer, i) => {
        const slug = PENTAGON_ORDER[i]
        const meta = SECTION_META[slug]
        const labelR = R + 62
        const pt = pentagonPoint(cx, cy, labelR, i)
        const cosA = Math.cos(outer.angle)
        const anchor = Math.abs(cosA) < 0.15 ? 'middle' : cosA > 0 ? 'start' : 'end'
        const score = myPctMap[slug] ?? 0
        return (
          <g key={slug}>
            <text x={pt.x} y={pt.y - 8} textAnchor={anchor} dominantBaseline="auto"
              fontSize="20" fill={meta?.color ?? '#faf000'} fillOpacity="0.95"
              fontFamily="Almarai, sans-serif" letterSpacing="0.08em">
              {meta?.shortName ?? slug.toUpperCase()}
            </text>
            <text x={pt.x} y={pt.y + 22} textAnchor={anchor} dominantBaseline="auto"
              fontSize="30" fill="#ffffff" fillOpacity="0.92"
              fontFamily="Robson, Open Sans, sans-serif" fontWeight="400">
              {score}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Financial Opportunity Summary ──────────────────────────────────────────────

function FinancialSummary({ model }: { model: FinancialModel }) {
  const { annualRevenue, currencySymbol, totals, totalsAsPercentOfRevenue } = model
  const fmt = (n: number) => formatCurrency(n, currencySymbol)
  const scenarios = [
    { label: 'Conservative', value: totals.conservative, pct: totalsAsPercentOfRevenue.conservative, color: 'rgba(255,255,255,0.78)' },
    { label: 'Moderate',     value: totals.moderate,     pct: totalsAsPercentOfRevenue.moderate,     color: '#f4821f' },
    { label: 'Optimistic',   value: totals.optimistic,   pct: totalsAsPercentOfRevenue.optimistic,   color: '#3ecf6e' },
  ]
  return (
    <div className="mt-8 rounded-xl p-6"
      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-1"
            style={{ color: '#faf000', fontFamily: 'Almarai, sans-serif' }}>
            Financial Opportunity
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'Open Sans, sans-serif' }}>
            Based on {fmt(annualRevenue)} annual revenue
          </p>
        </div>
        <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Across all 5 capability areas
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {scenarios.map(s => (
          <div key={s.label} className="text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: s.color }}>
              {s.label}
            </p>
            <p className="text-2xl font-black tabular-nums" style={{ color: '#fff' }}>
              {fmt(s.value)}
            </p>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {s.pct} of revenue
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs mt-5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Open Sans, sans-serif' }}>
        The moderate scenario assumes focused but realistic improvement across all five Interplay capability areas.
      </p>
    </div>
  )
}

// ── Score Ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ pct, animate }: { pct: number; animate: boolean }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = animate ? (pct / 100) * circ : 0
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx="68" cy="68" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle cx="68" cy="68" r={r} fill="none"
          stroke="#faf000" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ * 0.25}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute text-center">
        <span className="text-3xl font-black tabular-nums" style={{ color: '#fff' }}>{pct}</span>
        <span className="text-sm font-mono block" style={{ color: 'rgba(255,255,255,0.68)' }}>/ 100</span>
      </div>
    </div>
  )
}

// ── Step 5: Your results ───────────────────────────────────────────────────────

function StepResults({
  data,
  animate,
}: {
  data: ResultsData
  animate: boolean
}) {
  const { respondent, completedAt, scores, benchmark, benchmarkN, financial } = data
  const overallBand = getScoreBand(scores.overall)

  function formatDate(iso: string) {
    try {
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso))
    } catch { return '' }
  }

  return (
    <StepWrap eyebrow="Interplay Method — Diagnostic Results">
      <h1 className="uppercase leading-none mb-3"
        style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(32px, 5vw, 60px)', color: '#faf000', lineHeight: 0.9 }}>
        {respondent.company}
      </h1>
      <div className="flex items-center gap-3 flex-wrap mb-10"
        style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'Open Sans, sans-serif', fontSize: '13px' }}>
        {respondent.role && <span>{respondent.role}</span>}
        {respondent.sector && <><span style={{ opacity: 0.4 }}>·</span><span>{respondent.sector}</span></>}
        {completedAt && <><span style={{ opacity: 0.4 }}>·</span><span className="font-mono text-xs">{formatDate(completedAt)}</span></>}
      </div>

      {/* Overall score */}
      <div className="flex items-center gap-8 flex-wrap mb-6">
        <ScoreRing pct={scores.overall} animate={animate} />
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] mb-1"
            style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'Almarai, sans-serif' }}>
            Overall Interplay Score
          </p>
          <p className="text-4xl font-black uppercase tracking-tight" style={{ color: '#faf000', fontFamily: 'Robson, sans-serif' }}>
            {overallBand.label}
          </p>
          {benchmarkN >= 2 && (
            <p className="text-xs font-mono mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Benchmarked against {benchmarkN} other respondent{benchmarkN !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Section scores bar list */}
      <div className="space-y-3 mt-8">
        {scores.sections.map((section, i) => {
          const meta = SECTION_META[section.slug]
          const band = getScoreBand(section.pct)
          return (
            <div key={section.slug}
              className="rounded-lg p-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta?.color }} />
                  <span className="text-xs font-mono uppercase tracking-[0.1em]"
                    style={{ color: 'rgba(255,255,255,0.88)', fontFamily: 'Almarai, sans-serif' }}>
                    {meta?.shortName ?? section.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm"
                    style={{ border: `1px solid ${meta?.color}60`, color: meta?.color }}>
                    {band.label}
                  </span>
                </div>
                <span className="text-xl font-black tabular-nums" style={{ color: '#fff' }}>
                  {section.pct}%
                </span>
              </div>
              <div className="relative h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: animate ? `${section.pct}%` : '0%', backgroundColor: meta?.color, transitionDelay: `${i * 100}ms` }} />
                {benchmarkN >= 2 && benchmark[section.slug] != null && (
                  <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full"
                    style={{ left: `${benchmark[section.slug]}%`, backgroundColor: 'rgba(255,255,255,0.4)' }}
                    title={`Benchmark: ${benchmark[section.slug]}%`} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Financial summary */}
      {financial && <FinancialSummary model={financial} />}
    </StepWrap>
  )
}

// ── Step 6: Interplay map ──────────────────────────────────────────────────────

function StepMap({ data }: { data: ResultsData }) {
  const { scores, benchmark, benchmarkN } = data
  return (
    <StepWrap eyebrow="Your Interplay Map">
      <h2 className="uppercase leading-none mb-6"
        style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)', color: '#faf000', lineHeight: 0.9 }}>
        Where you stand
      </h2>
      <p className="text-sm leading-relaxed mb-3 max-w-2xl"
        style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Open Sans, sans-serif' }}>
        Each of the five axes represents one pillar of the Interplay Method. The further your score extends toward the outer edge, the greater your organisation&apos;s integration and growth potential in that dimension.
      </p>
      <p className="text-sm leading-relaxed mb-8 max-w-2xl"
        style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'Open Sans, sans-serif' }}>
        A compact, centre-weighted shape indicates siloed sustainability. A wide, balanced shape indicates strong interplay — and accelerating growth potential.
      </p>
      {benchmarkN >= 2 && (
        <div className="flex items-center gap-6 text-xs mb-6"
          style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(255,255,255,0.78)' }}>
          <div className="flex items-center gap-2">
            <span className="w-6 h-0.5 inline-block rounded" style={{ backgroundColor: '#3ecf6e' }} />
            You
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 inline-block" style={{ borderTop: '1.5px dashed rgba(255,255,255,0.3)' }} />
            Benchmark
          </div>
        </div>
      )}
      <RadarChart scores={scores.sections} benchmark={benchmark} benchmarkN={benchmarkN} />
    </StepWrap>
  )
}

// ── Scoring Playback components ─────────────────────────────────────────────────

function ScoreContributionBar({ points, maxPoints, color }: { points: number; maxPoints: number; color: string }) {
  const pct = maxPoints > 0 ? (points / maxPoints) * 100 : 0
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="relative flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <div className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-mono tabular-nums shrink-0" style={{ color: 'rgba(255,255,255,0.68)' }}>
        {points} / {maxPoints} pts
      </span>
    </div>
  )
}

function AnswersPanel({ responses, color, sectionRaw, sectionMax, sectionPct }: {
  responses: QuestionResponse[]
  color: string
  sectionRaw: number
  sectionMax: number
  sectionPct: number
}) {
  const [open, setOpen] = useState(false)
  if (responses.length === 0) return null
  const scored = responses.filter(q => q.points !== null)
  const unscored = responses.filter(q => q.points === null)
  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest w-full text-left"
        style={{ color, opacity: open ? 1 : 0.55 }}>
        <span className="inline-block shrink-0" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
        How you scored · {scored.length} scored question{scored.length !== 1 ? 's' : ''}
        {unscored.length > 0 && `, ${unscored.length} open response${unscored.length !== 1 ? 's' : ''}`}
      </button>
      {open && (
        <div className="mt-4 space-y-1">
          {scored.length > 0 && (
            <div className="space-y-3">
              {scored.map((q, i) => (
                <div key={q.id} className="p-3 rounded"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-[10px] font-mono shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Q{i + 1}</span>
                    <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.85)' }}>{q.text}</p>
                  </div>
                  <div className="inline-block text-sm font-medium px-3 py-1.5 rounded mb-1"
                    style={{ backgroundColor: `${color}25`, color: '#fff', borderLeft: `2px solid ${color}` }}>
                    {q.answer}
                  </div>
                  <ScoreContributionBar points={q.points!} maxPoints={q.maxPoints!} color={color} />
                  {q.followUp && (
                    <p className="text-xs italic mt-2 pl-1" style={{ color: 'rgba(255,255,255,0.68)' }}>"{q.followUp}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {sectionMax > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 rounded mt-2"
              style={{ backgroundColor: `${color}15`, border: `1px solid ${color}35` }}>
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color }}>Section total</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  {sectionRaw} / {sectionMax} pts
                </span>
                <span className="text-base font-black tabular-nums" style={{ color }}>{sectionPct}%</span>
              </div>
            </div>
          )}
          {unscored.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Open responses
              </p>
              <div className="space-y-3">
                {unscored.map(q => (
                  <div key={q.id}>
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.78)' }}>{q.text}</p>
                    <p className="text-sm px-3 py-1.5 rounded italic"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.92)', borderLeft: '2px solid rgba(255,255,255,0.15)' }}>
                      {q.answer}
                    </p>
                    {q.followUp && (
                      <p className="text-xs italic mt-1 pl-4" style={{ color: 'rgba(255,255,255,0.6)' }}>"{q.followUp}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Steps 7–11: Individual section ────────────────────────────────────────────

function StepSection({
  slug,
  data,
  animate,
}: {
  slug: string
  data: ResultsData
  animate: boolean
}) {
  const meta = SECTION_META[slug]
  const section = data.scores.sections.find(s => s.slug === slug)
  const band = section ? getScoreBand(section.pct) : null
  const actionIndex = band ? (Math.min(band.index, 2) as 0 | 1 | 2) : 0
  const finKey = SLUG_TO_SECTION_KEY[slug]
  const financialSection = data.financial?.sections[finKey]
  const sectionResp = data.sectionResponses?.find(s => s.slug === slug)
  const bm = data.benchmarkN >= 2 ? data.benchmark[slug] : undefined
  const color = meta?.color ?? '#faf000'
  const cms = band
    ? resolveSectionContent(slug, band.index, actionIndex, data.contentOverrides)
    : null

  if (!section || !band || !cms) {
    return (
      <StepWrap eyebrow={meta?.shortName ?? slug}>
        <p style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'Open Sans, sans-serif' }}>
          No data available for this section.
        </p>
      </StepWrap>
    )
  }

  return (
    <StepWrap eyebrow={`Pillar — ${meta?.shortName ?? slug}`}>
      {/* Section heading */}
      <div className="flex items-end gap-4 mb-8 flex-wrap">
        <h2 className="uppercase leading-none"
          style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(32px, 5vw, 56px)', color, lineHeight: 0.9 }}>
          {meta?.shortName ?? slug}
        </h2>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-4xl font-black tabular-nums" style={{ color: '#fff' }}>{section.pct}%</span>
          <span className="text-xs font-mono px-2 py-1 rounded"
            style={{ border: `1px solid ${color}60`, color }}>
            {band.label}
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-8 rounded-xl p-5"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="relative h-2 rounded-full mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
            style={{ width: animate ? `${section.pct}%` : '0%', backgroundColor: color }} />
          {bm != null && (
            <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
              style={{ left: `${bm}%`, backgroundColor: 'rgba(255,255,255,0.4)' }}
              title={`Benchmark: ${bm}%`} />
          )}
        </div>
        {bm != null && (
          <p className="text-xs font-mono mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Benchmark avg: {bm}%
          </p>
        )}
      </div>

      {/* Insight */}
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: `${color}99` }}>
          Assessment
        </p>
        <p className="text-base leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'Open Sans, sans-serif' }}>
          {cms.insight}
        </p>
      </div>

      {/* Recommended action */}
      {cms.action && (
        <div className="mb-6 p-5 rounded-xl"
          style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color }}>
            Recommended action
          </p>
          <p className="text-sm leading-relaxed font-medium"
            style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Open Sans, sans-serif' }}>
            {cms.action}
          </p>
        </div>
      )}

      {/* How we can help */}
      {cms.howWeCanHelp && (
        <div className="mb-6 p-5 rounded-xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${color}20` }}>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-4" style={{ color }}>
            How we can help
          </p>
          <HowWeCanHelpContent band={cms.howWeCanHelp} color={color} />
        </div>
      )}

      {/* Financial opportunity */}
      {financialSection && financialSection.gap > 0 && (
        <div className="mb-6 p-5 rounded-xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color }}>
            Financial Opportunity
          </p>
          <div className="flex items-baseline gap-2 flex-wrap mb-1">
            <span className="text-xl font-black tabular-nums" style={{ color: '#fff' }}>
              {formatCurrency(financialSection.opportunity.conservative, data.financial?.currencySymbol)}
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>conservative</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
            <span className="text-xl font-black tabular-nums" style={{ color: '#fff' }}>
              {formatCurrency(financialSection.opportunity.optimistic, data.financial?.currencySymbol)}
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>optimistic</span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.68)' }}>
            {financialSection.driver} · {financialSection.evidence}
          </p>
        </div>
      )}

      {/* Answers playback */}
      {sectionResp && sectionResp.questions.length > 0 && (
        <AnswersPanel
          responses={sectionResp.questions}
          color={color}
          sectionRaw={section.raw}
          sectionMax={section.max}
          sectionPct={section.pct}
        />
      )}
    </StepWrap>
  )
}

// ── Step 12: Evidence base ─────────────────────────────────────────────────────

const FALLBACK_EVIDENCE = [
  'Friede, G., Busch, T. & Bassen, A. (2015). "ESG and financial performance: aggregated evidence from more than 2000 empirical studies." Journal of Sustainable Finance & Investment, 5(4), 210–233. — 62.6% of studies show positive ESG–financial performance relationship.',
  'B Lab UK (2025). B Corp Insights Report 2025. — B Corps grow revenue at 20% vs 3% for FTSE-listed peers; 93% 5-year survival rate vs 42% conventional; 18% more investment attracted.',
  'Ellen MacArthur Foundation / McKinsey & Company (2015). Growth Within: A Circular Economy Vision for a Competitive Europe. — Circular economy transition delivers 32% material cost reduction; textiles and consumer goods identified as high-impact sectors.',
  'UN Global Compact (2025). CMO Blueprint for Sustainable Growth. In partnership with Kantar. Key data: Kantar BrandZ — 0.7 correlation between sustainability perceptions and Demand Power (purchase intent); 0.9 correlation between perceived greenwashing and consumers dropping brands; sustainability perceptions = 45% of corporate reputation.',
]

function StepEvidence({ evidence }: { evidence?: string[] }) {
  const refs = evidence?.length ? evidence : FALLBACK_EVIDENCE
  return (
    <StepWrap eyebrow="Evidence base">
      <h2 className="uppercase leading-none mb-8"
        style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)', color: '#faf000', lineHeight: 0.9 }}>
        The research behind the scores
      </h2>
      <div className="space-y-5">
        {refs.map((ref, i) => (
          <div key={i} className="flex gap-4"
            style={{ borderLeft: '2px solid rgba(250,240,0,0.25)', paddingLeft: '1.25rem' }}>
            <p className="text-sm leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.88)', fontFamily: 'Open Sans, sans-serif' }}>
              <span style={{ color: 'rgba(250,240,0,0.5)', fontFamily: 'Almarai, sans-serif', marginRight: '0.5rem' }}>
                [{i + 1}]
              </span>
              {ref}
            </p>
          </div>
        ))}
      </div>
    </StepWrap>
  )
}

// ── Step 13: How we can help (consolidated) ────────────────────────────────────

function StepHowWeCanHelp({ data }: { data: ResultsData }) {
  return (
    <StepWrap eyebrow="How we can help">
      <h2 className="uppercase leading-none mb-4"
        style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(28px, 4vw, 48px)', color: '#faf000', lineHeight: 0.9 }}>
        Your growth roadmap
      </h2>
      <p className="text-sm leading-relaxed mb-10 max-w-2xl"
        style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Open Sans, sans-serif' }}>
        Based on your results, here is how Interrupt × Like So can support your organisation across each of the five Interplay pillars.
      </p>
      <div className="space-y-5">
        {data.scores.sections.map(section => {
          const meta = SECTION_META[section.slug]
          const band = getScoreBand(section.pct)
          const actionIndex = Math.min(band.index, 2) as 0 | 1 | 2
          const color = meta?.color ?? '#faf000'
          const cms = resolveSectionContent(section.slug, band.index, actionIndex, data.contentOverrides)
          if (!cms.howWeCanHelp) return null
          const hasContent = cms.howWeCanHelp.intro?.trim() || (cms.howWeCanHelp.items && cms.howWeCanHelp.items.length > 0)
          if (!hasContent) return null
          return (
            <div key={section.slug} className="rounded-xl p-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${color}25` }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <p className="text-xs font-mono uppercase tracking-widest" style={{ color }}>
                  {meta?.shortName ?? section.slug}
                </p>
                <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {section.pct}% · {band.label}
                </span>
              </div>
              <HowWeCanHelpContent band={cms.howWeCanHelp} color={color} />
            </div>
          )
        })}
      </div>
    </StepWrap>
  )
}

// ── Step 14: What's next ───────────────────────────────────────────────────────

function StepWhatsNext() {
  return (
    <StepWrap eyebrow="What's next">
      <h2 className="uppercase leading-none mb-8"
        style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(32px, 5vw, 60px)', color: '#faf000', lineHeight: 0.9 }}>
        Ready to improve<br />your Interplay?
      </h2>
      <p className="text-base leading-relaxed mb-6 max-w-xl"
        style={{ color: 'rgba(255,255,255,0.92)', fontFamily: 'Open Sans, sans-serif' }}>
        Interrupt × Like So work with organisations to close the gap between sustainability, brand and business strategy — unlocking triple value.
      </p>
      <div className="mt-10 p-6 rounded-xl"
        style={{ backgroundColor: 'rgba(250,240,0,0.05)', border: '1px solid rgba(250,240,0,0.15)' }}>
        <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: 'rgba(250,240,0,0.5)' }}>
          Get in touch
        </p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Open Sans, sans-serif' }}>
          interruptconsultancy.com · likeso.com
        </p>
      </div>
      <p className="mt-12 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
        Interrupt × Like So — The Interplay Method®
      </p>
    </StepWrap>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ResultsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [status, setStatus] = useState<'loading' | 'not-found' | 'error' | 'ready'>('loading')
  const [data, setData] = useState<ResultsData | null>(null)
  const [animate, setAnimate] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    fetch(`/api/results/${token}`)
      .then(async res => {
        if (res.status === 404) { setStatus('not-found'); return }
        if (!res.ok) { setStatus('error'); return }
        const d = await res.json()
        setData(d)
        setStatus('ready')
        setTimeout(() => setAnimate(true), 150)
      })
      .catch(() => setStatus('error'))
  }, [token])

  function goTo(i: number) {
    setStep(Math.max(0, Math.min(STEPS.length - 1, i)))
    window.scrollTo({ top: 0 })
  }

  const pageStyle = { backgroundColor: '#2f2a2a', color: '#fff', minHeight: '100vh' }

  if (status === 'loading') {
    return (
      <div style={pageStyle} className="flex items-center justify-center">
        <span className="text-sm font-mono animate-pulse" style={{ color: 'rgba(250,240,0,0.6)', fontFamily: 'Almarai, sans-serif' }}>
          Loading your results…
        </span>
      </div>
    )
  }

  if (status === 'not-found') {
    return (
      <div style={pageStyle} className="flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-xs font-mono uppercase tracking-[0.2em] mb-4"
            style={{ color: 'rgba(250,240,0,0.5)', fontFamily: 'Almarai, sans-serif' }}>
            Interplay Method
          </p>
          <h1 className="text-2xl font-black mb-3 uppercase"
            style={{ color: '#faf000', fontFamily: 'Robson, sans-serif' }}>
            Link not valid
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Open Sans, sans-serif' }}>
            This results link has expired or been revoked. Contact Interrupt × Like So for a new link.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error' || !data) {
    return (
      <div style={pageStyle} className="flex items-center justify-center px-6">
        <p className="text-sm" style={{ color: '#f4821f' }}>Something went wrong loading your results. Please try again.</p>
      </div>
    )
  }

  // Render active step content
  function renderStep() {
    if (!data) return null
    switch (step) {
      case 0: return <StepWelcome />
      case 1: return <StepInReport />
      case 2: return <StepPillars />
      case 3: return <StepRating />
      case 4: return <StepResults data={data} animate={animate} />
      case 5: return <StepMap data={data} />
      case 6:
      case 7:
      case 8:
      case 9:
      case 10: return <StepSection slug={SECTION_STEP_SLUGS[step - 6]} data={data} animate={animate} />
      case 11: return <StepEvidence evidence={data.contentOverrides?.globalTemplate?.evidence} />
      case 12: return <StepHowWeCanHelp data={data} />
      case 13: return <StepWhatsNext />
      default: return null
    }
  }

  return (
    <div style={pageStyle}>
      <ProgressBar
        current={step}
        total={STEPS.length}
        onStep={goTo}
        onPrev={() => goTo(step - 1)}
        onNext={() => goTo(step + 1)}
        token={token}
      />
      {/* Spacer for fixed bar (52px bar + 2px progress line) */}
      <div style={{ paddingTop: '54px' }}>
        {renderStep()}
      </div>
    </div>
  )
}

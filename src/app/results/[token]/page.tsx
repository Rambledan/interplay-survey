'use client'

import { useEffect, useState, use } from 'react'
import type { SectionScore, RespondentScores } from '@/lib/score'
import { SECTION_META, getScoreBand } from '@/lib/score'
import type { FinancialModel, SectionOpportunity } from '@/lib/financial'
import { formatCurrency, SLUG_TO_SECTION_KEY } from '@/lib/financial'
import type { QuestionResponse, SectionResponses } from '@/app/api/results/[token]/route'

// ── Types ──────────────────────────────────────────────────────────────────

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
}

// ── Pentagon vertex order (clockwise from top) ─────────────────────────────

const PENTAGON_ORDER = [
  'appetite',
  'scale-and-delivery',
  'capability-sustainability',
  'capability-brand',
  'capability-business',
]

// ── Pentagon Radar Chart ───────────────────────────────────────────────────

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
  const cx = 260
  const cy = 260
  const R = 175
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
    <svg viewBox="0 0 520 520" className="w-full max-w-[520px] mx-auto" aria-label="Interplay radar chart">
      {/* Grid fill */}
      <polygon
        points={pointsToStr(outerPts)}
        fill="#ffffff"
        stroke="none"
      />

      {/* Grid rings */}
      {GRID.map(level => (
        <polygon
          key={level}
          points={pointsToStr(PENTAGON_ORDER.map((_, i) => pentagonPoint(cx, cy, R * level, i)))}
          fill="none"
          stroke="#2f2a2a"
          strokeOpacity={level === 1 ? 0.12 : 0.06}
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {outerPts.map((pt, i) => (
        <line
          key={i}
          x1={cx} y1={cy}
          x2={pt.x} y2={pt.y}
          stroke="#2f2a2a" strokeOpacity="0.07" strokeWidth="1"
        />
      ))}

      {/* Grid level labels */}
      {[0.25, 0.5, 0.75].map(level => {
        const pt = pentagonPoint(cx, cy, R * level, 1)
        return (
          <text key={level}
            x={pt.x + 4} y={pt.y - 3}
            fontSize="9" fill="#2f2a2a" fillOpacity="0.3"
            fontFamily="Almarai, sans-serif"
          >
            {Math.round(level * 100)}
          </text>
        )
      })}

      {/* Benchmark polygon */}
      {bmPts && (
        <polygon
          points={pointsToStr(bmPts)}
          fill="#2f2a2a" fillOpacity="0.04"
          stroke="#2f2a2a" strokeOpacity="0.25"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
      )}

      {/* Respondent polygon */}
      <polygon
        points={pointsToStr(myPts)}
        fill="#3ecf6e" fillOpacity="0.18"
        stroke="#3ecf6e" strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Respondent dots */}
      {myPts.map((pt, i) => {
        const slug = PENTAGON_ORDER[i]
        const color = SECTION_META[slug]?.color ?? '#2f2a2a'
        return (
          <circle key={i} cx={pt.x} cy={pt.y} r="6"
            fill={color} stroke="white" strokeWidth="2"
          />
        )
      })}

      {/* Vertex labels */}
      {outerPts.map((outer, i) => {
        const slug = PENTAGON_ORDER[i]
        const meta = SECTION_META[slug]
        const labelR = R + 32
        const pt = pentagonPoint(cx, cy, labelR, i)
        const cosA = Math.cos(outer.angle)
        const anchor = Math.abs(cosA) < 0.15 ? 'middle' : cosA > 0 ? 'start' : 'end'
        const score = myPctMap[slug] ?? 0

        return (
          <g key={slug}>
            <text
              x={pt.x} y={pt.y - 6}
              textAnchor={anchor}
              dominantBaseline="auto"
              fontSize="10"
              fill={meta?.color ?? '#2f2a2a'}
              fillOpacity="0.9"
              fontFamily="Almarai, sans-serif"
              letterSpacing="0.1em"
            >
              {meta?.shortName ?? slug.toUpperCase()}
            </text>
            <text
              x={pt.x} y={pt.y + 10}
              textAnchor={anchor}
              dominantBaseline="auto"
              fontSize="15"
              fill="#2f2a2a"
              fillOpacity="0.9"
              fontFamily="Robson, Open Sans, sans-serif"
              fontWeight="400"
            >
              {score}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Download PDF Button ────────────────────────────────────────────────────

function DownloadPdfButton({ token }: { token: string }) {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')

  function handleClick() {
    setStatus('loading')
    window.open(`/api/results/${token}/pdf`, '_blank')
    setTimeout(() => setStatus('idle'), 5000)
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest rounded transition-opacity"
        style={{
          fontFamily: 'Almarai, sans-serif',
          backgroundColor: status === 'loading' ? 'rgba(13,20,16,0.03)' : 'rgba(13,20,16,0.06)',
          border: '1px solid rgba(13,20,16,0.15)',
          color: 'rgba(13,20,16,0.5)',
          cursor: status === 'loading' ? 'wait' : 'pointer',
        }}
      >
        {status === 'loading' ? '⋯ Generating PDF…' : '↓ Download PDF Report'}
      </button>
    </div>
  )
}

// ── Financial Opportunity Summary ─────────────────────────────────────────

function FinancialSummary({ model }: { model: FinancialModel }) {
  const { annualRevenue, currencySymbol, totals, totalsAsPercentOfRevenue } = model
  const fmt = (n: number) => formatCurrency(n, currencySymbol)
  const scenarios = [
    { label: 'Conservative', value: totals.conservative, pct: totalsAsPercentOfRevenue.conservative, dimColor: 'rgba(13,20,16,0.35)' },
    { label: 'Moderate',     value: totals.moderate,     pct: totalsAsPercentOfRevenue.moderate,     dimColor: '#f4821f' },
    { label: 'Optimistic',   value: totals.optimistic,   pct: totalsAsPercentOfRevenue.optimistic,   dimColor: '#3ecf6e' },
  ]

  return (
    <div className="mt-8 p-6 rounded-xl" style={{ backgroundColor: '#f0f7f2', border: '1px solid rgba(62,207,110,0.2)' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-0.5" style={{ color: '#3ecf6e' }}>
            Financial Opportunity
          </p>
          <p className="text-xs" style={{ color: 'rgba(13,20,16,0.45)' }}>
            Based on {fmt(annualRevenue)} annual revenue
          </p>
        </div>
        <p className="text-[10px] font-mono" style={{ color: 'rgba(13,20,16,0.3)' }}>
          Across all 5 capability areas
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {scenarios.map(s => (
          <div key={s.label} className="text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: s.dimColor }}>
              {s.label}
            </p>
            <p className="text-2xl font-black tabular-nums" style={{ color: '#0d1410' }}>
              {fmt(s.value)}
            </p>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(13,20,16,0.35)' }}>
              {s.pct} of revenue
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs mt-4 leading-relaxed" style={{ color: 'rgba(13,20,16,0.4)' }}>
        The moderate scenario assumes focused but realistic improvement across all five Interplay capability areas. Evidence: Friede et al. (2015), B Lab UK (2025), Ellen MacArthur / McKinsey (2015), UN Global Compact CMO Blueprint (2025).
      </p>
    </div>
  )
}

// ── Scoring Playback Panel ──────────────────────────────────────────────────

function ScoreContributionBar({
  points,
  maxPoints,
  color,
}: {
  points: number
  maxPoints: number
  color: string
}) {
  const pct = maxPoints > 0 ? (points / maxPoints) * 100 : 0
  return (
    <div className="flex items-center gap-2 mt-1.5">
      {/* Bar */}
      <div className="relative flex-1 h-1.5 rounded-full" style={{ backgroundColor: `${color}20` }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {/* Fraction */}
      <span className="text-[10px] font-mono tabular-nums shrink-0" style={{ color: 'rgba(13,20,16,0.4)' }}>
        {points} / {maxPoints} pts
      </span>
    </div>
  )
}

function AnswersPanel({
  responses,
  color,
  sectionRaw,
  sectionMax,
  sectionPct,
}: {
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
    <div className="mt-3 pt-3 border-t" style={{ borderColor: `${color}15` }}>
      {/* Toggle */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest w-full text-left"
        style={{ color, opacity: open ? 1 : 0.65 }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = open ? '1' : '0.65' }}
      >
        <span
          className="inline-block transition-transform duration-200 shrink-0"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </span>
        How you scored · {scored.length} scored question{scored.length !== 1 ? 's' : ''}
        {unscored.length > 0 && `, ${unscored.length} open response${unscored.length !== 1 ? 's' : ''}`}
      </button>

      {open && (
        <div className="mt-4 space-y-1">

          {/* Scored questions */}
          {scored.length > 0 && (
            <div className="space-y-3">
              {scored.map((q, i) => (
                <div
                  key={q.id}
                  className="p-3 rounded"
                  style={{ backgroundColor: 'rgba(13,20,16,0.02)', border: '1px solid rgba(13,20,16,0.06)' }}
                >
                  {/* Question number + text */}
                  <div className="flex items-start gap-2 mb-2">
                    <span
                      className="text-[10px] font-mono shrink-0 mt-0.5 tabular-nums"
                      style={{ color: 'rgba(13,20,16,0.3)' }}
                    >
                      Q{i + 1}
                    </span>
                    <p className="text-xs leading-snug" style={{ color: 'rgba(13,20,16,0.5)' }}>
                      {q.text}
                    </p>
                  </div>

                  {/* Answer chip */}
                  <div
                    className="inline-block text-sm font-medium px-3 py-1.5 rounded mb-1"
                    style={{
                      backgroundColor: `${color}12`,
                      color: '#0d1410',
                      borderLeft: `2px solid ${color}`,
                    }}
                  >
                    {q.answer}
                  </div>

                  {/* Score bar */}
                  <ScoreContributionBar
                    points={q.points!}
                    maxPoints={q.maxPoints!}
                    color={color}
                  />

                  {/* Follow-up */}
                  {q.followUp && (
                    <p className="text-xs italic mt-2 pl-1" style={{ color: 'rgba(13,20,16,0.38)' }}>
                      "{q.followUp}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Section score total */}
          {sectionMax > 0 && (
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded mt-2"
              style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color }}>
                  Section total
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tabular-nums" style={{ color: 'rgba(13,20,16,0.45)' }}>
                  {sectionRaw} / {sectionMax} pts
                </span>
                <span className="text-base font-black tabular-nums" style={{ color }}>
                  {sectionPct}%
                </span>
              </div>
            </div>
          )}

          {/* Open-answer / context questions */}
          {unscored.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(13,20,16,0.06)' }}>
              <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgba(13,20,16,0.3)' }}>
                Open responses
              </p>
              <div className="space-y-3">
                {unscored.map(q => (
                  <div key={q.id}>
                    <p className="text-xs mb-1" style={{ color: 'rgba(13,20,16,0.45)' }}>
                      {q.text}
                    </p>
                    <p
                      className="text-sm px-3 py-1.5 rounded italic"
                      style={{ backgroundColor: 'rgba(13,20,16,0.03)', color: 'rgba(13,20,16,0.6)', borderLeft: '2px solid rgba(13,20,16,0.12)' }}
                    >
                      {q.answer}
                    </p>
                    {q.followUp && (
                      <p className="text-xs italic mt-1 pl-4" style={{ color: 'rgba(13,20,16,0.35)' }}>
                        "{q.followUp}"
                      </p>
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

// ── Animated Score Bar ─────────────────────────────────────────────────────

function ScoreBar({
  section,
  benchmark,
  animate,
  delay,
  financialSection,
  responses,
  currencySymbol,
}: {
  section: SectionScore
  benchmark: number | undefined
  animate: boolean
  delay: number
  financialSection?: SectionOpportunity
  responses?: QuestionResponse[]
  currencySymbol?: string
}) {
  const meta = SECTION_META[section.slug]
  const band = getScoreBand(section.pct)
  // Map 4 insight bands to 3 action/howWeCanHelp bands: 0→0, 1→1, 2→2, 3→2
  const actionIndex = Math.min(band.index, 2) as 0 | 1 | 2

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: meta?.color }}
          />
          <span className="text-xs font-mono uppercase tracking-[0.12em]" style={{ color: '#0d1410', opacity: 0.5 }}>
            {meta?.shortName ?? section.name}
          </span>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 border rounded-sm"
            style={{ borderColor: `${meta?.color}50`, color: meta?.color }}
          >
            {band.label}
          </span>
        </div>
        <span className="text-2xl font-black tabular-nums" style={{ color: '#0d1410' }}>
          {section.pct}%
        </span>
      </div>

      {/* Track */}
      <div className="relative h-2 rounded-full overflow-visible" style={{ backgroundColor: 'rgba(13,20,16,0.07)' }}>
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: animate ? `${section.pct}%` : '0%',
            backgroundColor: meta?.color,
            transitionDelay: `${delay}ms`,
          }}
        />
        {/* Benchmark marker */}
        {benchmark != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full transition-all duration-1000 ease-out"
            style={{
              left: animate ? `${benchmark}%` : '0%',
              backgroundColor: 'rgba(13,20,16,0.3)',
              transitionDelay: `${delay + 100}ms`,
            }}
            title={`Benchmark: ${benchmark}%`}
          />
        )}
      </div>

      {/* Benchmark label */}
      {benchmark != null && (
        <p className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>
          Benchmark avg: {benchmark}%
        </p>
      )}

      {/* Insight */}
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(13,20,16,0.6)' }}>
        {meta?.insights[band.index]}
      </p>

      {/* Action recommendation */}
      {meta?.actions[actionIndex] && (
        <div className="pt-2 mt-2 border-t" style={{ borderColor: `${meta.color}20` }}>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: meta.color }}>
            Recommended action
          </p>
          <p className="text-sm leading-relaxed font-medium" style={{ color: 'rgba(13,20,16,0.75)' }}>
            {meta.actions[actionIndex]}
          </p>
        </div>
      )}

      {/* How we can help */}
      {meta?.howWeCanHelp[actionIndex] && (
        <div className="pt-2 mt-2 border-t" style={{ borderColor: `${meta.color}20` }}>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: meta.color }}>
            How we can help
          </p>
          <div className="space-y-2">
            {meta.howWeCanHelp[actionIndex].split('\n\n').map((para, i) => (
              <p key={i} className="text-sm leading-relaxed" style={{ color: 'rgba(13,20,16,0.6)' }}>
                {para}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Financial opportunity */}
      {financialSection && financialSection.gap > 0 && (
        <div className="mt-3 pt-3 border-t rounded-lg p-3 -mx-1"
          style={{ borderColor: `${meta?.color}15`, backgroundColor: `${meta?.color}06` }}
        >
          <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: meta?.color }}>
            Financial Opportunity
          </p>
          <div className="flex items-baseline gap-2 flex-wrap mb-1">
            <span className="text-base font-black tabular-nums" style={{ color: '#0d1410' }}>
              {formatCurrency(financialSection.opportunity.conservative, currencySymbol)}
            </span>
            <span className="text-xs" style={{ color: 'rgba(13,20,16,0.3)' }}>conservative</span>
            <span style={{ color: 'rgba(13,20,16,0.2)' }}>—</span>
            <span className="text-base font-black tabular-nums" style={{ color: '#0d1410' }}>
              {formatCurrency(financialSection.opportunity.optimistic, currencySymbol)}
            </span>
            <span className="text-xs" style={{ color: 'rgba(13,20,16,0.3)' }}>optimistic</span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(13,20,16,0.4)' }}>
            {financialSection.driver} · {financialSection.evidence}
          </p>
        </div>
      )}

      {/* Scoring playback */}
      {responses && responses.length > 0 && (
        <AnswersPanel
          responses={responses}
          color={meta?.color ?? '#3ecf6e'}
          sectionRaw={section.raw}
          sectionMax={section.max}
          sectionPct={section.pct}
        />
      )}
    </div>
  )
}

// ── Overall score ring ─────────────────────────────────────────────────────

function ScoreRing({ pct, animate }: { pct: number; animate: boolean }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = animate ? (pct / 100) * circ : 0

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx="68" cy="68" r={r} fill="none" stroke="#0d1410" strokeOpacity="0.08" strokeWidth="6" />
        <circle
          cx="68" cy="68" r={r}
          fill="none"
          stroke="#3ecf6e"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ * 0.25}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-3xl font-black tabular-nums" style={{ color: '#0d1410' }}>{pct}</span>
        <span className="text-sm font-mono block" style={{ color: 'rgba(13,20,16,0.35)' }}>/ 100</span>
      </div>
    </div>
  )
}

// ── Utility ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      .format(new Date(iso))
  } catch { return '' }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ResultsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [status, setStatus] = useState<'loading' | 'not-found' | 'error' | 'ready'>('loading')
  const [data, setData] = useState<ResultsData | null>(null)
  const [animate, setAnimate] = useState(false)

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

  const pageStyle = { backgroundColor: '#f6f8f6', color: '#0d1410', minHeight: '100vh' }
  const cardStyle = { backgroundColor: '#ffffff', borderBottom: '1px solid rgba(13,20,16,0.08)' }

  if (status === 'loading') {
    return (
      <div style={pageStyle} className="flex items-center justify-center">
        <span className="text-sm font-mono animate-pulse" style={{ color: '#6b8c74' }}>Loading your results…</span>
      </div>
    )
  }

  if (status === 'not-found') {
    return (
      <div style={pageStyle} className="flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-xs font-mono uppercase tracking-[0.2em] mb-4" style={{ color: '#6b8c74' }}>Interplay Method</p>
          <h1 className="text-2xl font-black mb-3" style={{ color: '#0d1410' }}>Link not valid</h1>
          <p className="text-sm" style={{ color: 'rgba(13,20,16,0.5)' }}>This results link has expired or been revoked. Contact Interrupt × Like So for a new link.</p>
        </div>
      </div>
    )
  }

  if (status === 'error' || !data) {
    return (
      <div style={pageStyle} className="flex items-center justify-center px-6">
        <p className="text-sm text-red-500">Something went wrong loading your results. Please try again.</p>
      </div>
    )
  }

  const { respondent, completedAt, scores, benchmark, benchmarkN, financial, sectionResponses } = data
  const overallBand = getScoreBand(scores.overall)
  const overallColor = scores.overall >= 60 ? '#3ecf6e' : scores.overall >= 40 ? '#f4821f' : '#4a9ff5'

  return (
    <div style={pageStyle} className="flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid rgba(13,20,16,0.08)' }}
        className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/Logo+small.png.webp" alt="Interrupt" style={{ height: '36px', width: 'auto' }} />
          <span style={{ color: 'rgba(13,20,16,0.2)' }}>×</span>
          <img src="/LS.png" alt="Like So" style={{ height: '31px', width: 'auto' }} />
        </div>
        <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: '#0d1410' }}>
          Interplay Results
        </span>
      </header>

      <main className="flex-1">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section style={cardStyle} className="px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-mono uppercase tracking-[0.3em] mb-4" style={{ color: '#0d1410' }}>
              Interplay Method — Diagnostic Results
            </p>

            <h1 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tight mb-2" style={{ color: '#0d1410' }}>
              {respondent.company}
            </h1>

            <div className="flex items-center gap-3 flex-wrap mb-8">
              {respondent.name && (
                <span className="text-sm" style={{ color: 'rgba(13,20,16,0.55)' }}>{respondent.role}</span>
              )}
              {respondent.role && respondent.company && (
                <span style={{ color: 'rgba(13,20,16,0.2)' }}>·</span>
              )}
            
              {respondent.sector && (
                <>
                  
                  <span className="text-sm" style={{ color: 'rgba(13,20,16,0.35)' }}>{respondent.sector}</span>
                </>
              )}
              {completedAt && (
                <>
                  <span style={{ color: 'rgba(13,20,16,0.2)' }}>·</span>
                  <span className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>{formatDate(completedAt)}</span>
                </>
              )}
            </div>

            {/* Overall score */}
            <div className="flex items-center gap-8 flex-wrap">
              <ScoreRing pct={scores.overall} animate={animate} />
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(13,20,16,0.4)' }}>
                  Overall Interplay Score
                </p>
                <p className="text-4xl font-black uppercase tracking-tight" style={{ color: overallColor }}>
                  {overallBand.label}
                </p>
                {benchmarkN >= 2 && (
                  <p className="text-xs font-mono mt-2" style={{ color: 'rgba(13,20,16,0.35)' }}>
                    Benchmarked against {benchmarkN} other respondent{benchmarkN !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Financial summary */}
            {financial && <FinancialSummary model={financial} />}

            {/* Download PDF */}
            <DownloadPdfButton token={token} />
          </div>
        </section>

        {/* ── Radar Chart ──────────────────────────────────────────────────── */}
        <section style={cardStyle} className="px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] mb-1" style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(47,42,42,0.4)' }}>
                  Your Interplay Map
                </p>
                <p className="text-sm max-w-md" style={{ color: 'rgba(47,42,42,0.6)' }}>
                  Each axis represents one dimension of the Interplay. The further your score reaches toward the edge, the more integrated and mature that dimension.
                </p>
              </div>
              <div className="flex items-center gap-6 text-xs" style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(47,42,42,0.4)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-0.5 inline-block rounded" style={{ backgroundColor: '#3ecf6e' }} />
                  You
                </div>
                {benchmarkN >= 2 && (
                  <div className="flex items-center gap-2">
                    <span className="w-6 inline-block" style={{ borderTop: '1.5px dashed rgba(47,42,42,0.3)' }} />
                    Benchmark
                  </div>
                )}
              </div>
            </div>

            <RadarChart
              scores={scores.sections}
              benchmark={benchmark}
              benchmarkN={benchmarkN}
            />
          </div>
        </section>

        {/* ── Section Breakdown ────────────────────────────────────────────── */}
        <section className="px-6 py-12" style={{ backgroundColor: '#f6f8f6' }}>
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(13,20,16,0.4)' }}>
              Section Breakdown
            </p>
            <p className="text-sm mb-10 max-w-lg" style={{ color: 'rgba(13,20,16,0.6)' }}>
              Your score in each dimension, how it compares to others, and what it means for your Interplay.
            </p>

            <div className="space-y-8">
              {scores.sections.map((section, i) => {
                const finKey = SLUG_TO_SECTION_KEY[section.slug]
                const financialSection = financial?.sections[finKey]
                const sectionResp = sectionResponses?.find(s => s.slug === section.slug)
                return (
                  <div key={section.slug}
                    className="p-6 rounded-lg"
                    style={{ backgroundColor: '#fff', border: '1px solid rgba(13,20,16,0.07)' }}
                  >
                    <ScoreBar
                      section={section}
                      benchmark={benchmarkN >= 2 ? benchmark[section.slug] : undefined}
                      animate={animate}
                      delay={i * 100}
                      financialSection={financialSection}
                      responses={sectionResp?.questions}
                      currencySymbol={financial?.currencySymbol}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Triple Value ─────────────────────────────────────────────────── */}
        <section className="px-6 py-12" style={{ backgroundColor: '#fff', borderTop: '1px solid rgba(13,20,16,0.08)' }}>
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-mono uppercase tracking-[0.2em] mb-8" style={{ color: 'rgba(13,20,16,0.4)' }}>
              The Triple Value Opportunity
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  label: 'Sustainability Value',
                  color: '#3ecf6e',
                  desc: 'Impact on society and planet through embedded strategy and activated teams.',
                  slug: 'capability-sustainability',
                },
                {
                  label: 'Brand Value',
                  color: '#a855f7',
                  desc: 'Desirability and differentiation through authentic sustainability integration.',
                  slug: 'capability-brand',
                },
                {
                  label: 'Business Value',
                  color: '#eab308',
                  desc: 'Margins and growth through financially-embedded sustainability strategy.',
                  slug: 'capability-business',
                },
              ].map(({ label, color, desc, slug }) => {
                const s = scores.sections.find(ss => ss.slug === slug)
                return (
                  <div key={slug}
                    className="p-5 rounded-lg"
                    style={{ backgroundColor: `${color}08`, border: `1px solid ${color}30` }}
                  >
                    <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color }}>
                      {label}
                    </p>
                    {s && (
                      <p className="text-3xl font-black mb-3 tabular-nums" style={{ color: '#0d1410' }}>
                        {s.pct}%
                      </p>
                    )}
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(13,20,16,0.5)' }}>{desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Evidence references ──────────────────────────────────────────── */}
        {financial && (
          <section className="px-6 py-10" style={{ backgroundColor: '#fff', borderTop: '1px solid rgba(13,20,16,0.08)' }}>
            <div className="max-w-3xl mx-auto">
              <p className="text-[10px] font-mono uppercase tracking-widest mb-4" style={{ color: 'rgba(13,20,16,0.35)' }}>
                Evidence Base
              </p>
              <ol className="space-y-2 list-decimal list-inside">
                {[
                  'Friede, G., Busch, T. & Bassen, A. (2015). "ESG and financial performance: aggregated evidence from more than 2000 empirical studies." Journal of Sustainable Finance & Investment, 5(4), 210–233. — 62.6% of studies show positive ESG–financial performance relationship.',
                  'B Lab UK (2025). B Corp Insights Report 2025. — B Corps grow revenue at 20% vs 3% for FTSE-listed peers; 93% 5-year survival rate vs 42% conventional; 18% more investment attracted.',
                  'Ellen MacArthur Foundation / McKinsey & Company (2015). Growth Within: A Circular Economy Vision for a Competitive Europe. — Circular economy transition delivers 32% material cost reduction; textiles and consumer goods identified as high-impact sectors.',
                  'UN Global Compact (2025). CMO Blueprint for Sustainable Growth. In partnership with Kantar. Key data: Kantar BrandZ — 0.7 correlation between sustainability perceptions and Demand Power (purchase intent); 0.9 correlation between perceived greenwashing and consumers dropping brands; sustainability perceptions = 45% of corporate reputation; sustainability\'s contribution to top 100 global brand value projected to grow from $0.2T to $2.7T by 2040. PwC — products with sustainability attributes achieve 6–25%+ revenue premium. BCG — companies incorporating sustainability are 1.4× more likely to achieve innovative breakthroughs. Baker McKenzie — 73% of business leaders willing to collaborate with competitors on net-zero. Case studies: Intrepid Travel (>$600M revenue, eNPS 64, 80% purpose-led retention); Zespri (doubled revenue to NZ$5B, #1 fruit brand across 15 markets); Natura (100% sales outperformance on circular product launch); Nedbank (+11pp Brand Preference, +10pp Brand Loyalty from purpose-led rebrand); Żubr/Asahi (price premium vs. discounting competitors).',
                ].map((ref, i) => (
                  <li key={i} className="text-xs leading-relaxed" style={{ color: 'rgba(13,20,16,0.4)' }}>
                    {ref}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="px-6 py-16" style={{ backgroundColor: '#f6f8f6', borderTop: '1px solid rgba(13,20,16,0.08)' }}>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-mono uppercase tracking-[0.3em] mb-4" style={{ color: '#0d1410' }}>
              What's next?
            </p>
            <h2 className="text-3xl font-black uppercase mb-4" style={{ color: '#0d1410' }}>
              Ready to improve<br />
              <span style={{ color: '#0d1410' }}>your Interplay?</span>
            </h2>
            <p className="text-base max-w-md mx-auto mb-8" style={{ color: 'rgba(13,20,16,0.55)' }}>
              Interrupt × Like So work with organisations to close the gap between sustainability, brand and business strategy — unlocking triple value.
            </p>
            <p className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.3)' }}>
              interruptconsultancy.com · likeso.com
            </p>
          </div>
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-6 py-5 text-center" style={{ backgroundColor: '#fff', borderTop: '1px solid rgba(13,20,16,0.08)' }}>
        <p className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>
          Interrupt × Like So — The Interplay Method®
        </p>
      </footer>

    </div>
  )
}

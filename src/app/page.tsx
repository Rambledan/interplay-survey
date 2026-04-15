import Link from 'next/link'

// ── Editable content — change text here ──────────────────────────────────────

const CONTENT = {
  hero: {
    headline: 'Are you prepared for sustainable growth?',
    subheadline: 'GET YOUR PERSONALISED INTERPLAY REPORT',
    cta: 'RUN YOUR ASSESSMENT',
    ctaNote: 'Takes 30 seconds',
  },
  howReady: {
    heading: 'HOW READY IS YOUR ORGANISATION TO TURN SUSTAINABILITY FROM COST TO GROWTH?',
    blocks: [
      {
        title: 'Sign up to an Interplay interview',
        body: "We'll assess how connected sustainability is to the rest of your organisation – and reveal your growth potential score – it takes 30 minutes.",
      },
      {
        title: 'Receive a bespoke Interplay Report',
        body: 'Join the growing number of brands taking part in this ground-breaking industry-first study and receive your bespoke report – along with tailored insights and recommendations.',
      },
    ],
  },
  whenInterplay: {
    heading: 'WHEN SUSTAINABILITY + BUSINESS + BRAND INTERPLAY, Growth accelerates',
    left: [
      {
        title: 'Our diagnostic tool',
        body: 'Will reveal the gaps and opportunity between your sustainability, business and brand – and where their interplay can unlock triple value.',
      },
      {
        title: 'The value opportunity',
        body: "There is a huge value in sustainability but it's mostly stuck in a compliance silo – disconnected from the commercials. Losing you pricing power, peer differentiation – and financial backing.",
      },
    ],
    bigStat: '$2.7tn',
    bigStatNote: "Sustainability's contribution to the brand value of the global Top 100 at $0.2TN today, and $2.7TN by 2040",
    stats: [
      {
        qualifier: 'Value add',
        value: '1.4X',
        note: 'Companies incorporating sustainability are 1.4× more likely to experience innovative breakthroughs (Boston Consulting Group)',
      },
      {
        qualifier: 'Value lost',
        value: '43%',
        note: 'When sustainability is treated as a compliance exercise, companies spend 43% more on reporting than on innovation',
      },
    ],
  },
  teams: [
    {
      label: 'Sustainability teams',
      image: '/landing/team-sustainability.png',
      from: 'COMPLIANCE COST',
      to: 'ACTION & ADVANTAGE',
      toNote: '(without losing credibility)',
      bg: 'yellow' as const,
    },
    {
      label: 'Brand teams',
      image: '/landing/team-brand.png',
      from: 'A COST TO SALES',
      to: 'DRIVING SALES',
      toNote: '(without greenwashing)',
      bg: 'white' as const,
    },
    {
      label: 'Business teams',
      image: '/landing/team-business.png',
      from: 'COST CENTRE',
      to: 'CAPITAL',
      toNote: '(without reputational risk)',
      bg: 'yellow' as const,
    },
  ],
  footerCta: {
    subheadline: 'GET YOUR PERSONALISED INTERPLAY REPORT',
    cta: 'RUN YOUR ASSESSMENT',
    ctaNote: 'Takes 30 seconds',
  },
}

// ── Pentagon radar diagram ─────────────────────────────────────────────────

const PENTAGON_DATA = [
  { label: 'APPETITE',       score: '38%', color: '#f4821f', angle: -90  },
  { label: 'SCALE & AI',     score: '42%', color: '#49a0f5', angle: -18  },
  { label: 'SUSTAINABILITY', score: '31%', color: '#3dcf6f', angle:  54  },
  { label: 'BRAND',          score: '32%', color: '#a955f7', angle:  126 },
  { label: 'BUSINESS',       score: '23%', color: '#eab304', angle:  198 },
]

function toRad(deg: number) { return (deg * Math.PI) / 180 }
const CX = 250, CY = 250, R = 140

function pentagonPoint(angle: number, radius: number) {
  return {
    x: +(CX + radius * Math.cos(toRad(angle))).toFixed(2),
    y: +(CY + radius * Math.sin(toRad(angle))).toFixed(2),
  }
}

function PentagonDiagram() {
  const verts = PENTAGON_DATA.map(d => pentagonPoint(d.angle, R))
  const path = verts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x},${v.y}`).join(' ') + ' Z'

  return (
    <svg viewBox="0 0 500 500" className="w-full max-w-[480px]" aria-label="Interplay score diagram">
      {/* Pentagon fill */}
      <path d={path} fill="#faf000" stroke="#2f2a2a" strokeWidth="2" opacity="0.9" />

      {/* Spokes from centre to vertices */}
      {verts.map((v, i) => (
        <line key={i} x1={CX} y1={CY} x2={v.x} y2={v.y} stroke="#2f2a2a" strokeWidth="1" opacity="0.25" />
      ))}

      {/* Vertex dots */}
      {PENTAGON_DATA.map((d, i) => {
        const v = verts[i]
        return <circle key={i} cx={v.x} cy={v.y} r="5" fill={d.color} />
      })}

      {/* Score label in centre */}
      <text x={CX} y={CY + 6} textAnchor="middle" fontSize="20" fontWeight="bold"
        fontFamily="Robson, sans-serif" fill="#2f2a2a">
        32%
      </text>

      {/* Outer labels */}
      {PENTAGON_DATA.map((d, i) => {
        const lp = pentagonPoint(d.angle, R + 60)
        const anchor = d.angle > -30 && d.angle < 30 ? 'middle'
          : d.angle > 90 && d.angle < 170 ? 'middle'
          : d.angle >= 170 || d.angle <= -60 ? 'end'
          : 'start'
        return (
          <g key={i}>
            <text x={lp.x} y={lp.y - 6} textAnchor={anchor} fontSize="13"
              fontFamily="Open Sans, sans-serif" fontWeight="600" fill={d.color}>
              {d.label}
            </text>
            <text x={lp.x} y={lp.y + 10} textAnchor={anchor} fontSize="11"
              fontFamily="Open Sans, sans-serif" fill="#2f2a2a" opacity="0.7">
              {d.score}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── CTA Button ─────────────────────────────────────────────────────────────

function CtaButton({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <Link
      href="/start"
      className="inline-flex items-center gap-2 px-8 py-3 text-sm font-bold uppercase tracking-widest transition-all rounded-lg shadow-md"
      style={{
        backgroundColor: dark ? '#faf000' : '#ffffff',
        color: '#2f2a2a',
        fontFamily: 'Open Sans, sans-serif',
      }}
    >
      {label} →
    </Link>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#faf9f5', color: '#2f2a2a' }}>

      {/* ── Section 1: Hero ─────────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#faf000' }}>

        {/* Header */}
        <header className="flex items-center gap-6 px-8 md:px-16 py-5"
          style={{ borderBottom: '1px solid rgba(47,42,42,0.1)' }}>
          <img src="/landing/interrupt-logo-white.png" alt="Interrupt" style={{ height: '40px', width: 'auto' }} />
          <span style={{ color: 'rgba(47,42,42,0.4)', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}>×</span>
          <img src="/landing/likeso-logo-white.png" alt="Like So" style={{ height: '36px', width: 'auto' }} />
        </header>

        {/* Hero content */}
        <div className="flex flex-col lg:flex-row items-end gap-8 px-8 md:px-16 pt-12 pb-0 overflow-hidden">
          <div className="flex flex-col gap-6 pb-16 lg:pb-20 max-w-xl flex-shrink-0">
            <img
              src="/landing/interplay-logo.png"
              alt="Interplay Lab"
              style={{ height: '80px', width: 'auto', objectFit: 'contain', objectPosition: 'left' }}
            />
            <h1
              className="leading-none uppercase"
              style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(52px, 7vw, 96px)', color: '#2f2a2a' }}
            >
              {CONTENT.hero.headline}
            </h1>
            <p className="font-bold text-xl uppercase" style={{ fontFamily: 'Open Sans, sans-serif', color: '#2f2a2a' }}>
              {CONTENT.hero.subheadline}
            </p>
            <div className="flex flex-col gap-2">
              <CtaButton label={CONTENT.hero.cta} />
              <span className="text-sm" style={{ fontFamily: 'Open Sans, sans-serif', color: 'rgba(47,42,42,0.6)' }}>
                {CONTENT.hero.ctaNote}
              </span>
            </div>
          </div>

          {/* Report preview — rises above hero bottom */}
          <div className="flex-1 flex justify-center lg:justify-end items-end min-w-0">
            <div
              className="relative"
              style={{
                transform: 'rotate(7deg)',
                boxShadow: '8px 8px 32px 12px rgba(0,0,0,0.22)',
                maxWidth: '420px',
                width: '100%',
              }}
            >
              <img
                src="/landing/report-preview.png"
                alt="Example Interplay Report"
                className="w-full block"
                style={{ display: 'block' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: How Ready ─────────────────────────────────────────── */}
      <section className="px-8 md:px-16 py-16 bg-white">
        <h2
          className="uppercase leading-none mb-12"
          style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(36px, 5vw, 72px)', color: '#2f2a2a', lineHeight: 0.85 }}
        >
          {CONTENT.howReady.heading}
        </h2>

        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Text blocks */}
          <div className="flex flex-col gap-8 max-w-lg flex-shrink-0">
            {CONTENT.howReady.blocks.map((block, i) => (
              <div key={i}>
                <p className="font-bold text-xl uppercase mb-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                  {block.title}
                </p>
                <p className="text-lg leading-relaxed" style={{ fontFamily: 'Open Sans, sans-serif', color: 'rgba(47,42,42,0.7)' }}>
                  {block.body}
                </p>
              </div>
            ))}
          </div>

          {/* Pentagon diagram */}
          <div className="flex-1 flex justify-center">
            <PentagonDiagram />
          </div>
        </div>
      </section>

      {/* ── Section 3: When Interplay ────────────────────────────────────── */}
      <section className="px-8 md:px-16 py-16" style={{ backgroundColor: '#2f2a2a', color: '#fff' }}>
        <h2
          className="uppercase leading-none mb-12"
          style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(36px, 5vw, 72px)', color: '#faf000', lineHeight: 0.85 }}
        >
          {CONTENT.whenInterplay.heading}
        </h2>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Left: tool + value */}
          <div className="flex flex-col gap-8 max-w-md flex-shrink-0">
            {CONTENT.whenInterplay.left.map((block, i) => (
              <div key={i}>
                <p className="font-bold text-xl uppercase mb-2" style={{ fontFamily: 'Open Sans, sans-serif', color: '#fff' }}>
                  {block.title}
                </p>
                <p className="text-base leading-relaxed" style={{ fontFamily: 'Open Sans, sans-serif', color: 'rgba(255,255,255,0.7)' }}>
                  {block.body}
                </p>
              </div>
            ))}
          </div>

          {/* Right: stats */}
          <div className="flex flex-col gap-6 flex-1">
            {/* Big stat */}
            <div>
              <p
                className="uppercase leading-none"
                style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(64px, 12vw, 180px)', color: '#faf000', lineHeight: 0.85 }}
              >
                {CONTENT.whenInterplay.bigStat}
              </p>
              <p className="text-sm mt-2 max-w-md" style={{ fontFamily: 'Open Sans, sans-serif', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>
                {CONTENT.whenInterplay.bigStatNote}
              </p>
            </div>

            {/* Smaller stats */}
            <div className="flex flex-col sm:flex-row gap-8 mt-2">
              {CONTENT.whenInterplay.stats.map((stat, i) => (
                <div key={i} className="flex-1">
                  <p className="text-xs uppercase tracking-wider mb-1"
                    style={{ fontFamily: 'Open Sans, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
                    {stat.qualifier}
                  </p>
                  <p className="uppercase leading-none mb-2"
                    style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(48px, 8vw, 96px)', color: '#fff', lineHeight: 0.85 }}>
                    {stat.value}
                  </p>
                  <p className="text-xs leading-relaxed"
                    style={{ fontFamily: 'Open Sans, sans-serif', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>
                    {stat.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Team transformations ──────────────────────────────── */}
      {CONTENT.teams.map((team) => (
        <section
          key={team.label}
          className="px-8 md:px-16 py-16 flex flex-col items-center gap-8"
          style={{ backgroundColor: team.bg === 'yellow' ? '#faf000' : '#ffffff' }}
        >
          {/* Illustration */}
          <div className="flex flex-col items-center gap-4">
            <img
              src={team.image}
              alt={team.label}
              style={{ height: '280px', width: 'auto', objectFit: 'contain' }}
            />
            <p className="text-xl font-bold uppercase text-center"
              style={{ fontFamily: 'Open Sans, sans-serif', color: '#2f2a2a' }}>
              {team.label}
            </p>
          </div>

          {/* From / To */}
          <div className="flex flex-col sm:flex-row items-start justify-center gap-8 w-full max-w-4xl text-center">
            <div className="flex-1">
              <p className="text-lg uppercase mb-1" style={{ fontFamily: 'Open Sans, sans-serif', color: 'rgba(47,42,42,0.6)' }}>
                From
              </p>
              <p className="uppercase leading-none"
                style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(36px, 5vw, 72px)', color: '#2f2a2a', lineHeight: 0.85 }}>
                {team.from}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-lg uppercase mb-1" style={{ fontFamily: 'Open Sans, sans-serif', color: 'rgba(47,42,42,0.6)' }}>
                To
              </p>
              <p className="uppercase leading-none"
                style={{ fontFamily: 'Robson, sans-serif', fontSize: 'clamp(36px, 5vw, 72px)', color: '#2f2a2a', lineHeight: 0.85 }}>
                {team.to}
              </p>
              <p className="text-base font-bold mt-2"
                style={{ fontFamily: 'Open Sans, sans-serif', color: '#2f2a2a' }}>
                {team.toNote}
              </p>
            </div>
          </div>
        </section>
      ))}

      {/* ── Section 5: Footer CTA ─────────────────────────────────────────── */}
      <section className="px-8 md:px-16 py-16 flex flex-col gap-6" style={{ backgroundColor: '#2f2a2a' }}>
        <img
          src="/landing/interplay-logo.png"
          alt="Interplay Lab"
          style={{ height: '80px', width: 'auto', objectFit: 'contain', objectPosition: 'left', filter: 'brightness(0) invert(1)' }}
        />
        <p className="font-bold text-2xl uppercase" style={{ fontFamily: 'Open Sans, sans-serif', color: '#fff' }}>
          {CONTENT.footerCta.subheadline}
        </p>
        <div className="flex flex-col gap-2">
          <CtaButton label={CONTENT.footerCta.cta} dark />
          <span className="text-sm" style={{ fontFamily: 'Open Sans, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
            {CONTENT.footerCta.ctaNote}
          </span>
        </div>
      </section>

    </div>
  )
}

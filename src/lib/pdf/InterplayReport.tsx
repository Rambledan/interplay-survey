import React from 'react'
import {
  Document, Page, View, Text, StyleSheet, Font,
} from '@react-pdf/renderer'
import type { SectionScore, RespondentScores } from '@/lib/score'
import { SECTION_META, getScoreBand } from '@/lib/score'
import type { FinancialModel } from '@/lib/financial'
import { formatCurrency, SLUG_TO_SECTION_KEY } from '@/lib/financial'
import type { ReportTemplateContent, ReportOverrideContent } from '@/lib/report-defaults'
import { DEFAULT_EVIDENCE } from '@/lib/report-defaults'

// Register built-in PDF fonts so fontWeight: 700 maps to Helvetica-Bold
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica', fontWeight: 400 },
    { src: 'Helvetica-Bold', fontWeight: 700 },
  ],
})

// ── Types ──────────────────────────────────────────────────────────────────

export interface QuestionRow {
  id: string
  text: string
  type: string
  answer: string
  points: number | null
  maxPoints: number | null
}

export interface SectionResponseData {
  slug: string
  name: string
  questions: QuestionRow[]
}

export interface ContentOverrides {
  /** Global template overrides (band-indexed arrays per section) */
  globalTemplate?: ReportTemplateContent
  /** Per-respondent overrides (flat text per section, replaces band-selected content) */
  respondentOverride?: ReportOverrideContent | null
}

export interface ReportData {
  respondent: { name: string; role: string; company: string; sector: string; companyType: string }
  completedAt: string
  scores: RespondentScores
  benchmark: Record<string, number>
  benchmarkN: number
  financial: FinancialModel | null
  sectionResponses: SectionResponseData[]
  /** Optional CMS overrides — loaded from DB by the PDF route */
  contentOverrides?: ContentOverrides
}

// ── Colours ────────────────────────────────────────────────────────────────

const C = {
  white:    '#ffffff',
  pageBg:   '#f9f9f7',
  dark:     '#0d1410',
  dimmed:   '#6b7280',
  muted:    '#9ca3af',
  border:   '#e5e7eb',
  green:    '#3ecf6e',
  yellow:   '#faf000',
  appetite: '#f4821f',
  scale:    '#4a9ff5',
  sustain:  '#3ecf6e',
  brand:    '#a855f7',
  business: '#eab308',
}

const SECTION_COLORS: Record<string, string> = {
  'appetite':               C.appetite,
  'scale-and-delivery':     C.scale,
  'capability-sustainability': C.sustain,
  'capability-brand':       C.brand,
  'capability-business':    C.business,
}

// Evidence is imported from report-defaults.ts and overrideable via CMS

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.dark,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  coverPage: {
    backgroundColor: C.dark,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.white,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  // Layout
  row: { flexDirection: 'row' },
  col: { flexDirection: 'column' },
  spacer: { flex: 1 },
  // Text scales
  label: { fontSize: 7, letterSpacing: 1.5, color: C.dimmed, marginBottom: 4 },
  labelLight: { fontSize: 7, letterSpacing: 1.5, color: C.muted, marginBottom: 4 },
  h1: { fontSize: 28, fontWeight: 700, color: C.white },
  h2: { fontSize: 18, fontWeight: 700, color: C.dark },
  h3: { fontSize: 11, fontWeight: 700, color: C.dark },
  h4: { fontSize: 9, fontWeight: 700, color: C.dark },
  body: { fontSize: 9, lineHeight: 1.5, color: C.dark },
  bodyDim: { fontSize: 9, lineHeight: 1.5, color: C.dimmed },
  small: { fontSize: 7.5, lineHeight: 1.4, color: C.dimmed },
  // Section
  sectionHeading: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  // Dividers
  hr: { borderBottomWidth: 1, borderBottomColor: C.border, marginVertical: 12 },
  hrLight: { borderBottomWidth: 0.5, borderBottomColor: C.border, marginVertical: 8 },
  // Page footer
  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageFooterText: { fontSize: 7, color: C.muted },
  // Chips / badges
  chip: {
    borderWidth: 1,
    borderRadius: 2,
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 7,
    letterSpacing: 0.8,
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#fafafa',
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  // Score block
  scoreBox: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  bigScore: {
    fontSize: 42,
    fontWeight: 700,
    lineHeight: 1,
  },
  // Financial
  finBox: {
    backgroundColor: '#f0f7f2',
    borderWidth: 1,
    borderColor: '#c6e8d4',
    borderRadius: 4,
    padding: 12,
    marginTop: 12,
  },
  finScenario: {
    flex: 1,
    alignItems: 'center',
  },
  finValue: {
    fontSize: 14,
    fontWeight: 700,
    color: C.dark,
  },
})

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function sanitize(str: string) {
  return (str ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ')
}

function getInsightIdx(pct: number): { insightIdx: 0 | 1 | 2 | 3; actionIdx: 0 | 1 | 2 } {
  const band = getScoreBand(pct)
  return {
    insightIdx: band.index as 0 | 1 | 2 | 3,
    actionIdx: Math.min(band.index, 2) as 0 | 1 | 2,
  }
}

function PageFooter({ company }: { company: string }) {
  return (
    <View style={s.pageFooter} fixed>
      <Text style={s.pageFooterText}>INTERRUPT × LIKE SO — Interplay Method® — {company}</Text>
      <View style={s.spacer} />
      <Text style={s.pageFooterText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

// ── Cover Page ─────────────────────────────────────────────────────────────

function CoverPage({ data }: { data: ReportData }) {
  const { respondent, completedAt, scores } = data
  const overallBand = getScoreBand(scores.overall)

  // Decorative section colour dots
  const slugs = ['appetite', 'scale-and-delivery', 'capability-sustainability', 'capability-brand', 'capability-business']

  return (
    <Page size="A4" style={s.coverPage}>
      {/* Top accent bar */}
      <View style={{ height: 4, backgroundColor: C.yellow }} />

      {/* Main content area */}
      <View style={{ flex: 1, paddingHorizontal: 48, paddingTop: 48, paddingBottom: 48 }}>

        {/* Branding */}
        <View style={[s.row, { alignItems: 'center', marginBottom: 64 }]}>
          <Text style={{ fontSize: 11, letterSpacing: 2, color: '#aaaaaa', fontWeight: 700 }}>
            INTERRUPT × LIKE SO
          </Text>
        </View>

        {/* Title block */}
        <View style={{ marginBottom: 48 }}>
          <Text style={{ fontSize: 8, letterSpacing: 2, color: C.yellow, marginBottom: 12 }}>
            INTERPLAY METHOD — DIAGNOSTIC REPORT
          </Text>
          <Text style={[s.h1, { fontSize: 36, lineHeight: 1.1, marginBottom: 8 }]}>
            {sanitize(respondent.company) || 'Your Organisation'}
          </Text>
          <Text style={{ fontSize: 11, color: '#aaaaaa', marginBottom: 4 }}>
            {sanitize(respondent.name)}
          </Text>
          <Text style={{ fontSize: 9, color: '#888888' }}>
            {[respondent.role, respondent.sector, respondent.companyType].filter(Boolean).join('  ·  ')}
          </Text>
        </View>

        {/* Score preview */}
        <View style={{ marginBottom: 48 }}>
          <View style={[s.row, { alignItems: 'baseline', gap: 12 }]}>
            <Text style={{ fontSize: 64, fontWeight: 700, color: C.white, lineHeight: 1 }}>
              {scores.overall}%
            </Text>
            <View>
              <Text style={{ fontSize: 8, letterSpacing: 1.5, color: '#aaaaaa', marginBottom: 4 }}>OVERALL SCORE</Text>
              <Text style={{ fontSize: 14, fontWeight: 700, color: C.yellow }}>
                {overallBand.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Section colour row */}
        <View style={[s.row, { gap: 8, marginBottom: 48 }]}>
          {slugs.map(slug => {
            const meta = SECTION_META[slug]
            const section = data.scores.sections.find(s => s.slug === slug)
            return (
              <View key={slug} style={{ flex: 1 }}>
                <View style={{ height: 3, backgroundColor: SECTION_COLORS[slug], marginBottom: 6 }} />
                <Text style={{ fontSize: 6, letterSpacing: 1, color: '#888888' }}>
                  {meta?.shortName ?? slug.toUpperCase()}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: 700, color: C.white, marginTop: 2 }}>
                  {section?.pct ?? 0}%
                </Text>
              </View>
            )
          })}
        </View>

        <View style={s.spacer} />

        {/* Date */}
        <Text style={{ fontSize: 8, color: '#666666' }}>
          Completed: {completedAt ? formatDate(completedAt) : '—'}
        </Text>
        <Text style={{ fontSize: 7, color: '#555555', marginTop: 4 }}>
          Confidential — prepared by Interrupt × Like So
        </Text>
      </View>

      {/* Bottom bar */}
      <View style={{ height: 4, backgroundColor: C.green }} />
    </Page>
  )
}

// ── Summary Page ───────────────────────────────────────────────────────────

function SummaryPage({ data }: { data: ReportData }) {
  const { scores, benchmark, benchmarkN, financial, respondent } = data
  const hasBenchmark = benchmarkN >= 2

  return (
    <Page size="A4" style={s.page}>
      <PageFooter company={respondent.company} />

      <Text style={{ fontSize: 7, letterSpacing: 2, color: C.dimmed, marginBottom: 16 }}>
        OVERALL SUMMARY
      </Text>

      {/* Overall score */}
      <View style={[s.row, { alignItems: 'flex-start', gap: 24, marginBottom: 24 }]}>
        <View style={s.scoreBox}>
          <Text style={s.label}>OVERALL INTERPLAY SCORE</Text>
          <View style={[s.row, { alignItems: 'baseline', gap: 8 }]}>
            <Text style={[s.bigScore, { color: C.green }]}>{scores.overall}%</Text>
            <Text style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>{getScoreBand(scores.overall).label}</Text>
          </View>
        </View>
      </View>

      {/* Section scores table */}
      <Text style={[s.label, { marginBottom: 8 }]}>SECTION SCORES</Text>

      {/* Table header */}
      <View style={s.tableHeader}>
        <Text style={{ flex: 3, fontSize: 7, fontWeight: 700, color: C.dimmed }}>SECTION</Text>
        <Text style={{ flex: 1, fontSize: 7, fontWeight: 700, color: C.dimmed, textAlign: 'right' }}>SCORE</Text>
        <Text style={{ flex: 2, fontSize: 7, fontWeight: 700, color: C.dimmed, textAlign: 'center' }}>BAND</Text>
        {hasBenchmark && (
          <Text style={{ flex: 1, fontSize: 7, fontWeight: 700, color: C.dimmed, textAlign: 'right' }}>BENCHMARK</Text>
        )}
      </View>

      {scores.sections.map((section, i) => {
        const color = SECTION_COLORS[section.slug] ?? C.dark
        const band = getScoreBand(section.pct)
        const bm = benchmark[section.slug]
        const meta = SECTION_META[section.slug]
        const RowStyle = i % 2 === 0 ? s.tableRow : s.tableRowAlt

        return (
          <View key={section.slug} style={RowStyle} wrap={false}>
            <View style={[s.row, { flex: 3, alignItems: 'center', gap: 6 }]}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
              <Text style={{ fontSize: 8, fontWeight: 700 }}>{meta?.shortName ?? section.name.toUpperCase()}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 10, fontWeight: 700, color, textAlign: 'right' }}>{section.pct}%</Text>
            <View style={{ flex: 2, alignItems: 'center' }}>
              <View style={[s.chip, { borderColor: color }]}>
                <Text style={{ color, fontSize: 6, letterSpacing: 0.8 }}>{band.label}</Text>
              </View>
            </View>
            {hasBenchmark && (
              <Text style={{ flex: 1, fontSize: 8, color: C.dimmed, textAlign: 'right' }}>
                {bm != null ? `${bm}%` : '—'}
              </Text>
            )}
          </View>
        )
      })}

      {/* Financial totals */}
      {financial && (
        <View style={s.finBox} wrap={false}>
          <Text style={[s.label, { color: '#2d7a4f', marginBottom: 4 }]}>FINANCIAL OPPORTUNITY</Text>
          <Text style={[s.small, { marginBottom: 10 }]}>
            Based on {financial.currencySymbol}{(financial.annualRevenue / 1_000_000).toFixed(1)}M annual revenue
          </Text>
          <View style={s.row}>
            {(['conservative', 'moderate', 'optimistic'] as const).map(scenario => (
              <View key={scenario} style={s.finScenario}>
                <Text style={{ fontSize: 7, letterSpacing: 1, color: C.dimmed, marginBottom: 4 }}>
                  {scenario.toUpperCase()}
                </Text>
                <Text style={s.finValue}>
                  {formatCurrency(financial.totals[scenario], financial.currencySymbol)}
                </Text>
                <Text style={[s.small, { marginTop: 2 }]}>
                  {financial.totalsAsPercentOfRevenue[scenario]} of revenue
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Page>
  )
}

// ── Section Page ───────────────────────────────────────────────────────────

function SectionPage({ section, data }: { section: SectionScore; data: ReportData }) {
  const { benchmark, benchmarkN, financial, sectionResponses, respondent, contentOverrides } = data
  const color = SECTION_COLORS[section.slug] ?? C.dark
  const meta = SECTION_META[section.slug]
  const { insightIdx, actionIdx } = getInsightIdx(section.pct)
  const band = getScoreBand(section.pct)
  const hasBenchmark = benchmarkN >= 2
  const bm = benchmark[section.slug]

  // ── Resolve content with override priority ───────────────────────────────
  // Priority: respondent-specific override > global template override > default
  const slug = section.slug
  const respSec = contentOverrides?.respondentOverride?.sections?.[slug]
  const globalSec = contentOverrides?.globalTemplate?.sections?.[slug]

  const insightText = respSec?.insight
    || globalSec?.insights?.[insightIdx]
    || meta?.insights[insightIdx]
    || ''

  const actionText = respSec?.action
    || globalSec?.actions?.[actionIdx]
    || meta?.actions[actionIdx]
    || ''

  const howWeCanHelpText = respSec?.howWeCanHelp
    || globalSec?.howWeCanHelp?.[actionIdx]
    || meta?.howWeCanHelp[actionIdx]
    || ''

  // Questions for this section
  const secResponses = sectionResponses.find(s => s.slug === section.slug)
  const scoredQs = secResponses?.questions.filter(q => q.points !== null) ?? []
  const openQs = secResponses?.questions.filter(q => q.points === null) ?? []

  // Financial for this section
  const finKey = SLUG_TO_SECTION_KEY[section.slug]
  const finSection = financial?.sections[finKey]

  return (
    <Page size="A4" style={s.page}>
      <PageFooter company={respondent.company} />

      {/* Colour bar — absolute top strip */}
      <View style={{ height: 3, backgroundColor: color, marginBottom: 20, marginHorizontal: -48, marginTop: -48 }} />

      {/* Section header */}
      <View style={[s.row, { alignItems: 'flex-start', marginBottom: 16 }]} wrap={false}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 7, letterSpacing: 2, color: C.dimmed, marginBottom: 4 }}>
            {section.slug === 'appetite' ? 'SECTION 1 OF 5' :
             section.slug === 'scale-and-delivery' ? 'SECTION 2 OF 5' :
             section.slug === 'capability-sustainability' ? 'SECTION 3 OF 5' :
             section.slug === 'capability-brand' ? 'SECTION 4 OF 5' : 'SECTION 5 OF 5'}
          </Text>
          <Text style={[s.sectionHeading, { color }]}>{meta?.shortName ?? section.name.toUpperCase()}</Text>
          <Text style={{ fontSize: 8, color: C.dimmed }}>{section.name}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{section.pct}%</Text>
          <View style={[s.chip, { borderColor: color, marginTop: 4 }]}>
            <Text style={{ color, fontSize: 6, letterSpacing: 0.8 }}>{band.label}</Text>
          </View>
          {hasBenchmark && bm != null && (
            <Text style={{ fontSize: 7, color: C.muted, marginTop: 4 }}>Benchmark: {bm}%</Text>
          )}
        </View>
      </View>

      <View style={s.hr} />

      {/* Insight */}
      {insightText && (
        <View style={{ marginBottom: 12 }} wrap={false}>
          <Text style={[s.label, { marginBottom: 6 }]}>INSIGHT</Text>
          <Text style={s.body}>{sanitize(insightText)}</Text>
        </View>
      )}

      {/* Recommended action */}
      {actionText && (
        <View style={{ marginBottom: 12 }} wrap={false}>
          <Text style={[s.label, { marginBottom: 6 }]}>RECOMMENDED ACTION</Text>
          <Text style={s.body}>{sanitize(actionText)}</Text>
        </View>
      )}

      {/* How we can help */}
      {howWeCanHelpText && (
        <View style={{ marginBottom: 12 }}>
          <Text style={[s.label, { marginBottom: 6 }]}>HOW WE CAN HELP</Text>
          {howWeCanHelpText.split('\n\n').map((para, i) => (
            <Text key={i} style={[s.body, { marginBottom: 4 }]}>{sanitize(para)}</Text>
          ))}
        </View>
      )}

      {/* Financial opportunity for this section */}
      {finSection && (
        <View style={[s.finBox, { marginBottom: 12 }]} wrap={false}>
          <Text style={[s.label, { color: '#2d7a4f', marginBottom: 4 }]}>FINANCIAL OPPORTUNITY — {finSection.label.toUpperCase()}</Text>
          <Text style={[s.small, { marginBottom: 8 }]}>{sanitize(finSection.driver)}</Text>
          <View style={s.row}>
            {(['conservative', 'moderate', 'optimistic'] as const).map(scenario => (
              <View key={scenario} style={s.finScenario}>
                <Text style={{ fontSize: 6, letterSpacing: 1, color: C.dimmed, marginBottom: 2 }}>
                  {scenario.toUpperCase()}
                </Text>
                <Text style={[s.finValue, { fontSize: 11 }]}>
                  {formatCurrency(finSection.opportunity[scenario], financial!.currencySymbol)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Scored questions table */}
      {scoredQs.length > 0 && (
        <View>
          <Text style={[s.label, { marginBottom: 6, marginTop: 4 }]}>QUESTION RESPONSES</Text>

          <View style={s.tableHeader}>
            <Text style={{ flex: 4, fontSize: 7, fontWeight: 700, color: C.dimmed }}>QUESTION</Text>
            <Text style={{ flex: 2, fontSize: 7, fontWeight: 700, color: C.dimmed }}>ANSWER</Text>
            <Text style={{ flex: 1, fontSize: 7, fontWeight: 700, color: C.dimmed, textAlign: 'right' }}>SCORE</Text>
          </View>

          {scoredQs.map((q, i) => (
            <View key={q.id} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
              <Text style={{ flex: 4, fontSize: 8, color: C.dark, paddingRight: 8 }}>{sanitize(q.text)}</Text>
              <Text style={{ flex: 2, fontSize: 8, color: color, fontWeight: 700 }}>{sanitize(q.answer)}</Text>
              <Text style={{ flex: 1, fontSize: 8, color: C.dimmed, textAlign: 'right' }}>
                {q.points} / {q.maxPoints}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Open responses */}
      {openQs.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={[s.label, { marginBottom: 6 }]}>OPEN RESPONSES</Text>
          {openQs.map((q, i) => (
            <View key={q.id} style={{ marginBottom: 8 }} wrap={false}>
              <Text style={[s.small, { fontWeight: 700, marginBottom: 2 }]}>{sanitize(q.text)}</Text>
              <Text style={[s.bodyDim, { fontSize: 8 }]}>{sanitize(q.answer)}</Text>
            </View>
          ))}
        </View>
      )}
    </Page>
  )
}

// ── Evidence Page ──────────────────────────────────────────────────────────

function EvidencePage({ data }: { data: ReportData }) {
  // Use CMS override if present, otherwise fall back to defaults
  const evidenceList = data.contentOverrides?.globalTemplate?.evidence ?? DEFAULT_EVIDENCE

  return (
    <Page size="A4" style={s.page}>
      <PageFooter company={data.respondent.company} />

      <Text style={{ fontSize: 7, letterSpacing: 2, color: C.dimmed, marginBottom: 16 }}>
        EVIDENCE BASE
      </Text>
      <Text style={[s.body, { marginBottom: 16 }]}>
        The Interplay Method diagnostic is grounded in four independent bodies of evidence:
      </Text>

      {evidenceList.map((ref, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 12 }} wrap={false}>
          <Text style={{ fontSize: 9, fontWeight: 700, color: C.green, marginRight: 8, width: 14 }}>{i + 1}.</Text>
          <Text style={[s.body, { flex: 1 }]}>{ref}</Text>
        </View>
      ))}

      <View style={[s.hr, { marginTop: 24 }]} />

      <View style={{ marginTop: 16 }}>
        <Text style={[s.label, { marginBottom: 8 }]}>WHAT'S NEXT?</Text>
        <Text style={s.body}>
          To improve your Interplay score and unlock the commercial value of sustainability integration,
          contact Interrupt × Like So.
        </Text>
        <Text style={[s.body, { marginTop: 8, color: C.dimmed }]}>
          interrupt-sustainability.com  ·  likeso.com
        </Text>
      </View>
    </Page>
  )
}

// ── Main Document ──────────────────────────────────────────────────────────

export function InterplayReport({ data }: { data: ReportData }) {
  return (
    <Document
      title={`Interplay Report — ${data.respondent.company}`}
      author="Interrupt × Like So"
      subject="Interplay Method Diagnostic Report"
    >
      <CoverPage data={data} />
      <SummaryPage data={data} />
      {data.scores.sections.map(section => (
        <SectionPage key={section.slug} section={section} data={data} />
      ))}
      <EvidencePage data={data} />
    </Document>
  )
}

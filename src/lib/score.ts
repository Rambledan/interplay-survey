/**
 * score.ts
 *
 * Computes section scores (0–100%) from respondent answer maps.
 * Scores are derived from data/scoring.json — option text → numeric value.
 * Questions not present in scoring.json (open-answer, diagnostic) are ignored.
 *
 * Max section scores (sum of max option values across all scored questions):
 *   appetite:                 12  (3 × max 4)
 *   scale-and-delivery:       13  (scale-q1/q2 max 4 each + scale-q3 max 5 checkboxes)
 *   capability-sustainability: 36  (9 × max 4; sus-q5/q6 use 0/2/4)
 *   capability-brand:         56  (14 × max 4; brand-q7/q16 use 0-based 4-option scale)
 *   capability-business:      32  (8 × max 4; biz-q2/q5/q6/q8/q13 use 0-based scale)
 * All questions: lowest option = 0 pts, highest = max pts.
 */

import questionsData from '../../data/questions.json'
import scoringData from '../../data/scoring.json'
import type { SurveySection } from '@/types/survey'

const sections = questionsData as SurveySection[]
const scoring = scoringData as Record<string, Record<string, number>>

export interface SectionScore {
  slug: string
  name: string
  raw: number          // points earned
  max: number          // max possible across all scored questions in section
  pct: number          // 0–100 rounded integer
  answeredCount: number
  scorableCount: number
}

export interface RespondentScores {
  sections: SectionScore[]
  overall: number   // mean pct across sections that have any scored questions
}

/**
 * Compute scores for all sections given a flat map of questionId → answerText.
 * Pass answers merged across all section submissions.
 */
export function computeAllSectionScores(
  answers: Record<string, string>
): RespondentScores {
  const sectionScores: SectionScore[] = sections.map(section => {
    let raw = 0
    let max = 0
    let answeredCount = 0
    let scorableCount = 0

    for (const q of section.questions) {
      const questionScores = scoring[q.id]
      if (!questionScores) continue  // open-answer or unscored diagnostic

      scorableCount++
      const maxForQuestion = Math.max(...Object.values(questionScores))
      max += maxForQuestion

      const answer = answers[q.id]
      if (!answer) continue

      let pts: number
      if (q.type === 'multiple-select') {
        const count = answer.split(',').filter(s => s.trim().length > 0).length
        pts = questionScores[String(count)] ?? 0
      } else {
        pts = questionScores[answer] ?? 0
      }
      raw += pts
      answeredCount++
    }

    const pct = max > 0 ? Math.round((raw / max) * 100) : 0

    return { slug: section.slug, name: section.name, raw, max, pct, answeredCount, scorableCount }
  })

  const scored = sectionScores.filter(s => s.max > 0)
  const overall = scored.length > 0
    ? Math.round(scored.reduce((sum, s) => sum + s.pct, 0) / scored.length)
    : 0

  return { sections: sectionScores, overall }
}

/**
 * Compute benchmark: average pct per section across an array of respondent answer maps.
 */
export function computeBenchmark(
  allAnswers: Array<Record<string, string>>
): Record<string, number> {
  const totals: Record<string, number[]> = {}

  for (const answers of allAnswers) {
    const scores = computeAllSectionScores(answers)
    for (const s of scores.sections) {
      if (s.max > 0 && s.answeredCount > 0) {
        if (!totals[s.slug]) totals[s.slug] = []
        totals[s.slug].push(s.pct)
      }
    }
  }

  const benchmark: Record<string, number> = {}
  for (const [slug, vals] of Object.entries(totals)) {
    benchmark[slug] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }
  return benchmark
}

// ── Section metadata for the results page ────────────────────────────────────

// ── How We Can Help structured types ─────────────────────────────────────────

export interface HowWeCanHelpItem {
  title: string
  content: string
}

export interface HowWeCanHelpBand {
  intro?: string
  items?: HowWeCanHelpItem[]
}

// ── Section metadata ──────────────────────────────────────────────────────────

export const SECTION_META: Record<string, {
  shortName: string
  color: string
  insights: [string, string, string, string]        // [0-39, 40-59, 60-79, 80-100]
  actions: [string, string, string]                 // [0-39, 40-59, 60+]
  howWeCanHelp: [HowWeCanHelpBand, HowWeCanHelpBand, HowWeCanHelpBand]  // [0-39, 40-59, 60+]
}> = {
  'appetite': {
    shortName: 'APPETITE',
    color: '#FF883E',
    insights: [
      'Sustainability is not yet integrated into commercial thinking. Linking sustainability initiatives to revenue narratives is a high-value unlock for budget and board-level support.',
      'There is growing recognition that sustainability can drive value, but the connection to commercial outcomes remains inconsistent. Building a clear ROI story will accelerate internal buy-in.',
      'Sustainability is meaningfully connected to your commercial strategy. The next frontier is making this linkage more explicit in product pipelines and investor communications.',
      'Sustainability is a core commercial driver. Focus on quantifying this advantage and using it as a differentiator in customer, partner, and investor conversations.',
    ],
    actions: [
      'Connect sustainability to the commercials. Build a clear ROI story to accelerate internal buy-in.',
      'Connect sustainability to the commercials. Build a clear ROI story to accelerate internal buy-in.',
      'Connect sustainability to the commercials. Build a clear ROI story to accelerate internal buy-in.',
    ],
    howWeCanHelp: [
      {
        items: [
          { title: 'Interplay workshop', content: 'Connect sustainability to business and brand commercials. Delivers: a unified commercial story across teams, integrated commercial sustainability priorities, and identified revenue & efficiency opportunities along the value chain & customer/consumer journeys.' },
          { title: 'Interplay fast track', content: 'A 2-hour quick-fire workshop to deliver fast top-line recommendations.' },
          { title: 'ROI story', content: 'Build the business/brand case.' },
        ],
      },
      {
        items: [
          { title: 'Interplay workshop', content: 'Connect sustainability to business and brand commercials. Delivers: a unified commercial story across teams, integrated commercial sustainability priorities, and identified revenue & efficiency opportunities along the value chain & customer/consumer journeys.' },
          { title: 'Interplay fast track', content: 'A 2-hour quick-fire workshop to deliver fast top-line recommendations.' },
          { title: 'ROI story', content: 'Build the business/brand case.' },
        ],
      },
      {
        items: [
          { title: 'Interplay workshop', content: 'Connect sustainability to business and brand commercials. Delivers: a unified commercial story across teams, integrated commercial sustainability priorities, and identified revenue & efficiency opportunities along the value chain & customer/consumer journeys.' },
          { title: 'Interplay fast track', content: 'A 2-hour quick-fire workshop to deliver fast top-line recommendations.' },
          { title: 'ROI story', content: 'Build the business/brand case.' },
        ],
      },
    ],
  },
  'scale-and-delivery': {
    shortName: 'SCALE & AI',
    color: '#9D5AEF',
    insights: [
      'AI is not yet embedded in your sustainability work. Even simple tools — automated reporting, LLM-assisted analysis — could meaningfully reduce compliance burden and free capacity.',
      'There is some AI access, but it is not systematically applied to sustainability. Identifying two or three high-impact AI use cases would unlock disproportionate value.',
      'Good AI foundations are in place. The next step is building dedicated workflows that apply AI to both impact measurement and commercial sustainability storytelling.',
      'AI is well-integrated into your sustainability operations. Consider building proprietary tools or datasets that create a durable competitive moat around your sustainability intelligence.',
    ],
    actions: [
      'Build dedicated workflows that connect AI to both impact measurement and commercial sustainability strategy, storytelling and activation.',
      'Build dedicated workflows that connect AI to both impact measurement and commercial sustainability strategy, storytelling and activation.',
      'Build dedicated workflows that connect AI to both impact measurement and commercial sustainability strategy, storytelling and activation.',
    ],
    howWeCanHelp: [
      {
        items: [
          { title: 'AI Audit', content: 'Assess effectiveness, identify gaps and opportunity for value and growth.' },
          { title: 'AI product and services recommendations', content: 'Unlock revenue streams and scale impact, e.g. to make recommerce economically viable.' },
        ],
      },
      {
        items: [
          { title: 'AI Audit', content: 'Assess effectiveness, identify gaps and opportunity for value and growth.' },
          { title: 'AI product and services recommendations', content: 'Unlock revenue streams and scale impact, e.g. to make recommerce economically viable.' },
        ],
      },
      {
        items: [
          { title: 'AI Audit', content: 'Assess effectiveness, identify gaps and opportunity for value and growth.' },
          { title: 'AI product and services recommendations', content: 'Unlock revenue streams and scale impact, e.g. to make recommerce economically viable.' },
        ],
      },
    ],
  },
  'capability-sustainability': {
    shortName: 'SUSTAINABILITY',
    color: '#3ecf6e',
    insights: [
      'Sustainability is largely siloed and compliance-driven. Activating it across teams — with clear targets linked to business and brand KPIs — is the most important next step.',
      'The sustainability function is active, but not yet fully embedded. Increasing internal storytelling, cross-team involvement, and target visibility will deepen its reach.',
      'Good sustainability foundations with cross-team buy-in and aligned targets. The opportunity lies in making the sustainability narrative more commercially compelling and brand-visible.',
      'Sustainability is deeply embedded — strategy, teams, and targets are genuinely aligned. The challenge now is amplifying this externally and scaling impact beyond the organisation.',
    ],
    actions: [
      'Connect sustainability with cross-team accountability and action – by increasing internal storytelling, activation, and target visibility to deepen its reach.',
      'Connect sustainability with cross-team accountability and action – by increasing internal storytelling, activation, and target visibility to deepen its reach.',
      'Connect sustainability with cross-team accountability and action – by increasing internal storytelling, activation, and target visibility to deepen its reach.',
    ],
    howWeCanHelp: [
      {
        items: [
          { title: 'Employee engagement', content: 'Develop an internal campaign to embed and activate your sustainability strategy.' },
          { title: 'Team KPIs', content: 'Create responsibility across all team functions to integrate sustainability into their day-to-day roles.' },
        ],
      },
      {
        items: [
          { title: 'Employee engagement', content: 'Develop an internal campaign to embed and activate your sustainability strategy.' },
          { title: 'Team KPIs', content: 'Create responsibility across all team functions to integrate sustainability into their day-to-day roles.' },
        ],
      },
      {
        items: [
          { title: 'Employee engagement', content: 'Develop an internal campaign to embed and activate your sustainability strategy.' },
          { title: 'Team KPIs', content: 'Create responsibility across all team functions to integrate sustainability into their day-to-day roles.' },
        ],
      },
    ],
  },
  'capability-brand': {
    shortName: 'BRAND',
    color: '#E8626D',
    insights: [
      'Brand and sustainability are operating largely in parallel. This is a significant missed opportunity — sustainability claims without brand integration create greenwashing risk.',
      'Some alignment exists but the connection between brand and sustainability is not yet systematic. Earlier involvement of sustainability teams in brand work would reduce risk and increase impact.',
      'Brand and sustainability are working together meaningfully. Deepening this collaboration — particularly in product innovation and campaign development — will strengthen both.',
      'Brand and sustainability are fully integrated, creating authentic market differentiation. The focus now is on making this integration externally legible and commercially measurable.',
    ],
    actions: [
      'Connect sustainability to consumers to address the intention-action gap.',
      'Connect sustainability to consumers to address the intention-action gap.',
      'Connect sustainability to consumers to address the intention-action gap.',
    ],
    howWeCanHelp: [
      {
        items: [
          { title: 'Consumer sustainability story', content: 'Connect and simplify your sustainability strategy for consumers with a clear brand-aligned narrative.' },
          { title: 'Consumer messaging framework', content: 'Develop a framework aligned with brand purpose and consumer tone of voice.' },
          { title: 'AI-enhanced products and services', content: 'Engage consumers and drive action with existing and new AI-powered offerings.' },
          { title: 'Toolkit', content: 'Activate across all your regions with sustainability understanding all in one place.' },
        ],
      },
      {
        items: [
          { title: 'Consumer sustainability story', content: 'Connect and simplify your sustainability strategy for consumers with a clear brand-aligned narrative.' },
          { title: 'Consumer messaging framework', content: 'Develop a framework aligned with brand purpose and consumer tone of voice.' },
          { title: 'AI-enhanced products and services', content: 'Engage consumers and drive action with existing and new AI-powered offerings.' },
          { title: 'Toolkit', content: 'Activate across all your regions with sustainability understanding all in one place.' },
        ],
      },
      {
        items: [
          { title: 'Consumer sustainability story', content: 'Connect and simplify your sustainability strategy for consumers with a clear brand-aligned narrative.' },
          { title: 'Consumer messaging framework', content: 'Develop a framework aligned with brand purpose and consumer tone of voice.' },
          { title: 'AI-enhanced products and services', content: 'Engage consumers and drive action with existing and new AI-powered offerings.' },
          { title: 'Toolkit', content: 'Activate across all your regions with sustainability understanding all in one place.' },
        ],
      },
    ],
  },
  'capability-business': {
    shortName: 'BUSINESS',
    color: '#5F9FDF',
    insights: [
      'Business and sustainability strategies are largely separate. Integrating sustainability into financial planning, capital allocation, and decision-making frameworks is the critical unlock.',
      'Sustainability is considered in business planning but not fully embedded. Establishing regular cross-functional meetings and financial performance measurement would close this gap.',
      'Sustainability is well integrated into business operations. The next level is making sustainability performance central to capital allocation decisions and investor reporting.',
      'Sustainability is core to your business model, with measurement, involvement, and capital allocation all aligned. This is a strong foundation for competitive advantage and impact at scale.',
    ],
    actions: [
      'Connect and integrate sustainability into financial planning, capital allocation, and decision-making frameworks.',
      'Connect and integrate sustainability into financial planning, capital allocation, and decision-making frameworks.',
      'Connect and integrate sustainability into financial planning, capital allocation, and decision-making frameworks.',
    ],
    howWeCanHelp: [
      {
        items: [
          { title: '£ESG', content: 'Convert reporting and compliance (Double Materiality) into commercial value.' },
          { title: 'Executive story', content: 'Develop and convert your sustainability strategy and initiatives into commercial language.' },
        ],
      },
      {
        items: [
          { title: '£ESG', content: 'Convert reporting and compliance (Double Materiality) into commercial value.' },
          { title: 'Executive story', content: 'Develop and convert your sustainability strategy and initiatives into commercial language.' },
        ],
      },
      {
        items: [
          { title: '£ESG', content: 'Convert reporting and compliance (Double Materiality) into commercial value.' },
          { title: 'Executive story', content: 'Develop and convert your sustainability strategy and initiatives into commercial language.' },
        ],
      },
    ],
  },
}

export function getScoreBand(pct: number): { label: string; index: number } {
  if (pct >= 80) return { label: 'LEADING', index: 3 }
  if (pct >= 60) return { label: 'MATURING', index: 2 }
  if (pct >= 40) return { label: 'DEVELOPING', index: 1 }
  return { label: 'EARLY STAGE', index: 0 }
}

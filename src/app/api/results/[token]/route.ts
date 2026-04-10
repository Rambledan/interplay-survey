import { NextRequest, NextResponse } from 'next/server'
import { getRespondentToken, getAllResponses } from '@/lib/db'
import { computeAllSectionScores, computeBenchmark } from '@/lib/score'
import {
  calculateFinancialOpportunity,
  parseRevenue,
  parseCurrencySymbol,
  SLUG_TO_SECTION_KEY,
  type FinancialModel,
} from '@/lib/financial'
import questionsData from '../../../../../data/questions.json'
import scoringData from '../../../../../data/scoring.json'

const scoring = scoringData as Record<string, Record<string, number>>

// ── Types ─────────────────────────────────────────────────────────────────

export interface QuestionResponse {
  id: string
  text: string
  type: string
  answer: string
  followUp: string
  /** Points earned for this answer. null = question is not scored (open-answer, context). */
  points: number | null
  /** Maximum possible points for this question. null = not scored. */
  maxPoints: number | null
}

export interface SectionResponses {
  slug: string
  name: string
  questions: QuestionResponse[]
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Verify token is valid and not revoked
  const tokenRow = await getRespondentToken(token)
  if (!tokenRow) {
    return NextResponse.json({ error: 'Invalid or expired results link' }, { status: 404 })
  }

  const respondentName = tokenRow.respondent_name

  // Load all responses
  const allRows = await getAllResponses()

  // Respondent's own rows (match by name, case-insensitive)
  const myRows = allRows.filter(
    r => r.respondent_name.toLowerCase() === respondentName.toLowerCase()
  )

  if (myRows.length === 0) {
    return NextResponse.json({ error: 'No survey responses found for this respondent' }, { status: 404 })
  }

  // Build merged flat answer + follow-up maps from all their sections
  const myAnswers: Record<string, string> = {}
  const myFollowUps: Record<string, string> = {}
  for (const row of myRows) {
    Object.assign(myAnswers, row.answers as Record<string, string>)
    Object.assign(myFollowUps, row.follow_ups as Record<string, string>)
  }

  const scores = computeAllSectionScores(myAnswers)

  // Build benchmark from all OTHER respondents (grouped by respondent_name)
  const othersByName = new Map<string, Record<string, string>>()
  for (const row of allRows) {
    const name = row.respondent_name.toLowerCase()
    if (name === respondentName.toLowerCase()) continue
    if (!othersByName.has(name)) othersByName.set(name, {})
    Object.assign(othersByName.get(name)!, row.answers as Record<string, string>)
  }

  const benchmark = computeBenchmark(Array.from(othersByName.values()))

  // Pull respondent profile from their most recent complete row
  const latestRow = myRows.sort((a, b) => {
    const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0
    const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0
    return bTime - aTime
  })[0]

  // Compute financial opportunity if revenue is available
  let financial: FinancialModel | null = null
  const revenueAnswer = myAnswers['biz-q12']
  const annualRevenue = parseRevenue(revenueAnswer)
  if (annualRevenue !== null) {
    const pctMap = Object.fromEntries(scores.sections.map(s => [s.slug, s.pct]))
    financial = calculateFinancialOpportunity({
      annualRevenue,
      currencySymbol: parseCurrencySymbol(revenueAnswer),
      appetiteForGrowth:         pctMap['appetite'] ?? 0,
      accelerationWithAI:        pctMap['scale-and-delivery'] ?? 0,
      sustainabilityCapability:  pctMap['capability-sustainability'] ?? 0,
      brandCapability:           pctMap['capability-brand'] ?? 0,
      businessCapability:        pctMap['capability-business'] ?? 0,
    })
  }

  // Build structured section responses from questions.json, enriched with per-question scoring
  type QData = { id: string; text: string; type: string }
  type SData = { slug: string; name: string; questions: QData[] }
  const sectionResponses: SectionResponses[] = (questionsData as SData[]).map(section => ({
    slug: section.slug,
    name: section.name,
    questions: section.questions
      .filter(q => myAnswers[q.id] !== undefined && myAnswers[q.id] !== '')
      .map(q => {
        const questionScores = scoring[q.id] ?? null
        const answer = myAnswers[q.id] ?? ''
        let points: number | null = null
        if (questionScores) {
          if (q.type === 'multiple-select') {
            const count = answer.split(',').filter((s: string) => s.trim().length > 0).length
            points = questionScores[String(count)] ?? 0
          } else {
            points = questionScores[answer] ?? 0
          }
        }
        const maxPoints = questionScores ? Math.max(...Object.values(questionScores)) : null
        return {
          id: q.id,
          text: q.text,
          type: q.type,
          answer,
          followUp: myFollowUps[q.id] ?? '',
          points,
          maxPoints,
        }
      }),
  })).filter(s => s.questions.length > 0)

  return NextResponse.json({
    respondent: {
      name: latestRow.respondent_name,
      role: latestRow.respondent_role,
      company: latestRow.respondent_company,
      sector: latestRow.respondent_sector,
      companyType: latestRow.respondent_type,
    },
    completedAt: latestRow.submitted_at,
    scores,
    benchmark,
    benchmarkN: othersByName.size,
    financial,
    sectionResponses,
  })
}

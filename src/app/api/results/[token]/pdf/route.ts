import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { getRespondentToken, getAllResponses } from '@/lib/db'
import { computeAllSectionScores, computeBenchmark } from '@/lib/score'
import {
  calculateFinancialOpportunity,
  parseRevenue,
  parseCurrencySymbol,
  type FinancialModel,
} from '@/lib/financial'
import { InterplayReport } from '@/lib/pdf/InterplayReport'
import questionsData from '../../../../../../data/questions.json'
import scoringData from '../../../../../../data/scoring.json'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const scoring = scoringData as Record<string, Record<string, number>>

function sanitizeFilename(str: string): string {
  return (str ?? 'report')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40) || 'report'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate token
    const tokenRow = await getRespondentToken(token)
    if (!tokenRow) {
      return NextResponse.json({ error: 'Invalid or expired results link' }, { status: 404 })
    }

    const respondentName = tokenRow.respondent_name
    const allRows = await getAllResponses()

    // Respondent's own rows
    const myRows = allRows.filter(
      r => r.respondent_name.toLowerCase() === respondentName.toLowerCase()
    )
    if (myRows.length === 0) {
      return NextResponse.json({ error: 'No survey responses found' }, { status: 404 })
    }

    // Merge answers
    const myAnswers: Record<string, string> = {}
    const myFollowUps: Record<string, string> = {}
    for (const row of myRows) {
      Object.assign(myAnswers, row.answers as Record<string, string>)
      Object.assign(myFollowUps, row.follow_ups as Record<string, string>)
    }

    const scores = computeAllSectionScores(myAnswers)

    // Benchmark from all other respondents
    const othersByName = new Map<string, Record<string, string>>()
    for (const row of allRows) {
      const name = row.respondent_name.toLowerCase()
      if (name === respondentName.toLowerCase()) continue
      if (!othersByName.has(name)) othersByName.set(name, {})
      Object.assign(othersByName.get(name)!, row.answers as Record<string, string>)
    }
    const benchmark = computeBenchmark(Array.from(othersByName.values()))

    // Latest row for profile
    const latestRow = [...myRows].sort((a, b) => {
      const aT = a.submitted_at ? new Date(a.submitted_at).getTime() : 0
      const bT = b.submitted_at ? new Date(b.submitted_at).getTime() : 0
      return bT - aT
    })[0]

    // Financial model
    let financial: FinancialModel | null = null
    const revenueAnswer = myAnswers['biz-q12']
    const annualRevenue = parseRevenue(revenueAnswer)
    if (annualRevenue !== null) {
      const pctMap = Object.fromEntries(scores.sections.map(s => [s.slug, s.pct]))
      financial = calculateFinancialOpportunity({
        annualRevenue,
        currencySymbol: parseCurrencySymbol(revenueAnswer),
        appetiteForGrowth:        pctMap['appetite'] ?? 0,
        accelerationWithAI:       pctMap['scale-and-delivery'] ?? 0,
        sustainabilityCapability: pctMap['capability-sustainability'] ?? 0,
        brandCapability:          pctMap['capability-brand'] ?? 0,
        businessCapability:       pctMap['capability-business'] ?? 0,
      })
    }

    // Section responses with scoring
    type QData = { id: string; text: string; type: string }
    type SData = { slug: string; name: string; questions: QData[] }
    const sectionResponses = (questionsData as SData[]).map(section => ({
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
          return { id: q.id, text: q.text, type: q.type, answer, points, maxPoints }
        }),
    })).filter(s => s.questions.length > 0)

    const reportData = {
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
    }

    // Generate PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(InterplayReport, { data: reportData }) as any
    const buffer = await renderToBuffer(element)

    const filename = `interplay-report-${sanitizeFilename(reportData.respondent.company)}.pdf`
    const uint8 = new Uint8Array(buffer)

    return new Response(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(uint8.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[PDF generation error]', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { appendResponseRow } from '@/lib/sheets'
import type { SurveyResponse } from '@/types/survey'

export async function POST(request: NextRequest) {
  let body: SurveyResponse

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { respondent, sectionSlug, answers, followUps, submittedAt } = body

  if (!respondent?.name || !respondent?.role) {
    return NextResponse.json(
      { error: 'respondent.name and respondent.role are required' },
      { status: 400 }
    )
  }

  if (!sectionSlug) {
    return NextResponse.json({ error: 'sectionSlug is required' }, { status: 400 })
  }

  try {
    const row = [
      submittedAt ?? new Date().toISOString(),
      respondent.name,
      respondent.role,
      respondent.token ?? '',
      sectionSlug,
      JSON.stringify(answers ?? {}),
      JSON.stringify(followUps ?? {}),
    ]

    await appendResponseRow(row)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[POST /api/responses]', error)
    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 }
    )
  }
}

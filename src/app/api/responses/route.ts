import { NextRequest, NextResponse } from 'next/server'
import { isPostgresConfigured, insertResponse, markSectionDone } from '@/lib/db'
import { isGoogleSheetsConfigured, appendLocalResponse } from '@/lib/local-store'
import { sendResultsEmail } from '@/lib/email'
import type { SurveyResponse } from '@/types/survey'

export async function POST(request: NextRequest) {
  let body: SurveyResponse

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { respondent, sectionSlug, answers, followUps, submittedAt } = body
  const surveyToken  = body.surveyToken  ?? null
  const isLastSection = body.isLastSection ?? false

  if (!respondent?.name || !respondent?.role) {
    return NextResponse.json(
      { error: 'respondent.name and respondent.role are required' },
      { status: 400 }
    )
  }

  if (!sectionSlug) {
    return NextResponse.json({ error: 'sectionSlug is required' }, { status: 400 })
  }

  const timestamp = submittedAt ?? new Date().toISOString()

  // ── Guard: Vercel without any storage configured ───────────────────────
  // Vercel has a read-only filesystem — CSV fallback won't work there.
  // Detect early and return a clear error rather than a silent crash.
  const onVercel = process.env.VERCEL === '1'
  if (onVercel && !isPostgresConfigured() && !isGoogleSheetsConfigured()) {
    console.error('[POST /api/responses] No storage configured on Vercel. Add POSTGRES_URL or GOOGLE_SERVICE_ACCOUNT_JSON.')
    return NextResponse.json(
      { error: 'Survey storage is not configured on this deployment. Please contact the administrator.' },
      { status: 503 }
    )
  }

  try {
    // ── 1. Vercel Postgres (preferred) ─────────────────────────────────────
    if (isPostgresConfigured()) {
      await insertResponse(
        timestamp,
        respondent.name,
        respondent.role,
        respondent.company ?? '',
        respondent.sector ?? '',
        respondent.companyType ?? '',
        surveyToken ?? respondent.token ?? '',
        sectionSlug,
        answers ?? {},
        followUps ?? {}
      )

      // ── Session tracking (magic-link flow) ───────────────────────────────
      let completed    = false
      let resultsToken: string | null = null
      let emailOk      = true  // optimistic default

      if (surveyToken) {
        try {
          const result = await markSectionDone(surveyToken, sectionSlug, isLastSection)
          if (result) {
            emailOk = result.session.email_sent && !result.session.email_error

            if (result.justCompleted) {
              completed    = true
              resultsToken = result.session.results_token

              // Fire results email without blocking the response
              const { email, name } = result.session
              if (email && resultsToken) {
                sendResultsEmail(email, name ?? undefined, resultsToken)
                  .catch(err => console.error('[responses] Results email failed:', err))
              }
            }
          }
        } catch (err) {
          console.error('[responses] Session tracking failed (non-fatal):', err)
        }
      }

      return NextResponse.json({ ok: true, storage: 'postgres', completed, resultsToken, emailOk })
    }

    // ── 2. Google Sheets ───────────────────────────────────────────────────
    if (isGoogleSheetsConfigured()) {
      const { appendResponseRow } = await import('@/lib/sheets')
      await appendResponseRow([
        timestamp,
        respondent.name,
        respondent.role,
        respondent.token ?? '',
        sectionSlug,
        JSON.stringify(answers ?? {}),
        JSON.stringify(followUps ?? {}),
      ])
      return NextResponse.json({ ok: true, storage: 'sheets' })
    }

    // ── 3. Local CSV fallback ──────────────────────────────────────────────
    appendLocalResponse([
      timestamp,
      respondent.name,
      respondent.role,
      respondent.token ?? '',
      sectionSlug,
      JSON.stringify(answers ?? {}),
      JSON.stringify(followUps ?? {}),
    ])
    return NextResponse.json({ ok: true, storage: 'local-csv' })

  } catch (error) {
    console.error('[POST /api/responses]', error)
    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 }
    )
  }
}

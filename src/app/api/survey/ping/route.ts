/**
 * POST /api/survey/ping
 *
 * Called via navigator.sendBeacon when the user leaves the survey
 * (tab close, navigate away, visibility change to hidden).
 *
 * - Records next_section_slug so the resume email links directly there
 * - Sends a nudge email if the session has an email address and the survey
 *   is incomplete (with a 30-minute cooldown to avoid duplicate sends)
 *
 * No auth required — the survey_token is the secret.
 * sendBeacon sends Content-Type: text/plain, so we parse the body as text.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isPostgresConfigured, getSurveySessionByToken, updateNextSection, updateNudgeSentAt } from '@/lib/db'
import { sendNudgeEmail } from '@/lib/email'

const TOTAL_SECTIONS = 5
// Minimum minutes between nudge emails from the ping endpoint
const NUDGE_COOLDOWN_MINUTES = 30

export async function POST(req: NextRequest) {
  // sendBeacon sends text/plain; fall back gracefully if it's JSON
  let body: { surveyToken?: string; nextSectionSlug?: string; sectionSlug?: string } = {}

  try {
    const text = await req.text()
    if (text) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 })
  }

  const { surveyToken, nextSectionSlug } = body

  if (!surveyToken) {
    return NextResponse.json({ ok: false, error: 'surveyToken required' }, { status: 400 })
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json({ ok: true, note: 'no-db' })
  }

  try {
    const session = await getSurveySessionByToken(surveyToken)
    if (!session || session.completed_at) {
      // Session doesn't exist or survey already complete — nothing to do
      return NextResponse.json({ ok: true })
    }

    // Update next_section_slug so the resume email links directly there
    if (nextSectionSlug) {
      await updateNextSection(surveyToken, nextSectionSlug)
    }

    // Only send nudge if:
    // 1. The session has an email address
    // 2. The survey is not complete
    // 3. We haven't sent a nudge in the last NUDGE_COOLDOWN_MINUTES
    const { email, name, nudge_sent_at, sections_done } = session

    if (!email) return NextResponse.json({ ok: true, note: 'no-email' })

    const cooldownMs = NUDGE_COOLDOWN_MINUTES * 60 * 1000
    const lastNudge  = nudge_sent_at ? new Date(nudge_sent_at).getTime() : 0
    const tooSoon    = Date.now() - lastNudge < cooldownMs

    if (tooSoon) {
      return NextResponse.json({ ok: true, note: 'cooldown' })
    }

    const doneSections = sections_done?.length ?? 0
    // Don't nudge if they haven't even started a section yet (they just came to /start)
    if (doneSections === 0) {
      return NextResponse.json({ ok: true, note: 'not-started' })
    }

    // Send the resume email with a direct link to the next section
    const result = await sendNudgeEmail(
      email,
      name ?? undefined,
      surveyToken,
      doneSections,
      TOTAL_SECTIONS,
      nextSectionSlug ?? session.next_section_slug ?? undefined,
    )

    // Always record the send attempt (prevents double-sending on rapid page closes)
    await updateNudgeSentAt(session.id)

    return NextResponse.json({ ok: true, emailSent: result.sent })
  } catch (err) {
    console.error('[survey/ping]', err)
    // Return 200 so sendBeacon doesn't retry
    return NextResponse.json({ ok: true, note: 'error' })
  }
}

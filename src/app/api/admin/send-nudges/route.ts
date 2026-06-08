import { NextRequest, NextResponse } from 'next/server'
import { isPostgresConfigured, getIncompleteSessions, updateNudgeSentAt } from '@/lib/db'
import { sendNudgeEmail } from '@/lib/email'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'interplay2026'
const TOTAL_SECTIONS = 5

function isAuthorised(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${ADMIN_PASSWORD}`
}

/**
 * POST /api/admin/send-nudges
 * Finds incomplete survey sessions past the cutoff window and sends reminder emails.
 * Requires admin Bearer token auth.
 *
 * Optional body: { cutoffHours?: number, nudgeCooldownDays?: number }
 */
export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let cutoffHours = 48
  let nudgeCooldownDays = 7

  try {
    const body = await req.json()
    if (typeof body.cutoffHours === 'number') cutoffHours = body.cutoffHours
    if (typeof body.nudgeCooldownDays === 'number') nudgeCooldownDays = body.nudgeCooldownDays
  } catch {
    // Body is optional — ignore parse errors
  }

  const sessions = await getIncompleteSessions(cutoffHours, nudgeCooldownDays)

  let sent = 0
  let failed = 0
  const results: Array<{ email: string; name: string | null; sent: boolean; error?: string }> = []

  for (const session of sessions) {
    const doneSections = session.sections_done?.length ?? 0
    const emailResult = await sendNudgeEmail(
      session.email,
      session.name ?? undefined,
      session.survey_token,
      doneSections,
      TOTAL_SECTIONS,
      session.next_section_slug ?? undefined,
    )

    // Always update nudge_sent_at to avoid re-hammering on Resend failure
    await updateNudgeSentAt(session.id)

    if (emailResult.sent) {
      sent++
    } else {
      failed++
    }

    results.push({
      email: session.email,
      name:  session.name,
      sent:  emailResult.sent,
      ...(emailResult.error ? { error: emailResult.error } : {}),
    })
  }

  return NextResponse.json({ ok: true, sent, failed, total: sessions.length, results })
}

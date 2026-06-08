import { NextRequest, NextResponse } from 'next/server'
import {
  isPostgresConfigured,
  insertLead,
  updateLeadEmailStatus,
  createSurveySession,
  updateSessionEmailStatus,
} from '@/lib/db'
import { sendLeadConfirmation, sendSurveyStartEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; company?: string; role?: string; source?: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, email, company, role, source } = body

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const trimmedEmail   = email.trim()
  const trimmedName    = name?.trim()
  const trimmedCompany = company?.trim()
  const trimmedRole    = role?.trim()
  const trimmedSource  = source?.trim() || 'landing'

  let leadId: number | null = null
  let surveyToken: string | null = null

  // ── 1. Store lead ───────────────────────────────────────────────────────────
  if (isPostgresConfigured()) {
    try {
      leadId = await insertLead(trimmedEmail, trimmedName, trimmedCompany, trimmedRole, trimmedSource)
    } catch (err) {
      console.error('[leads] DB insert failed:', err)
      // Continue — still try to send the email
    }

    // ── 2. Create survey session + fire magic-link email ──────────────────────
    try {
      const session = await createSurveySession(trimmedEmail, leadId)
      surveyToken = session.survey_token
      const sessionId = session.id

      // Fire email without blocking the response
      sendSurveyStartEmail(trimmedEmail, trimmedName, surveyToken)
        .then(result => updateSessionEmailStatus(sessionId, result.sent, result.error))
        .catch(err => console.error('[leads] Session email tracking failed:', err))
    } catch (err) {
      console.error('[leads] Survey session creation failed:', err)
      // Fall through to legacy confirmation email below
    }
  }

  // ── 3. Fallback: send plain confirmation if no session was created ──────────
  if (!surveyToken) {
    const emailResult = await sendLeadConfirmation(trimmedEmail, trimmedName)

    if (leadId !== null && isPostgresConfigured()) {
      try {
        await updateLeadEmailStatus(leadId, emailResult.sent, emailResult.error)
      } catch (err) {
        console.error('[leads] Email status update failed:', err)
      }
    }

    return NextResponse.json({ ok: true, emailSent: emailResult.sent })
  }

  // ── 4. Return immediately with surveyToken so client can redirect ───────────
  return NextResponse.json({ ok: true, surveyToken })
}

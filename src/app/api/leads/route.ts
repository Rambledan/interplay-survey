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
  let body: {
    name?: string
    email?: string
    company?: string
    role?: string
    source?: string
    startSurvey?: boolean  // true → create session + magic-link email; false → confirmation screen
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, email, company, role, source, startSurvey } = body

  const trimmedEmail   = typeof email === 'string' ? email.trim() : null
  const trimmedName    = name?.trim()
  const trimmedCompany = company?.trim()
  const trimmedRole    = role?.trim()
  const trimmedSource  = source?.trim() || 'landing'

  // Email is required only when startSurvey is true (magic-link needs a destination)
  if (startSurvey && (!trimmedEmail || !trimmedEmail.includes('@'))) {
    return NextResponse.json({ error: 'Valid email required to start survey' }, { status: 400 })
  }

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

    // ── 2. Create survey session + fire magic-link email (only for startSurvey) ─
    if (startSurvey) {
      try {
        const session = await createSurveySession(trimmedEmail!, leadId)
        surveyToken = session.survey_token
        const sessionId = session.id

        // Fire email without blocking the response; update both session AND lead
        // so the admin Leads panel reflects the actual delivery outcome.
        const capturedLeadId = leadId
        sendSurveyStartEmail(trimmedEmail!, trimmedName, surveyToken)
          .then(result => {
            updateSessionEmailStatus(sessionId, result.sent, result.error)
              .catch(err => console.error('[leads] Session email status failed:', err))
            if (capturedLeadId !== null) {
              updateLeadEmailStatus(capturedLeadId, result.sent, result.error)
                .catch(err => console.error('[leads] Lead email status failed:', err))
            }
          })
          .catch(err => console.error('[leads] Survey start email failed:', err))
      } catch (err) {
        console.error('[leads] Survey session creation failed:', err)
        // Fall through to legacy confirmation email below
      }
    }
  }

  // ── 3. For startSurvey flow: return token so client redirects immediately ───
  if (surveyToken) {
    return NextResponse.json({ ok: true, surveyToken })
  }

  // ── 4. Apply-for-assessment flow: send confirmation email if email known ─────
  if (trimmedEmail) {
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

  return NextResponse.json({ ok: true, emailSent: false })
}

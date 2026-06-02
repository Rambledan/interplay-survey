import { NextRequest, NextResponse } from 'next/server'
import { isPostgresConfigured, insertLead, updateLeadEmailStatus } from '@/lib/db'
import { sendLeadConfirmation } from '@/lib/email'

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

  // ── 1. Store lead ───────────────────────────────────────────────────────────
  if (isPostgresConfigured()) {
    try {
      leadId = await insertLead(trimmedEmail, trimmedName, trimmedCompany, trimmedRole, trimmedSource)
    } catch (err) {
      console.error('[leads] DB insert failed:', err)
      // Continue — still try to send the email
    }
  }

  // ── 2. Send confirmation email ──────────────────────────────────────────────
  const emailResult = await sendLeadConfirmation(trimmedEmail, trimmedName)

  // ── 3. Record email delivery status in DB ───────────────────────────────────
  if (leadId !== null && isPostgresConfigured()) {
    try {
      await updateLeadEmailStatus(leadId, emailResult.sent, emailResult.error)
    } catch (err) {
      console.error('[leads] Email status update failed:', err)
    }
  }

  return NextResponse.json({ ok: true, emailSent: emailResult.sent })
}

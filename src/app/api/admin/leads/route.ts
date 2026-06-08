import { NextRequest, NextResponse } from 'next/server'
import { isPostgresConfigured, getAllLeads, getAllSurveySessions, updateLeadEmailStatus } from '@/lib/db'
import { sendLeadConfirmation } from '@/lib/email'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'interplay2026'

function checkAuth(req: NextRequest): boolean {
  const auth  = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  return token === ADMIN_PASSWORD
}

// ── GET — fetch all leads ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isPostgresConfigured()) {
    return NextResponse.json({ leads: [] })
  }

  try {
    const [leads, sessions] = await Promise.all([
      getAllLeads(),
      getAllSurveySessions().catch(() => []),  // non-fatal if table doesn't exist yet
    ])
    return NextResponse.json({ leads, sessions })
  } catch (err) {
    console.error('[admin/leads GET]', err)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

// ── POST — resend confirmation email for a single lead ────────────────────────
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id: number; email: string; name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, email, name } = body
  if (!id || !email) return NextResponse.json({ error: 'id and email required' }, { status: 400 })

  const result = await sendLeadConfirmation(email, name)

  if (isPostgresConfigured()) {
    try {
      await updateLeadEmailStatus(id, result.sent, result.error)
    } catch (err) {
      console.error('[admin/leads POST]', err)
    }
  }

  return NextResponse.json({ ok: true, sent: result.sent, error: result.error })
}

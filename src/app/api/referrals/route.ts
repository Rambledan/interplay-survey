import { NextRequest, NextResponse } from 'next/server'
import { isPostgresConfigured, insertReferrals } from '@/lib/db'

export interface ReferralPayload {
  referrerName: string
  referees: Array<{ name: string; email: string }>
  submittedAt: string
}

export async function POST(request: NextRequest) {
  let body: ReferralPayload

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { referrerName, referees, submittedAt } = body

  if (!referrerName) {
    return NextResponse.json({ error: 'referrerName is required' }, { status: 400 })
  }

  // Filter out empty rows
  const validReferees = (referees ?? []).filter(r => r.name?.trim() && r.email?.trim())

  if (validReferees.length === 0) {
    return NextResponse.json({ ok: true, saved: 0 })
  }

  const timestamp = submittedAt ?? new Date().toISOString()

  try {
    if (isPostgresConfigured()) {
      await insertReferrals(timestamp, referrerName, validReferees)
      return NextResponse.json({ ok: true, saved: validReferees.length, storage: 'postgres' })
    }

    // No storage configured — still succeed (referrals are best-effort)
    return NextResponse.json({ ok: true, saved: 0, storage: 'none' })
  } catch (error) {
    console.error('[POST /api/referrals]', error)
    return NextResponse.json({ error: 'Failed to save referrals' }, { status: 500 })
  }
}

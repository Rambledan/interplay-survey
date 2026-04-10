import { NextRequest, NextResponse } from 'next/server'
import {
  createRespondentToken,
  listTokensForRespondent,
  revokeRespondentToken,
} from '@/lib/db'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'interplay2026'

function isAuthorised(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  return token === ADMIN_PASSWORD
}

// GET /api/admin/tokens?respondent=<name>  → list active tokens for respondent
export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const respondent = searchParams.get('respondent')

  if (!respondent?.trim()) {
    return NextResponse.json({ error: 'Missing respondent parameter' }, { status: 400 })
  }

  try {
    const tokens = await listTokensForRespondent(respondent)
    return NextResponse.json({ tokens })
  } catch (error) {
    console.error('[GET /api/admin/tokens]', error)
    return NextResponse.json({ error: 'Failed to list tokens' }, { status: 500 })
  }
}

// POST /api/admin/tokens  body: { respondentName }  → create new token
export async function POST(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: { respondentName?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.respondentName?.trim()) {
    return NextResponse.json({ error: 'respondentName is required' }, { status: 400 })
  }

  try {
    const tokenRow = await createRespondentToken(body.respondentName)
    return NextResponse.json({ token: tokenRow })
  } catch (error) {
    console.error('[POST /api/admin/tokens]', error)
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }
}

// DELETE /api/admin/tokens?token=<token>  → revoke token
export async function DELETE(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token?.trim()) {
    return NextResponse.json({ error: 'Missing token parameter' }, { status: 400 })
  }

  try {
    const revoked = await revokeRespondentToken(token)
    return NextResponse.json({ ok: true, revoked })
  } catch (error) {
    console.error('[DELETE /api/admin/tokens]', error)
    return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 })
  }
}

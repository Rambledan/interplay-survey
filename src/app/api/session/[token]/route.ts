import { NextRequest, NextResponse } from 'next/server'
import { isPostgresConfigured, getSurveySessionByToken, updateSurveySessionProfile } from '@/lib/db'

interface RouteContext {
  params: Promise<{ token: string }>
}

/**
 * GET /api/session/[token]
 * Returns session data for pre-populating the /start form.
 * The token itself is the auth secret — no additional auth required.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { token } = await params

  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  const session = await getSurveySessionByToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({
    session: {
      email:         session.email,   // returned so /start can pre-fill the email field
      name:          session.name,
      role:          session.role,
      company:       session.company,
      sector:        session.sector,
      companyType:   session.company_type,
      sectionsDone:  session.sections_done ?? [],
      isComplete:    !!session.completed_at,
      resultsToken:  session.results_token,
      emailOk:       session.email_sent && !session.email_error,
    },
  })
}

/**
 * PUT /api/session/[token]
 * Persist the respondent profile from the /start form to the survey session.
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { token } = await params

  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 503 })
  }

  let body: { name?: string; role?: string; company?: string; sector?: string; companyType?: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, role, company, sector, companyType } = body

  if (!name?.trim() || !role?.trim()) {
    return NextResponse.json({ error: 'name and role are required' }, { status: 400 })
  }

  const updated = await updateSurveySessionProfile(token, {
    name:        name.trim(),
    role:        role.trim(),
    company:     company?.trim() ?? '',
    sector:      sector?.trim() ?? '',
    companyType: companyType?.trim() ?? '',
  })

  if (!updated) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

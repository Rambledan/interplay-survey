import { NextRequest, NextResponse } from 'next/server'
import {
  getGlobalTemplate,
  saveGlobalTemplate,
  getRespondentOverride,
  saveRespondentOverride,
  isPostgresConfigured,
} from '@/lib/db'
import { getDefaultTemplate, mergeWithDefaults } from '@/lib/report-defaults'
import type { ReportTemplateContent, ReportOverrideContent } from '@/lib/report-defaults'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'interplay2026'

function isAuthorised(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  return token === ADMIN_PASSWORD
}

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: 'Postgres not configured' }, { status: 501 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const name = searchParams.get('name')

  try {
    if (type === 'global') {
      const saved = await getGlobalTemplate()
      const defaults = getDefaultTemplate()
      // Return effective template (defaults merged with any saved overrides)
      const effective = mergeWithDefaults(defaults, saved)
      return NextResponse.json({ template: effective })
    }

    if (type === 'respondent') {
      if (!name?.trim()) {
        return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 })
      }
      const override = await getRespondentOverride(name)
      return NextResponse.json({ override: override ?? { sections: {} } })
    }

    return NextResponse.json({ error: 'Missing or invalid type parameter' }, { status: 400 })
  } catch (error) {
    console.error('[GET /api/admin/report-cms]', error)
    return NextResponse.json({ error: 'Failed to load CMS data' }, { status: 500 })
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json({ error: 'Postgres not configured' }, { status: 501 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    if (body.type === 'global') {
      const content = body.content as ReportTemplateContent
      if (!content) {
        return NextResponse.json({ error: 'Missing content' }, { status: 400 })
      }
      await saveGlobalTemplate(content)
      return NextResponse.json({ ok: true })
    }

    if (body.type === 'respondent') {
      const { name, content } = body as { name: string; content: ReportOverrideContent }
      if (!name?.trim()) {
        return NextResponse.json({ error: 'Missing name' }, { status: 400 })
      }
      await saveRespondentOverride(name, content ?? { sections: {} })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (error) {
    console.error('[PATCH /api/admin/report-cms]', error)
    return NextResponse.json({ error: 'Failed to save CMS data' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { isPostgresConfigured, getAllResponses, rowsToCsv } from '@/lib/db'

const RESPONSES_PATH = path.join(process.cwd(), 'data', 'responses.csv')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'interplay2026'

const EMPTY_CSV = 'timestamp,respondent_name,respondent_role,token,section_slug,answers_json,follow_ups_json\n'

const CSV_HEADERS = {
  'Content-Type': 'text/csv',
  'Content-Disposition': 'attachment; filename="interplay-responses.csv"',
}

export async function GET(request: NextRequest) {
  // Password via query param so window.open() download links work
  const token = request.nextUrl.searchParams.get('token') ?? ''

  if (token !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // ── Postgres export ──────────────────────────────────────────────────────
  if (isPostgresConfigured()) {
    const rows = await getAllResponses()
    const csv = rows.length === 0 ? EMPTY_CSV : rowsToCsv(rows)
    return new NextResponse(csv, { headers: CSV_HEADERS })
  }

  // ── CSV file export ──────────────────────────────────────────────────────
  if (!fs.existsSync(RESPONSES_PATH)) {
    return new NextResponse(EMPTY_CSV, { headers: CSV_HEADERS })
  }

  const csv = fs.readFileSync(RESPONSES_PATH, 'utf8')
  return new NextResponse(csv, { headers: CSV_HEADERS })
}

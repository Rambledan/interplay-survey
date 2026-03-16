import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const RESPONSES_PATH = path.join(process.cwd(), 'data', 'responses.csv')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'interplay2026'

export async function GET(request: NextRequest) {
  // Accept password via query param (used for window.open download link)
  const token = request.nextUrl.searchParams.get('token') ?? ''

  if (token !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!fs.existsSync(RESPONSES_PATH)) {
    // Return an empty CSV with headers rather than a 404
    const empty = 'timestamp,respondent_name,respondent_role,token,section_slug,answers_json,follow_ups_json\n'
    return new NextResponse(empty, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="interplay-responses.csv"',
      },
    })
  }

  const csv = fs.readFileSync(RESPONSES_PATH, 'utf8')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="interplay-responses.csv"',
    },
  })
}

import { NextResponse } from 'next/server'
import { isGoogleSheetsConfigured, getLocalQuestions } from '@/lib/local-store'
import type { SurveySection } from '@/types/survey'

// Simple in-memory cache to avoid hammering the Sheets API
let cache: { sections: SurveySection[]; timestamp: number } | null = null
const CACHE_TTL_MS = process.env.NODE_ENV === 'development' ? 60_000 : 5 * 60_000

export async function GET() {
  try {
    // ── Local fallback (no Google credentials) ─────────────────────────────
    if (!isGoogleSheetsConfigured()) {
      const sections = getLocalQuestions()
      return NextResponse.json({ sections, source: 'local' })
    }

    // ── Google Sheets (lazy import to avoid breaking build without creds) ──
    const now = Date.now()

    if (cache && now - cache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ sections: cache.sections, source: 'sheets-cache' })
    }

    const { getQuestionsRows } = await import('@/lib/sheets')
    const { parseQuestions } = await import('@/lib/parse-questions')

    const rows = await getQuestionsRows()
    const sections = parseQuestions(rows)

    cache = { sections, timestamp: now }

    return NextResponse.json({ sections, source: 'sheets' })
  } catch (error) {
    console.error('[GET /api/questions]', error)
    return NextResponse.json(
      { error: 'Failed to load questions' },
      { status: 500 }
    )
  }
}

// Exported for testing
export function resetCache() {
  cache = null
}

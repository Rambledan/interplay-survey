import { NextResponse } from 'next/server'
import { getQuestionsRows } from '@/lib/sheets'
import { parseQuestions } from '@/lib/parse-questions'
import type { SurveySection } from '@/types/survey'

// Simple in-memory cache to avoid hammering the Sheets API
let cache: { sections: SurveySection[]; timestamp: number } | null = null
const CACHE_TTL_MS = process.env.NODE_ENV === 'development' ? 60_000 : 5 * 60_000

export async function GET() {
  try {
    const now = Date.now()

    if (cache && now - cache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ sections: cache.sections })
    }

    const rows = await getQuestionsRows()
    const sections = parseQuestions(rows)

    cache = { sections, timestamp: now }

    return NextResponse.json({ sections })
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

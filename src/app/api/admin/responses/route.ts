import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import questionsData from '../../../../../data/questions.json'
import { parseCsv } from '@/lib/parse-csv'
import { isPostgresConfigured, getAllResponses } from '@/lib/db'
import type { SurveySection, Question } from '@/types/survey'
import type { DbRow } from '@/lib/db'

const RESPONSES_PATH = path.join(process.cwd(), 'data', 'responses.csv')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'interplay2026'

// ── Index question data from JSON ──────────────────────────────────────────
const questionMap = new Map<string, Question & { sectionSlug: string; sectionName: string }>()
const sectionNames = new Map<string, string>()

for (const section of questionsData as SurveySection[]) {
  sectionNames.set(section.slug, section.name)
  for (const q of section.questions) {
    questionMap.set(q.id, { ...q, sectionSlug: section.slug, sectionName: section.name })
  }
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface AnswerEntry {
  questionId: string
  questionText: string
  type: string
  answer: string
  followUp: string
}

export interface ResponseEntry {
  id: string
  timestamp: string
  respondentName: string
  respondentRole: string
  sectionSlug: string
  sectionName: string
  answers: AnswerEntry[]
}

export interface AdminStats {
  total: number
  uniqueRespondents: number
  lastSubmission: string | null
  bySection: Record<string, number>
}

// ── Shared helpers ─────────────────────────────────────────────────────────

/** Maps a flat answers record to annotated AnswerEntry[] using questions.json */
function buildAnswerEntries(
  answersMap: Record<string, string>,
  followUpsMap: Record<string, string>
): AnswerEntry[] {
  return Object.entries(answersMap).map(([qId, answer]) => {
    const qMeta = questionMap.get(qId)
    return {
      questionId: qId,
      questionText: qMeta?.text ?? qId,
      type: qMeta?.type ?? 'unknown',
      answer: answer ?? '',
      followUp: followUpsMap[qId] ?? '',
    }
  })
}

function buildStats(responses: ResponseEntry[]): AdminStats {
  const uniqueRespondents = new Set(responses.map(r => r.respondentName.toLowerCase())).size
  const bySection: Record<string, number> = {}
  for (const r of responses) {
    bySection[r.sectionSlug] = (bySection[r.sectionSlug] ?? 0) + 1
  }
  return {
    total: responses.length,
    uniqueRespondents,
    lastSubmission: responses[0]?.timestamp ?? null,
    bySection,
  }
}

// ── Auth helper ────────────────────────────────────────────────────────────
function isAuthorised(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  return token === ADMIN_PASSWORD
}

// ── Postgres reader ────────────────────────────────────────────────────────
async function getResponsesFromPostgres(): Promise<ResponseEntry[]> {
  const rows: DbRow[] = await getAllResponses()

  return rows.map((row, i) => ({
    id: String(row.id ?? i),
    timestamp: row.submitted_at ?? '',
    respondentName: row.respondent_name ?? '',
    respondentRole: row.respondent_role ?? '',
    sectionSlug: row.section_slug ?? '',
    sectionName: sectionNames.get(row.section_slug) ?? row.section_slug ?? '',
    answers: buildAnswerEntries(
      (row.answers as Record<string, string>) ?? {},
      (row.follow_ups as Record<string, string>) ?? {}
    ),
  }))
}

// ── CSV reader ─────────────────────────────────────────────────────────────
function getResponsesFromCsv(): ResponseEntry[] {
  if (!fs.existsSync(RESPONSES_PATH)) return []

  const raw = fs.readFileSync(RESPONSES_PATH, 'utf8')
  const rows = parseCsv(raw)
  if (rows.length === 0) return []

  const dataRows = rows[0][0] === 'timestamp' ? rows.slice(1) : rows

  return dataRows.map((row, i) => {
    const [timestamp, respondentName, respondentRole, , sectionSlug, answersJson, followUpsJson] = row

    let answersMap: Record<string, string> = {}
    let followUpsMap: Record<string, string> = {}
    try { answersMap = JSON.parse(answersJson ?? '{}') } catch { /* malformed */ }
    try { followUpsMap = JSON.parse(followUpsJson ?? '{}') } catch { /* malformed */ }

    return {
      id: String(i),
      timestamp: timestamp ?? '',
      respondentName: respondentName ?? '',
      respondentRole: respondentRole ?? '',
      sectionSlug: sectionSlug ?? '',
      sectionName: sectionNames.get(sectionSlug) ?? sectionSlug ?? '',
      answers: buildAnswerEntries(answersMap, followUpsMap),
    }
  })
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const empty = {
    responses: [],
    stats: { total: 0, uniqueRespondents: 0, lastSubmission: null, bySection: {} },
  }

  try {
    const responses = isPostgresConfigured()
      ? await getResponsesFromPostgres()
      : getResponsesFromCsv()

    if (responses.length === 0) {
      return NextResponse.json({ ...empty, source: isPostgresConfigured() ? 'postgres' : 'csv' })
    }

    return NextResponse.json({
      responses,
      stats: buildStats(responses),
      source: isPostgresConfigured() ? 'postgres' : 'csv',
    })
  } catch (error) {
    console.error('[GET /api/admin/responses]', error)
    return NextResponse.json({ error: 'Failed to load responses' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import questionsData from '../../../../../data/questions.json'
import { parseCsv } from '@/lib/parse-csv'
import type { SurveySection, Question } from '@/types/survey'

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

// ── Auth helper ────────────────────────────────────────────────────────────
function isAuthorised(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  return token === ADMIN_PASSWORD
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // No responses file yet
  if (!fs.existsSync(RESPONSES_PATH)) {
    return NextResponse.json({
      responses: [],
      stats: { total: 0, uniqueRespondents: 0, lastSubmission: null, bySection: {} },
    })
  }

  const raw = fs.readFileSync(RESPONSES_PATH, 'utf8')
  const rows = parseCsv(raw)

  if (rows.length === 0) {
    return NextResponse.json({
      responses: [],
      stats: { total: 0, uniqueRespondents: 0, lastSubmission: null, bySection: {} },
    })
  }

  // Skip header row
  const dataRows = rows[0][0] === 'timestamp' ? rows.slice(1) : rows

  const responses: ResponseEntry[] = dataRows.map((row, i) => {
    const [timestamp, respondentName, respondentRole, , sectionSlug, answersJson, followUpsJson] = row

    let answersMap: Record<string, string> = {}
    let followUpsMap: Record<string, string> = {}

    try { answersMap = JSON.parse(answersJson ?? '{}') } catch { /* malformed row */ }
    try { followUpsMap = JSON.parse(followUpsJson ?? '{}') } catch { /* malformed row */ }

    // Build per-question answer entries
    const answers: AnswerEntry[] = Object.entries(answersMap).map(([qId, answer]) => {
      const qMeta = questionMap.get(qId)
      return {
        questionId: qId,
        questionText: qMeta?.text ?? qId,
        type: qMeta?.type ?? 'unknown',
        answer: answer ?? '',
        followUp: followUpsMap[qId] ?? '',
      }
    })

    return {
      id: String(i),
      timestamp: timestamp ?? '',
      respondentName: respondentName ?? '',
      respondentRole: respondentRole ?? '',
      sectionSlug: sectionSlug ?? '',
      sectionName: sectionNames.get(sectionSlug) ?? sectionSlug ?? '',
      answers,
    }
  })

  // Sort newest first
  responses.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  // Build stats
  const uniqueRespondents = new Set(responses.map(r => r.respondentName.toLowerCase())).size
  const bySection: Record<string, number> = {}
  for (const r of responses) {
    bySection[r.sectionSlug] = (bySection[r.sectionSlug] ?? 0) + 1
  }

  const stats: AdminStats = {
    total: responses.length,
    uniqueRespondents,
    lastSubmission: responses[0]?.timestamp ?? null,
    bySection,
  }

  return NextResponse.json({ responses, stats })
}

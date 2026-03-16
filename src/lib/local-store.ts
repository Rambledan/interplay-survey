/**
 * local-store.ts
 *
 * Fallback storage layer used when Google Sheets is not configured.
 * - Questions are read from data/questions.json (edit this file as your CMS)
 * - Responses are appended to data/responses.csv (auto-created on first submission)
 */

import fs from 'fs'
import path from 'path'
import questionsData from '../../data/questions.json'
import type { SurveySection } from '@/types/survey'

const DATA_DIR = path.join(process.cwd(), 'data')
const RESPONSES_PATH = path.join(DATA_DIR, 'responses.csv')

const CSV_HEADERS = [
  'timestamp',
  'respondent_name',
  'respondent_role',
  'token',
  'section_slug',
  'answers_json',
  'follow_ups_json',
]

/**
 * Returns the hardcoded questions from data/questions.json.
 * Edit that file to update the survey without touching code.
 */
export function getLocalQuestions(): SurveySection[] {
  return questionsData as SurveySection[]
}

/**
 * Wraps a CSV field value in quotes if it contains commas, quotes, or newlines.
 */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Appends a single response row to data/responses.csv.
 * Creates the file and writes the header row if the file doesn't exist yet.
 * Throws a clear Error (rather than a raw fs exception) if the write fails —
 * e.g. on Vercel where the filesystem is read-only.
 */
export function appendLocalResponse(row: string[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    const needsHeader = !fs.existsSync(RESPONSES_PATH) || fs.statSync(RESPONSES_PATH).size === 0

    if (needsHeader) {
      fs.writeFileSync(RESPONSES_PATH, CSV_HEADERS.map(escapeCsv).join(',') + '\n', 'utf8')
    }

    const csvRow = row.map(escapeCsv).join(',') + '\n'
    fs.appendFileSync(RESPONSES_PATH, csvRow, 'utf8')
  } catch (err) {
    throw new Error(
      `CSV write failed — this usually means the filesystem is read-only (e.g. Vercel). ` +
      `Configure POSTGRES_URL or GOOGLE_SERVICE_ACCOUNT_JSON instead. ` +
      `Original error: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/**
 * Returns true when Google Sheets credentials are properly configured.
 * Used by API routes to decide which storage backend to use.
 */
export function isGoogleSheetsConfigured(): boolean {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  return (
    typeof key === 'string' &&
    key.length > 0 &&
    key !== 'PASTE_YOUR_SERVICE_ACCOUNT_JSON_HERE' &&
    key.includes('"type"')
  )
}

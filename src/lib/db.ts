/**
 * db.ts
 *
 * Vercel Postgres storage layer.
 * Used when POSTGRES_URL is set; CSV is used as the local fallback.
 *
 * Schema uses JSONB for answers so future analytics queries can filter
 * on individual question IDs without unpacking strings in application code.
 */

import { sql } from '@vercel/postgres'

// ── Config check ────────────────────────────────────────────────────────────

export function isPostgresConfigured(): boolean {
  return !!process.env.POSTGRES_URL
}

// ── Schema ──────────────────────────────────────────────────────────────────

/**
 * Creates the responses table and indexes if they don't already exist.
 * Safe to call on every request — Postgres no-ops when objects exist.
 */
export async function ensureTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS responses (
      id            SERIAL       PRIMARY KEY,
      submitted_at  TIMESTAMPTZ  NOT NULL,
      respondent_name TEXT       NOT NULL,
      respondent_role TEXT       NOT NULL,
      token         TEXT         NOT NULL DEFAULT '',
      section_slug  TEXT         NOT NULL,
      answers       JSONB        NOT NULL DEFAULT '{}',
      follow_ups    JSONB        NOT NULL DEFAULT '{}',
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_responses_submitted_at
    ON responses (submitted_at DESC)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_responses_section_slug
    ON responses (section_slug)
  `
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface DbRow {
  id: number
  submitted_at: string
  respondent_name: string
  respondent_role: string
  token: string
  section_slug: string
  answers: Record<string, string>
  follow_ups: Record<string, string>
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Inserts one survey section submission into the responses table. */
export async function insertResponse(
  submittedAt: string,
  respondentName: string,
  respondentRole: string,
  token: string,
  sectionSlug: string,
  answers: Record<string, string>,
  followUps: Record<string, string>
): Promise<void> {
  await ensureTable()

  const answersJson  = JSON.stringify(answers)
  const followUpsJson = JSON.stringify(followUps)

  await sql`
    INSERT INTO responses
      (submitted_at, respondent_name, respondent_role, token, section_slug, answers, follow_ups)
    VALUES
      (
        ${submittedAt}::timestamptz,
        ${respondentName},
        ${respondentRole},
        ${token},
        ${sectionSlug},
        ${answersJson}::jsonb,
        ${followUpsJson}::jsonb
      )
  `
}

/** Returns all response rows ordered newest-first. */
export async function getAllResponses(): Promise<DbRow[]> {
  await ensureTable()

  const result = await sql<DbRow>`
    SELECT
      id,
      submitted_at,
      respondent_name,
      respondent_role,
      token,
      section_slug,
      answers,
      follow_ups
    FROM responses
    ORDER BY submitted_at DESC
  `

  return result.rows
}

/**
 * Serialises DB rows to CSV text (matching the local responses.csv format)
 * so the export endpoint works regardless of storage backend.
 */
export function rowsToCsv(rows: DbRow[]): string {
  const escape = (v: string) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const header = 'timestamp,respondent_name,respondent_role,token,section_slug,answers_json,follow_ups_json'

  const lines = rows.map(r =>
    [
      r.submitted_at,
      r.respondent_name,
      r.respondent_role,
      r.token,
      r.section_slug,
      JSON.stringify(r.answers),
      JSON.stringify(r.follow_ups),
    ]
      .map(escape)
      .join(',')
  )

  return [header, ...lines].join('\n') + '\n'
}

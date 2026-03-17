/**
 * db.ts
 *
 * Postgres storage layer using the standard `pg` driver.
 * Works with any Postgres provider (Supabase, Neon, Railway, etc.).
 *
 * Connection priority:
 *   POSTGRES_URL  →  INTERPLAY_SURVEY_POSTGRES_URL_NON_POOLING  →  INTERPLAY_SURVEY_POSTGRES_URL
 *
 * Schema uses JSONB for answers so future analytics queries can filter
 * on individual question IDs without unpacking strings in application code.
 */

import { Client } from 'pg'

// ── Connection string ────────────────────────────────────────────────────────

function getConnectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL ||
    process.env.INTERPLAY_SURVEY_POSTGRES_URL_NON_POOLING ||
    process.env.INTERPLAY_SURVEY_POSTGRES_URL
  )
}

export function isPostgresConfigured(): boolean {
  return !!getConnectionString()
}

// ── Client factory ────────────────────────────────────────────────────────────
// Creates a fresh client per request — safe for serverless environments.

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const raw = getConnectionString() ?? ''

  // Strip sslmode from the URL — pg parses it and overrides the ssl option
  // we set below. Supabase self-signs its cert so rejectUnauthorized must be false.
  const connectionString = raw
    .replace(/[?&]sslmode=[^&]+/, m => (m.startsWith('?') ? '?' : ''))
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()

  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

// ── Schema ───────────────────────────────────────────────────────────────────

export async function ensureTable(): Promise<void> {
  await withClient(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS responses (
        id                  SERIAL       PRIMARY KEY,
        submitted_at        TIMESTAMPTZ  NOT NULL,
        respondent_name     TEXT         NOT NULL,
        respondent_role     TEXT         NOT NULL,
        respondent_company  TEXT         NOT NULL DEFAULT '',
        respondent_sector   TEXT         NOT NULL DEFAULT '',
        respondent_type     TEXT         NOT NULL DEFAULT '',
        token               TEXT         NOT NULL DEFAULT '',
        section_slug        TEXT         NOT NULL,
        answers             JSONB        NOT NULL DEFAULT '{}',
        follow_ups          JSONB        NOT NULL DEFAULT '{}',
        created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `)
    // Add new columns to existing tables (safe to run repeatedly)
    await client.query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS respondent_company TEXT NOT NULL DEFAULT ''`)
    await client.query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS respondent_sector  TEXT NOT NULL DEFAULT ''`)
    await client.query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS respondent_type    TEXT NOT NULL DEFAULT ''`)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_responses_submitted_at
      ON responses (submitted_at DESC)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_responses_section_slug
      ON responses (section_slug)
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id            SERIAL       PRIMARY KEY,
        submitted_at  TIMESTAMPTZ  NOT NULL,
        referrer_name TEXT         NOT NULL,
        referee_name  TEXT         NOT NULL,
        referee_email TEXT         NOT NULL,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `)
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DbRow {
  id: number
  submitted_at: string
  respondent_name: string
  respondent_role: string
  respondent_company: string
  respondent_sector: string
  respondent_type: string
  token: string
  section_slug: string
  answers: Record<string, string>
  follow_ups: Record<string, string>
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function insertResponse(
  submittedAt: string,
  respondentName: string,
  respondentRole: string,
  respondentCompany: string,
  respondentSector: string,
  respondentType: string,
  token: string,
  sectionSlug: string,
  answers: Record<string, string>,
  followUps: Record<string, string>
): Promise<void> {
  await ensureTable()

  await withClient(async (client) => {
    await client.query(
      `INSERT INTO responses
         (submitted_at, respondent_name, respondent_role, respondent_company, respondent_sector,
          respondent_type, token, section_slug, answers, follow_ups)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)`,
      [
        submittedAt,
        respondentName,
        respondentRole,
        respondentCompany,
        respondentSector,
        respondentType,
        token,
        sectionSlug,
        JSON.stringify(answers),
        JSON.stringify(followUps),
      ]
    )
  })
}

export async function insertReferrals(
  submittedAt: string,
  referrerName: string,
  referees: Array<{ name: string; email: string }>
): Promise<void> {
  await ensureTable()

  if (referees.length === 0) return

  await withClient(async (client) => {
    for (const r of referees) {
      await client.query(
        `INSERT INTO referrals (submitted_at, referrer_name, referee_name, referee_email)
         VALUES ($1, $2, $3, $4)`,
        [submittedAt, referrerName, r.name, r.email]
      )
    }
  })
}

export async function deleteResponsesByRespondent(name: string): Promise<number> {
  await ensureTable()

  return withClient(async (client) => {
    const result = await client.query(
      `DELETE FROM responses WHERE LOWER(respondent_name) = LOWER($1)`,
      [name]
    )
    return result.rowCount ?? 0
  })
}

export async function getAllResponses(): Promise<DbRow[]> {
  await ensureTable()

  return withClient(async (client) => {
    const result = await client.query<DbRow>(`
      SELECT id, submitted_at, respondent_name, respondent_role,
             respondent_company, respondent_sector, respondent_type,
             token, section_slug, answers, follow_ups
      FROM responses
      ORDER BY submitted_at DESC
    `)
    return result.rows
  })
}

// ── CSV export helper ─────────────────────────────────────────────────────────

export function rowsToCsv(rows: DbRow[]): string {
  const escape = (v: string) => {
    const s = String(v ?? '')
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

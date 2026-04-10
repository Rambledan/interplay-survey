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
    await client.query(`
      CREATE TABLE IF NOT EXISTS respondent_tokens (
        id              SERIAL       PRIMARY KEY,
        token           TEXT         NOT NULL UNIQUE,
        respondent_name TEXT         NOT NULL,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        revoked_at      TIMESTAMPTZ  NULL
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_respondent_tokens_name
      ON respondent_tokens (LOWER(respondent_name))
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

export async function updateRespondentProfile(
  oldName: string,
  profile: { name: string; role: string; company: string; sector: string; type: string }
): Promise<number> {
  return withClient(async (client) => {
    const result = await client.query(
      `UPDATE responses SET
         respondent_name    = $1,
         respondent_role    = $2,
         respondent_company = $3,
         respondent_sector  = $4,
         respondent_type    = $5
       WHERE LOWER(respondent_name) = LOWER($6)`,
      [profile.name, profile.role, profile.company, profile.sector, profile.type, oldName]
    )
    // Keep token table in sync if name changed
    await client.query(
      `UPDATE respondent_tokens SET respondent_name = $1 WHERE LOWER(respondent_name) = LOWER($2)`,
      [profile.name, oldName]
    )
    return result.rowCount ?? 0
  })
}

export async function updateRowAnswers(
  id: number,
  answers: Record<string, string>,
  followUps: Record<string, string>
): Promise<boolean> {
  return withClient(async (client) => {
    const result = await client.query(
      `UPDATE responses SET answers = $1::jsonb, follow_ups = $2::jsonb WHERE id = $3`,
      [JSON.stringify(answers), JSON.stringify(followUps), id]
    )
    return (result.rowCount ?? 0) > 0
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

export async function deleteResponseById(id: number): Promise<boolean> {
  return withClient(async (client) => {
    const result = await client.query(
      `DELETE FROM responses WHERE id = $1`,
      [id]
    )
    return (result.rowCount ?? 0) > 0
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

// ── Token CRUD ────────────────────────────────────────────────────────────────

import { randomBytes } from 'crypto'

export interface TokenRow {
  id: number
  token: string
  respondent_name: string
  created_at: string
  revoked_at: string | null
}

export async function createRespondentToken(respondentName: string): Promise<TokenRow> {
  await ensureTable()
  const token = randomBytes(20).toString('hex')  // 40-char hex

  return withClient(async (client) => {
    const result = await client.query<TokenRow>(
      `INSERT INTO respondent_tokens (token, respondent_name)
       VALUES ($1, $2)
       RETURNING id, token, respondent_name, created_at, revoked_at`,
      [token, respondentName]
    )
    return result.rows[0]
  })
}

export async function listTokensForRespondent(respondentName: string): Promise<TokenRow[]> {
  await ensureTable()

  return withClient(async (client) => {
    const result = await client.query<TokenRow>(
      `SELECT id, token, respondent_name, created_at, revoked_at
       FROM respondent_tokens
       WHERE LOWER(respondent_name) = LOWER($1)
       ORDER BY created_at DESC`,
      [respondentName]
    )
    return result.rows
  })
}

export async function getRespondentToken(token: string): Promise<TokenRow | null> {
  await ensureTable()

  return withClient(async (client) => {
    const result = await client.query<TokenRow>(
      `SELECT id, token, respondent_name, created_at, revoked_at
       FROM respondent_tokens
       WHERE token = $1 AND revoked_at IS NULL`,
      [token]
    )
    return result.rows[0] ?? null
  })
}

export async function revokeRespondentToken(token: string): Promise<boolean> {
  await ensureTable()

  return withClient(async (client) => {
    const result = await client.query(
      `UPDATE respondent_tokens SET revoked_at = NOW()
       WHERE token = $1 AND revoked_at IS NULL`,
      [token]
    )
    return (result.rowCount ?? 0) > 0
  })
}

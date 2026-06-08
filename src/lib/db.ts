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
    // ── Report CMS tables ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_templates (
        id         SERIAL      PRIMARY KEY,
        key        TEXT        NOT NULL UNIQUE,
        content    JSONB       NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_overrides (
        id              SERIAL       PRIMARY KEY,
        respondent_name TEXT         NOT NULL UNIQUE,
        content         JSONB        NOT NULL DEFAULT '{}',
        updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_report_overrides_name
      ON report_overrides (LOWER(respondent_name))
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

export interface ReferralRow {
  id: number
  submitted_at: string
  referrer_name: string
  referee_name: string
  referee_email: string
}

export async function getAllReferrals(): Promise<ReferralRow[]> {
  await ensureTable()

  return withClient(async (client) => {
    const result = await client.query<ReferralRow>(`
      SELECT id, submitted_at, referrer_name, referee_name, referee_email
      FROM referrals
      ORDER BY submitted_at DESC
    `)
    return result.rows
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

// ── Report CMS ────────────────────────────────────────────────────────────────

import { getDefaultTemplate, mergeWithDefaults } from './report-defaults'
import type { ReportTemplateContent, ReportOverrideContent } from './report-defaults'
export type { ReportTemplateContent, ReportOverrideContent }

export async function getGlobalTemplate(): Promise<ReportTemplateContent> {
  await ensureTable()

  return withClient(async (client) => {
    const result = await client.query(
      `SELECT content FROM report_templates WHERE key = 'global'`
    )
    return (result.rows[0]?.content ?? {}) as ReportTemplateContent
  })
}

export async function saveGlobalTemplate(content: ReportTemplateContent): Promise<void> {
  await ensureTable()

  await withClient(async (client) => {
    await client.query(
      `INSERT INTO report_templates (key, content, updated_at)
       VALUES ('global', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET content = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify(content)]
    )
  })
}

export async function getRespondentOverride(name: string): Promise<ReportOverrideContent | null> {
  await ensureTable()

  return withClient(async (client) => {
    const result = await client.query(
      `SELECT content FROM report_overrides WHERE LOWER(respondent_name) = LOWER($1)`,
      [name]
    )
    return result.rows.length > 0 ? (result.rows[0].content as ReportOverrideContent) : null
  })
}

export async function saveRespondentOverride(
  name: string,
  content: ReportOverrideContent
): Promise<void> {
  await ensureTable()

  await withClient(async (client) => {
    await client.query(
      `INSERT INTO report_overrides (respondent_name, content, updated_at)
       VALUES (LOWER($1), $2::jsonb, NOW())
       ON CONFLICT (respondent_name) DO UPDATE SET content = $2::jsonb, updated_at = NOW()`,
      [name, JSON.stringify(content)]
    )
  })
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export interface LeadRow {
  id: number
  name: string | null
  email: string
  company: string | null
  role: string | null
  source: string
  email_sent: boolean
  email_sent_at: string | null
  email_error: string | null
  created_at: string
}

async function ensureLeadsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id            SERIAL       PRIMARY KEY,
      name          TEXT,
      email         TEXT         NOT NULL,
      company       TEXT,
      role          TEXT,
      source        TEXT         NOT NULL DEFAULT 'landing',
      email_sent    BOOLEAN      NOT NULL DEFAULT FALSE,
      email_sent_at TIMESTAMPTZ,
      email_error   TEXT,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `)
  // Safe migrations for rows created before these columns existed
  await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_sent    BOOLEAN     NOT NULL DEFAULT FALSE`)
  await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ`)
  await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_error   TEXT`)
}

/** Insert a new lead and return its row ID. */
export async function insertLead(
  email: string,
  name?: string,
  company?: string,
  role?: string,
  source = 'landing'
): Promise<number> {
  return withClient(async (client) => {
    await ensureLeadsTable(client)
    const result = await client.query<{ id: number }>(
      `INSERT INTO leads (name, email, company, role, source)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name || null, email, company || null, role || null, source]
    )
    return result.rows[0].id
  })
}

/** Mark whether the confirmation email was delivered. */
export async function updateLeadEmailStatus(
  id: number,
  sent: boolean,
  error?: string
): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      `UPDATE leads
       SET email_sent    = $1,
           email_sent_at = $2,
           email_error   = $3
       WHERE id = $4`,
      [sent, sent ? new Date().toISOString() : null, error ?? null, id]
    )
  })
}

/** Permanently delete a lead by ID. Returns true if a row was deleted. */
export async function deleteLead(id: number): Promise<boolean> {
  return withClient(async (client) => {
    await ensureLeadsTable(client)
    const result = await client.query(
      `DELETE FROM leads WHERE id = $1`,
      [id]
    )
    return (result.rowCount ?? 0) > 0
  })
}

/** Fetch all leads (newest first) for the admin panel. */
export async function getAllLeads(): Promise<LeadRow[]> {
  return withClient(async (client) => {
    await ensureLeadsTable(client)
    const result = await client.query<LeadRow>(`
      SELECT id, name, email, company, role, source,
             email_sent, email_sent_at, email_error, created_at
      FROM leads
      ORDER BY created_at DESC
    `)
    return result.rows
  })
}

/** Convenience: load both global template and respondent override in parallel.
 *  The globalTemplate is merged with hard-coded defaults so callers always get
 *  a fully-populated template even if nothing (or only partial data) is saved. */
export async function getReportContentOverrides(respondentName: string): Promise<{
  globalTemplate: ReportTemplateContent
  respondentOverride: ReportOverrideContent | null
}> {
  const [savedTemplate, respondentOverride] = await Promise.all([
    getGlobalTemplate(),
    getRespondentOverride(respondentName),
  ])
  const globalTemplate = mergeWithDefaults(getDefaultTemplate(), savedTemplate)
  return { globalTemplate, respondentOverride }
}

// ── Survey Sessions ───────────────────────────────────────────────────────────
// Self-serve magic-link flow: email → survey_token → async resume → results_token

export interface SurveySessionRow {
  id: number
  email: string
  name: string | null
  role: string | null
  company: string | null
  sector: string | null
  company_type: string | null
  lead_id: number | null
  survey_token: string
  results_token: string | null
  sections_done: string[]
  email_sent: boolean
  email_error: string | null
  next_section_slug: string | null
  created_at: string
  profile_submitted_at: string | null
  completed_at: string | null
  nudge_sent_at: string | null
}

async function ensureSurveySessionsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS survey_sessions (
      id                    SERIAL        PRIMARY KEY,
      email                 TEXT          NOT NULL,
      name                  TEXT,
      role                  TEXT,
      company               TEXT,
      sector                TEXT,
      company_type          TEXT,
      lead_id               INTEGER       REFERENCES leads(id) ON DELETE SET NULL,
      survey_token          TEXT          NOT NULL UNIQUE,
      results_token         TEXT          UNIQUE,
      sections_done         TEXT[]        NOT NULL DEFAULT '{}',
      email_sent            BOOLEAN       NOT NULL DEFAULT FALSE,
      email_error           TEXT,
      created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      profile_submitted_at  TIMESTAMPTZ,
      completed_at          TIMESTAMPTZ,
      nudge_sent_at         TIMESTAMPTZ
    )
  `)
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_sessions_survey_token
    ON survey_sessions (survey_token)
  `)
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_survey_sessions_email
    ON survey_sessions (LOWER(email))
  `)
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_survey_sessions_results_token
    ON survey_sessions (results_token)
    WHERE results_token IS NOT NULL
  `)
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_survey_sessions_incomplete
    ON survey_sessions (created_at)
    WHERE completed_at IS NULL
  `)
  // Safe migrations
  await client.query(`ALTER TABLE survey_sessions ADD COLUMN IF NOT EXISTS email_sent        BOOLEAN     NOT NULL DEFAULT FALSE`)
  await client.query(`ALTER TABLE survey_sessions ADD COLUMN IF NOT EXISTS email_error       TEXT`)
  await client.query(`ALTER TABLE survey_sessions ADD COLUMN IF NOT EXISTS next_section_slug TEXT`)
}

/** Create a new survey session linked to a lead. Returns the session including its survey_token. */
export async function createSurveySession(
  email: string,
  leadId?: number | null
): Promise<SurveySessionRow> {
  const surveyToken = randomBytes(20).toString('hex')

  return withClient(async (client) => {
    await ensureLeadsTable(client)
    await ensureSurveySessionsTable(client)
    const result = await client.query<SurveySessionRow>(
      `INSERT INTO survey_sessions (email, lead_id, survey_token)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email, leadId ?? null, surveyToken]
    )
    return result.rows[0]
  })
}

/** Look up a session by its survey_token (the magic-link secret). */
export async function getSurveySessionByToken(token: string): Promise<SurveySessionRow | null> {
  return withClient(async (client) => {
    await ensureSurveySessionsTable(client)
    const result = await client.query<SurveySessionRow>(
      `SELECT * FROM survey_sessions WHERE survey_token = $1`,
      [token]
    )
    return result.rows[0] ?? null
  })
}

/** Persist the respondent profile collected on the /start form. */
export async function updateSurveySessionProfile(
  surveyToken: string,
  profile: { name: string; role: string; company: string; sector: string; companyType: string }
): Promise<SurveySessionRow | null> {
  return withClient(async (client) => {
    const result = await client.query<SurveySessionRow>(
      `UPDATE survey_sessions
       SET name = $1, role = $2, company = $3, sector = $4, company_type = $5,
           profile_submitted_at = NOW()
       WHERE survey_token = $6
       RETURNING *`,
      [profile.name, profile.role, profile.company, profile.sector, profile.companyType, surveyToken]
    )
    return result.rows[0] ?? null
  })
}

/** Record whether the start email was delivered (called asynchronously after send). */
export async function updateSessionEmailStatus(
  sessionId: number,
  sent: boolean,
  error?: string
): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      `UPDATE survey_sessions SET email_sent = $1, email_error = $2 WHERE id = $3`,
      [sent, error ?? null, sessionId]
    )
  })
}

/**
 * Mark a section as done and optionally finalise the survey.
 * If isLast is true and the session is not yet complete:
 *   - sets completed_at and generates a results_token
 *   - inserts a matching row in respondent_tokens so /api/results/[token] works
 * Returns null if the session token is not found.
 */
export async function markSectionDone(
  surveyToken: string,
  sectionSlug: string,
  isLast: boolean
): Promise<{ session: SurveySessionRow; justCompleted: boolean } | null> {
  return withClient(async (client) => {
    await ensureSurveySessionsTable(client)

    // Append + deduplicate the section slug
    const updateResult = await client.query<SurveySessionRow>(
      `UPDATE survey_sessions
       SET sections_done = ARRAY(
         SELECT DISTINCT u FROM unnest(array_append(sections_done, $2)) AS u
       )
       WHERE survey_token = $1
       RETURNING *`,
      [surveyToken, sectionSlug]
    )

    if (updateResult.rows.length === 0) return null
    let session = updateResult.rows[0]

    // Finalise if this is the last section and not already completed
    if (isLast && !session.completed_at) {
      const resultsToken = randomBytes(20).toString('hex')

      const completeResult = await client.query<SurveySessionRow>(
        `UPDATE survey_sessions
         SET completed_at = NOW(), results_token = $2
         WHERE survey_token = $1
         RETURNING *`,
        [surveyToken, resultsToken]
      )
      session = completeResult.rows[0]

      // Register in respondent_tokens so the existing results route works unchanged
      if (session.name) {
        try {
          await client.query(
            `INSERT INTO respondent_tokens (token, respondent_name)
             VALUES ($1, $2)
             ON CONFLICT (token) DO NOTHING`,
            [resultsToken, session.name]
          )
        } catch (err) {
          console.error('[db] respondent_tokens insert failed (non-fatal):', err)
        }
      }

      return { session, justCompleted: true }
    }

    return { session, justCompleted: false }
  })
}

/**
 * Record which section is next for a session — stored so the resume email
 * can link directly to that section rather than back to /start.
 * Also marks nudge_sent_at = NULL so the session becomes nudge-eligible again
 * (the user has re-engaged by leaving mid-survey, so the cooldown resets).
 */
export async function updateNextSection(
  surveyToken: string,
  nextSectionSlug: string
): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      `UPDATE survey_sessions
       SET next_section_slug = $2,
           nudge_sent_at     = NULL
       WHERE survey_token = $1
         AND completed_at  IS NULL`,
      [surveyToken, nextSectionSlug]
    )
  })
}

/**
 * Find sessions that are incomplete and eligible for a nudge email.
 * cutoffHours: minimum hours since creation before nudging (default 48)
 * nudgeCooldownDays: minimum days between nudges (default 7)
 */
export async function getIncompleteSessions(
  cutoffHours = 48,
  nudgeCooldownDays = 7
): Promise<SurveySessionRow[]> {
  return withClient(async (client) => {
    await ensureSurveySessionsTable(client)
    const result = await client.query<SurveySessionRow>(
      `SELECT * FROM survey_sessions
       WHERE completed_at IS NULL
         AND email IS NOT NULL
         AND name IS NOT NULL
         AND created_at < NOW() - ($1 || ' hours')::INTERVAL
         AND (
           nudge_sent_at IS NULL
           OR nudge_sent_at < NOW() - ($2 || ' days')::INTERVAL
         )
       ORDER BY created_at ASC`,
      [String(cutoffHours), String(nudgeCooldownDays)]
    )
    return result.rows
  })
}

/** Record that a nudge email was sent for this session. */
export async function updateNudgeSentAt(sessionId: number): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      `UPDATE survey_sessions SET nudge_sent_at = NOW() WHERE id = $1`,
      [sessionId]
    )
  })
}

/** Fetch all survey sessions (newest first) for the admin panel. */
export async function getAllSurveySessions(): Promise<SurveySessionRow[]> {
  return withClient(async (client) => {
    await ensureSurveySessionsTable(client)
    const result = await client.query<SurveySessionRow>(
      `SELECT * FROM survey_sessions ORDER BY created_at DESC`
    )
    return result.rows
  })
}

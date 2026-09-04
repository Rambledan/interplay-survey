/**
 * email.ts
 *
 * Sends transactional emails via Resend.
 *
 * Required env var:
 *   RESEND_API_KEY         — your Resend API key (get one at resend.com)
 *
 * Optional env vars:
 *   RESEND_FROM_EMAIL      — sender address (must be from a verified domain)
 *                           Default: registrations@interplaymethod.com
 *   RESEND_FROM_NAME       — display name
 *                           Default: Interplay Assessment Team
 *   RESEND_NOTIFY_EMAILS   — comma-separated list of addresses to BCC on every
 *                           new registration (e.g. the team's inboxes)
 *                           Default: empty
 *   NEXT_PUBLIC_APP_URL    — base URL for magic links (default: interplaymethod.com)
 */

import { Resend } from 'resend'

const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL    ?? 'registrations@interplaymethod.com'
const FROM_NAME      = process.env.RESEND_FROM_NAME     ?? 'Interplay Assessment Team'
const NOTIFY_EMAILS  = (process.env.RESEND_NOTIFY_EMAILS ?? '')
  .split(',').map(e => e.trim()).filter(Boolean)
const APP_URL        = (
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://interplaymethod.com'
).replace(/\/$/, '')

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] RESEND_API_KEY is not set — email sending is disabled')
    return null
  }
  return new Resend(key)
}

// ── Email templates ───────────────────────────────────────────────────────────

function buildConfirmationHtml(name: string | null, email: string): string {
  const firstName = name?.split(' ')[0] ?? 'there'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>You're registered: Interplay Assessment</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e0;font-family:'Helvetica Neue',Arial,sans-serif;color:#303030">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f0e0">
    <tr>
      <td align="center" style="padding:40px 20px">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:540px">

          <!-- Yellow header band -->
          <tr>
            <td style="background:#FFE600;padding:14px 32px;border-bottom:2px solid #303030">
              <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(48,48,48,0.65)">
                INTERRUPT · The Interplay Assessment
              </p>
            </td>
          </tr>

          <!-- Dark body -->
          <tr>
            <td style="background:#303030;padding:40px 32px 36px">
              <h1 style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:44px;font-weight:900;text-transform:uppercase;line-height:0.88;color:#fff;letter-spacing:-0.02em">
                YOU'RE<br>REGISTERED
              </h1>

              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:rgba(245,240,224,0.78)">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:rgba(245,240,224,0.78)">
                Thanks for registering for the Interplay Assessment. We've received your details and will be in touch shortly to arrange your 30-minute interview.
              </p>

              <!-- What you'll receive box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                style="border-left:3px solid #FFE600;background:rgba(255,255,255,0.05);margin:24px 0 28px">
                <tr>
                  <td style="padding:16px 20px">
                    <p style="margin:0 0 10px;font-family:monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,240,224,0.4)">
                      Your report will include
                    </p>
                    <p style="margin:0 0 7px;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; Your Interplay Score, benchmarked against peers
                    </p>
                    <p style="margin:0 0 7px;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; Pillar-by-pillar analysis across sustainability, brand &amp; business
                    </p>
                    <p style="margin:0 0 7px;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; A quantified financial opportunity, ready for your board
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; Bespoke recommendations and next actions
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:rgba(245,240,224,0.78)">
                We&rsquo;ll follow up at <strong style="color:#fff">${email}</strong> with everything you need to get started.
              </p>

              <!-- Contact row -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                style="border-top:1px solid rgba(245,240,224,0.1);padding-top:24px;margin-top:8px">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-family:monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(245,240,224,0.35)">
                      Questions? Reach us directly
                    </p>
                    <p style="margin:0;font-size:13px;color:rgba(245,240,224,0.6)">
                      Nina Pickup
                      &nbsp;·&nbsp;
                      <a href="mailto:ninapickup@interrupt-sustainability.com"
                        style="color:#FFE600;text-decoration:none">
                        ninapickup@interrupt-sustainability.com
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1e1e1e;padding:14px 32px;border-top:1px solid rgba(245,240,224,0.05)">
              <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(245,240,224,0.22)">
                INTERRUPT &nbsp;&middot;&nbsp; interrupt-sustainability.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface EmailResult {
  sent: boolean
  error?: string
}

/**
 * Send a registration confirmation to the prospective respondent.
 * Also BCCs RESEND_NOTIFY_EMAILS so the team sees every new sign-up.
 * @deprecated Prefer sendSurveyStartEmail for new sessions (includes magic link).
 */
export async function sendLeadConfirmation(
  email: string,
  name?: string,
): Promise<EmailResult> {
  const resend = getResend()
  if (!resend) return { sent: false, error: 'RESEND_API_KEY not configured' }

  try {
    const { error } = await resend.emails.send({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to:      [email],
      ...(NOTIFY_EMAILS.length > 0 ? { bcc: NOTIFY_EMAILS } : {}),
      subject: "You're registered for your Interplay Assessment",
      html:    buildConfirmationHtml(name ?? null, email),
    })

    if (error) return { sent: false, error: error.message }
    return { sent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { sent: false, error: message }
  }
}

// ── Magic-link email templates ────────────────────────────────────────────────

function buildSurveyStartHtml(name: string | null, surveyToken: string): string {
  const firstName = name?.split(' ')[0] ?? 'there'
  const link = `${APP_URL}/start?token=${surveyToken}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Start your Interplay Assessment</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e0;font-family:'Helvetica Neue',Arial,sans-serif;color:#303030">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f0e0">
    <tr>
      <td align="center" style="padding:40px 20px">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:540px">

          <!-- Yellow header band -->
          <tr>
            <td style="background:#FFE600;padding:14px 32px;border-bottom:2px solid #303030">
              <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(48,48,48,0.65)">
                INTERRUPT &middot; The Interplay Assessment
              </p>
            </td>
          </tr>

          <!-- Dark body -->
          <tr>
            <td style="background:#303030;padding:40px 32px 36px">
              <h1 style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:44px;font-weight:900;text-transform:uppercase;line-height:0.88;color:#fff;letter-spacing:-0.02em">
                YOUR<br>ASSESSMENT<br>AWAITS
              </h1>

              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:rgba(245,240,224,0.78)">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:rgba(245,240,224,0.78)">
                Your Interplay Assessment is ready to begin. Click the button below to start the diagnostic. Your progress is saved automatically so you can pick up wherever you leave off.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:#FFE600;border-radius:3px">
                    <a href="${link}"
                       style="display:inline-block;padding:14px 28px;font-family:monospace;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;color:#303030">
                      Begin the diagnostic &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What you'll receive box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                style="border-left:3px solid #FFE600;background:rgba(255,255,255,0.05);margin:32px 0 28px">
                <tr>
                  <td style="padding:16px 20px">
                    <p style="margin:0 0 10px;font-family:monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,240,224,0.4)">
                      Your report will include
                    </p>
                    <p style="margin:0 0 7px;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; Your Interplay Score, benchmarked against peers
                    </p>
                    <p style="margin:0 0 7px;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; Pillar-by-pillar analysis across sustainability, brand &amp; business
                    </p>
                    <p style="margin:0 0 7px;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; A quantified financial opportunity, ready for your board
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; Bespoke recommendations and next actions
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:rgba(245,240,224,0.4)">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 28px;font-size:12px;line-height:1.5;color:rgba(245,240,224,0.35);word-break:break-all">
                ${link}
              </p>

              <!-- Contact row -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                style="border-top:1px solid rgba(245,240,224,0.1);padding-top:24px;margin-top:8px">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-family:monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(245,240,224,0.35)">
                      Questions? Reach us directly
                    </p>
                    <p style="margin:0;font-size:13px;color:rgba(245,240,224,0.6)">
                      Nina Pickup &nbsp;&middot;&nbsp;
                      <a href="mailto:ninapickup@interrupt-sustainability.com" style="color:#FFE600;text-decoration:none">ninapickup@interrupt-sustainability.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1e1e1e;padding:14px 32px;border-top:1px solid rgba(245,240,224,0.05)">
              <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(245,240,224,0.22)">
                INTERRUPT &nbsp;&middot;&nbsp; interrupt-sustainability.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildNudgeHtml(
  name: string | null,
  surveyToken: string,
  doneSections: number,
  totalSections: number,
  nextSectionSlug?: string
): string {
  const firstName = name?.split(' ')[0] ?? 'there'
  // Link directly to the next section if we know it, otherwise fall back to /start
  const link = nextSectionSlug
    ? `${APP_URL}/survey/${nextSectionSlug}?token=${surveyToken}`
    : `${APP_URL}/start?token=${surveyToken}`
  const remaining = totalSections - doneSections

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Complete your Interplay Assessment</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e0;font-family:'Helvetica Neue',Arial,sans-serif;color:#303030">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f0e0">
    <tr>
      <td align="center" style="padding:40px 20px">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:540px">

          <tr>
            <td style="background:#FFE600;padding:14px 32px;border-bottom:2px solid #303030">
              <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(48,48,48,0.65)">
                INTERRUPT &middot; The Interplay Assessment
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#303030;padding:40px 32px 36px">
              <h1 style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:44px;font-weight:900;text-transform:uppercase;line-height:0.88;color:#fff;letter-spacing:-0.02em">
                PICK UP<br>WHERE YOU<br>LEFT OFF
              </h1>

              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:rgba(245,240,224,0.78)">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:rgba(245,240,224,0.78)">
                You've completed <strong style="color:#FFE600">${doneSections} of ${totalSections}</strong> sections of your Interplay Assessment.
                Your answers are saved. ${remaining === 1 ? 'Just one more section to go' : `${remaining} sections remaining`} &mdash; click below to continue.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:#FFE600;border-radius:3px">
                    <a href="${link}"
                       style="display:inline-block;padding:14px 28px;font-family:monospace;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;color:#303030">
                      Continue the diagnostic &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 6px;font-size:13px;line-height:1.5;color:rgba(245,240,224,0.4)">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 28px;font-size:12px;line-height:1.5;color:rgba(245,240,224,0.35);word-break:break-all">
                ${link}
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                style="border-top:1px solid rgba(245,240,224,0.1);padding-top:24px;margin-top:8px">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-family:monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(245,240,224,0.35)">
                      Questions? Reach us directly
                    </p>
                    <p style="margin:0;font-size:13px;color:rgba(245,240,224,0.6)">
                      Nina Pickup &nbsp;&middot;&nbsp;
                      <a href="mailto:ninapickup@interrupt-sustainability.com" style="color:#FFE600;text-decoration:none">ninapickup@interrupt-sustainability.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#1e1e1e;padding:14px 32px;border-top:1px solid rgba(245,240,224,0.05)">
              <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(245,240,224,0.22)">
                INTERRUPT &nbsp;&middot;&nbsp; interrupt-sustainability.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildResultsHtml(name: string | null, resultsToken: string): string {
  const firstName = name?.split(' ')[0] ?? 'there'
  const link = `${APP_URL}/results/${resultsToken}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your Interplay Report is ready</title>
</head>
<body style="margin:0;padding:0;background:#f5f0e0;font-family:'Helvetica Neue',Arial,sans-serif;color:#303030">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f0e0">
    <tr>
      <td align="center" style="padding:40px 20px">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:540px">

          <tr>
            <td style="background:#FFE600;padding:14px 32px;border-bottom:2px solid #303030">
              <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(48,48,48,0.65)">
                INTERRUPT &middot; The Interplay Assessment
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#303030;padding:40px 32px 36px">
              <h1 style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:44px;font-weight:900;text-transform:uppercase;line-height:0.88;color:#fff;letter-spacing:-0.02em">
                YOUR<br>REPORT<br>IS READY
              </h1>

              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:rgba(245,240,224,0.78)">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:rgba(245,240,224,0.78)">
                Your Interplay Assessment is complete. Your personalised report &mdash; including your Interplay Score, pillar analysis, and bespoke recommendations &mdash; is ready to view now.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:#FFE600;border-radius:3px">
                    <a href="${link}"
                       style="display:inline-block;padding:14px 28px;font-family:monospace;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;color:#303030">
                      View my report &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What the report includes -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                style="border-left:3px solid #FFE600;background:rgba(255,255,255,0.05);margin:32px 0 28px">
                <tr>
                  <td style="padding:16px 20px">
                    <p style="margin:0 0 10px;font-family:monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,240,224,0.4)">
                      Your report includes
                    </p>
                    <p style="margin:0 0 7px;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; Your Interplay Score, benchmarked against peers
                    </p>
                    <p style="margin:0 0 7px;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; Pillar-by-pillar analysis across sustainability, brand &amp; business
                    </p>
                    <p style="margin:0 0 7px;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; A quantified financial opportunity, ready for your board
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; Bespoke recommendations and next actions
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:rgba(245,240,224,0.4)">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 28px;font-size:12px;line-height:1.5;color:rgba(245,240,224,0.35);word-break:break-all">
                ${link}
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
                style="border-top:1px solid rgba(245,240,224,0.1);padding-top:24px;margin-top:8px">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-family:monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(245,240,224,0.35)">
                      Questions? Reach us directly
                    </p>
                    <p style="margin:0;font-size:13px;color:rgba(245,240,224,0.6)">
                      Nina Pickup &nbsp;&middot;&nbsp;
                      <a href="mailto:ninapickup@interrupt-sustainability.com" style="color:#FFE600;text-decoration:none">ninapickup@interrupt-sustainability.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#1e1e1e;padding:14px 32px;border-top:1px solid rgba(245,240,224,0.05)">
              <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(245,240,224,0.22)">
                INTERRUPT &nbsp;&middot;&nbsp; interrupt-sustainability.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Send a "start your assessment" email with the magic-link survey token.
 * This replaces sendLeadConfirmation for sessions that have a survey_token.
 * Also BCCs RESEND_NOTIFY_EMAILS so the team sees every new sign-up.
 */
export async function sendSurveyStartEmail(
  email: string,
  name: string | undefined,
  surveyToken: string,
): Promise<EmailResult> {
  const resend = getResend()
  if (!resend) return { sent: false, error: 'RESEND_API_KEY not configured' }

  try {
    const { error } = await resend.emails.send({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to:      [email],
      ...(NOTIFY_EMAILS.length > 0 ? { bcc: NOTIFY_EMAILS } : {}),
      subject: 'Start your Interplay Assessment',
      html:    buildSurveyStartHtml(name ?? null, surveyToken),
    })

    if (error) return { sent: false, error: error.message }
    return { sent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { sent: false, error: message }
  }
}

/**
 * Send a nudge email to a respondent who has not completed their survey.
 */
export async function sendNudgeEmail(
  email: string,
  name: string | undefined,
  surveyToken: string,
  doneSections: number,
  totalSections: number,
  nextSectionSlug?: string,
): Promise<EmailResult> {
  const resend = getResend()
  if (!resend) return { sent: false, error: 'RESEND_API_KEY not configured' }

  try {
    const { error } = await resend.emails.send({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to:      [email],
      subject: 'You left off halfway - complete your Interplay Assessment',
      html:    buildNudgeHtml(name ?? null, surveyToken, doneSections, totalSections, nextSectionSlug),
    })

    if (error) return { sent: false, error: error.message }
    return { sent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { sent: false, error: message }
  }
}

/**
 * Send a "your report is ready" email once all survey sections are complete.
 */
export async function sendResultsEmail(
  email: string,
  name: string | undefined,
  resultsToken: string,
): Promise<EmailResult> {
  const resend = getResend()
  if (!resend) return { sent: false, error: 'RESEND_API_KEY not configured' }

  try {
    const { error } = await resend.emails.send({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to:      [email],
      ...(NOTIFY_EMAILS.length > 0 ? { bcc: NOTIFY_EMAILS } : {}),
      subject: 'Your Interplay Report is ready',
      html:    buildResultsHtml(name ?? null, resultsToken),
    })

    if (error) return { sent: false, error: error.message }
    return { sent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { sent: false, error: message }
  }
}

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
 *                           Default: interplay@interrupt-sustainability.com
 *   RESEND_FROM_NAME       — display name
 *                           Default: Interplay Assessment Team
 *   RESEND_NOTIFY_EMAILS   — comma-separated list of addresses to BCC on every
 *                           new registration (e.g. Nina and Dan's inboxes)
 *                           Default: empty
 */

import { Resend } from 'resend'

const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL    ?? 'registrations@interplaymethod.com'
const FROM_NAME      = process.env.RESEND_FROM_NAME     ?? 'Interplay Assessment Team'
const NOTIFY_EMAILS  = (process.env.RESEND_NOTIFY_EMAILS ?? '')
  .split(',').map(e => e.trim()).filter(Boolean)

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
  <title>You're registered — Interplay Assessment</title>
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
                INTERRUPT × LIKE SO · The Interplay Assessment
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
                      &#x2713;&nbsp; Your Interplay Score — benchmarked against peers
                    </p>
                    <p style="margin:0 0 7px;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; Pillar-by-pillar analysis across sustainability, brand &amp; business
                    </p>
                    <p style="margin:0 0 7px;font-size:14px;line-height:1.55;color:rgba(245,240,224,0.8)">
                      &#x2713;&nbsp; A quantified financial opportunity — ready for your board
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
                    <p style="margin:0 0 4px;font-size:13px;color:rgba(245,240,224,0.6)">
                      Nina Pickup
                      &nbsp;·&nbsp;
                      <a href="mailto:ninapickup@interrupt-sustainability.com"
                        style="color:#FFE600;text-decoration:none">
                        ninapickup@interrupt-sustainability.com
                      </a>
                    </p>
                    <p style="margin:0;font-size:13px;color:rgba(245,240,224,0.6)">
                      Dan Harris
                      &nbsp;·&nbsp;
                      <a href="mailto:dan.harris@likeso.studio"
                        style="color:#FFE600;text-decoration:none">
                        dan.harris@likeso.studio
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
                INTERRUPT &times; LIKE SO &nbsp;&middot;&nbsp; interrupt-sustainability.com &nbsp;&middot;&nbsp; likeso.studio
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
      subject: "You're registered — your Interplay Assessment",
      html:    buildConfirmationHtml(name ?? null, email),
    })

    if (error) return { sent: false, error: error.message }
    return { sent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { sent: false, error: message }
  }
}

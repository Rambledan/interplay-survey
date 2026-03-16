import { google } from 'googleapis'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!
const QUESTIONS_SHEET = process.env.QUESTIONS_SHEET_NAME ?? 'Questions'
const RESPONSES_SHEET = process.env.RESPONSES_SHEET_NAME ?? 'Responses'

function getAuth() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!credentialsJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set')
  }

  const credentials = JSON.parse(credentialsJson)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

/**
 * Reads all question rows from the Questions sheet.
 * Returns raw string[][] (each row is an array of cell values).
 * Skips the header row if the first cell contains "Section".
 */
export async function getQuestionsRows(): Promise<string[][]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${QUESTIONS_SHEET}!A:J`,
  })

  const rows = (response.data.values ?? []) as string[][]

  // Skip header row if present (first cell matches "Section" or "section")
  if (rows.length > 0 && rows[0][0]?.toLowerCase().includes('section')) {
    return rows.slice(1)
  }

  return rows
}

/**
 * Appends a single response row to the Responses sheet.
 * Creates the header row automatically if the sheet is empty.
 */
export async function appendResponseRow(row: string[]): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // Check if sheet is empty and needs a header
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${RESPONSES_SHEET}!A1`,
  })

  const isEmpty = !existing.data.values || existing.data.values.length === 0

  if (isEmpty) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${RESPONSES_SHEET}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['timestamp', 'respondent_name', 'respondent_role', 'token', 'section_slug', 'answers_json', 'follow_ups_json']],
      },
    })
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${RESPONSES_SHEET}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  })
}

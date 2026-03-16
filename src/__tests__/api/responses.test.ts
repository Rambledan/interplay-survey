/**
 * @jest-environment node
 */
import { POST } from '@/app/api/responses/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/sheets', () => ({
  appendResponseRow: jest.fn(),
}))

import { appendResponseRow } from '@/lib/sheets'

const mockAppendResponseRow = appendResponseRow as jest.MockedFunction<typeof appendResponseRow>

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = {
  respondent: { name: 'Jane Smith', role: 'Brand Manager', token: null },
  sectionSlug: 'appetite',
  answers: { 'appetite-1': 'Moderate impact' },
  followUps: { 'appetite-1': 'Because...' },
  submittedAt: '2026-03-16T12:00:00.000Z',
}

describe('POST /api/responses', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAppendResponseRow.mockResolvedValue(undefined)
  })

  it('returns ok:true for valid body', async () => {
    const response = await POST(makeRequest(VALID_BODY))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('calls appendResponseRow with correct row data', async () => {
    await POST(makeRequest(VALID_BODY))

    expect(mockAppendResponseRow).toHaveBeenCalledTimes(1)
    const row = mockAppendResponseRow.mock.calls[0][0]

    expect(row[0]).toBe('2026-03-16T12:00:00.000Z')  // timestamp
    expect(row[1]).toBe('Jane Smith')                  // name
    expect(row[2]).toBe('Brand Manager')               // role
    expect(row[3]).toBe('')                            // token (null -> '')
    expect(row[4]).toBe('appetite')                    // section
    expect(JSON.parse(row[5])).toEqual({ 'appetite-1': 'Moderate impact' }) // answers
    expect(JSON.parse(row[6])).toEqual({ 'appetite-1': 'Because...' })      // followUps
  })

  it('returns 400 when respondent name is missing', async () => {
    const body = { ...VALID_BODY, respondent: { name: '', role: 'Manager', token: null } }
    const response = await POST(makeRequest(body))

    expect(response.status).toBe(400)
  })

  it('returns 400 when respondent role is missing', async () => {
    const body = { ...VALID_BODY, respondent: { name: 'Jane', role: '', token: null } }
    const response = await POST(makeRequest(body))

    expect(response.status).toBe(400)
  })

  it('returns 400 when sectionSlug is missing', async () => {
    const body = { ...VALID_BODY, sectionSlug: '' }
    const response = await POST(makeRequest(body))

    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid JSON', async () => {
    const request = new NextRequest('http://localhost/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 500 when appendResponseRow throws', async () => {
    mockAppendResponseRow.mockRejectedValue(new Error('Sheets error'))

    const response = await POST(makeRequest(VALID_BODY))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to save response')
  })

  it('uses current timestamp when submittedAt is not provided', async () => {
    const body = { ...VALID_BODY, submittedAt: undefined }
    await POST(makeRequest(body))

    const row = mockAppendResponseRow.mock.calls[0][0]
    expect(row[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/)  // ISO timestamp
  })
})

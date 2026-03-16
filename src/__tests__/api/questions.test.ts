/**
 * @jest-environment node
 */
import { GET, resetCache } from '@/app/api/questions/route'

jest.mock('@/lib/sheets', () => ({
  getQuestionsRows: jest.fn(),
}))

import { getQuestionsRows } from '@/lib/sheets'

const mockGetQuestionsRows = getQuestionsRows as jest.MockedFunction<typeof getQuestionsRows>

const SAMPLE_ROWS: string[][] = [
  ['Appetite', '', 'To what extent do you believe sustainability contributes?', 'Not at all', 'Limited impact', 'Moderate impact', 'Significant impact', 'Core driver of value', '', 'Why?'],
  ['Appetite', 'Growth appetite', 'How much potential is there for sustainability to contribute to growth?', '0%', '25%', '50%', '75%', '100%', '', 'Why?'],
]

describe('GET /api/questions', () => {
  beforeEach(() => {
    resetCache()
    jest.clearAllMocks()
  })

  it('returns sections derived from sheet rows', async () => {
    mockGetQuestionsRows.mockResolvedValue(SAMPLE_ROWS)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.sections).toHaveLength(1)
    expect(data.sections[0].name).toBe('Appetite')
    expect(data.sections[0].questions).toHaveLength(2)
  })

  it('returns cached data on second call without re-fetching', async () => {
    mockGetQuestionsRows.mockResolvedValue(SAMPLE_ROWS)

    await GET()
    await GET()

    expect(mockGetQuestionsRows).toHaveBeenCalledTimes(1)
  })

  it('re-fetches after cache reset', async () => {
    mockGetQuestionsRows.mockResolvedValue(SAMPLE_ROWS)

    await GET()
    resetCache()
    await GET()

    expect(mockGetQuestionsRows).toHaveBeenCalledTimes(2)
  })

  it('returns 500 when sheets API throws', async () => {
    mockGetQuestionsRows.mockRejectedValue(new Error('API error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to load questions')
  })

  it('returns sections with correct question types', async () => {
    mockGetQuestionsRows.mockResolvedValue(SAMPLE_ROWS)

    const response = await GET()
    const data = await response.json()

    expect(data.sections[0].questions[0].type).toBe('text-options')
    expect(data.sections[0].questions[1].type).toBe('percentage')
  })
})

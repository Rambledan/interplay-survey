import { parseQuestions, toSlug } from '@/lib/parse-questions'

describe('toSlug', () => {
  it('converts to lowercase kebab-case', () => {
    expect(toSlug('Scale and delivery')).toBe('scale-and-delivery')
  })

  it('removes special characters', () => {
    expect(toSlug('Growth appetite (versus cost)')).toBe('growth-appetite-versus-cost')
  })

  it('collapses multiple spaces', () => {
    expect(toSlug('Brand  Team')).toBe('brand-team')
  })

  it('trims whitespace', () => {
    expect(toSlug('  Appetite  ')).toBe('appetite')
  })
})

describe('parseQuestions', () => {
  const makeRow = (
    section: string,
    subSection: string,
    question: string,
    opts: string[] = ['Option A', 'Option B', 'Option C', '', '', ''],
    followUp = ''
  ): string[] => [section, subSection, question, ...opts, followUp]

  it('returns empty array for empty rows', () => {
    expect(parseQuestions([])).toEqual([])
  })

  it('skips rows with no question text', () => {
    const rows = [
      ['Appetite', '', '', '', '', '', '', '', '', ''],
    ]
    expect(parseQuestions(rows)).toEqual([])
  })

  it('creates a section for each unique section name', () => {
    const rows = [
      makeRow('Appetite', '', 'Q1'),
      makeRow('Scale', '', 'Q2'),
    ]
    const sections = parseQuestions(rows)
    expect(sections).toHaveLength(2)
    expect(sections[0].name).toBe('Appetite')
    expect(sections[1].name).toBe('Scale')
  })

  it('groups questions under the correct section', () => {
    const rows = [
      makeRow('Appetite', '', 'Q1'),
      makeRow('Appetite', '', 'Q2'),
      makeRow('Scale', '', 'Q3'),
    ]
    const sections = parseQuestions(rows)
    expect(sections[0].questions).toHaveLength(2)
    expect(sections[1].questions).toHaveLength(1)
  })

  it('preserves section order as they appear in rows', () => {
    const rows = [
      makeRow('Capability', '', 'Q1'),
      makeRow('Appetite', '', 'Q2'),
    ]
    const sections = parseQuestions(rows)
    expect(sections[0].slug).toBe('capability')
    expect(sections[1].slug).toBe('appetite')
  })

  it('generates stable unique question IDs', () => {
    const rows = [
      makeRow('Appetite', '', 'Q1'),
      makeRow('Appetite', '', 'Q2'),
    ]
    const sections = parseQuestions(rows)
    const ids = sections[0].questions.map(q => q.id)
    expect(ids[0]).not.toBe(ids[1])
    expect(ids[0]).toMatch(/^appetite-/)
    expect(ids[1]).toMatch(/^appetite-/)
  })

  it('detects percentage question type correctly', () => {
    const rows = [
      ['Appetite', '', 'Q1', '0%', '25%', '50%', '75%', '100%', '', ''],
    ]
    const [section] = parseQuestions(rows)
    expect(section.questions[0].type).toBe('percentage')
    expect(section.questions[0].options).toEqual(['0%', '25%', '50%', '75%', '100%'])
  })

  it('detects text-options question type correctly', () => {
    const rows = [
      ['Appetite', '', 'Q1', 'Not at all', 'Moderate', 'Significant', '', '', '', ''],
    ]
    const [section] = parseQuestions(rows)
    expect(section.questions[0].type).toBe('text-options')
  })

  it('detects open-answer question type correctly', () => {
    const rows = [
      ['Appetite', '', 'Q1', 'Open answer', '', '', '', '', '', ''],
    ]
    const [section] = parseQuestions(rows)
    expect(section.questions[0].type).toBe('open-answer')
    expect(section.questions[0].options).toEqual([])
  })

  it('sets followUpLabel from column J when present', () => {
    const rows = [
      ['Appetite', '', 'Q1', '0%', '25%', '50%', '75%', '100%', '', 'Why did you choose this?'],
    ]
    const [section] = parseQuestions(rows)
    expect(section.questions[0].followUpLabel).toBe('Why did you choose this?')
  })

  it('sets followUpLabel to null when column J is empty', () => {
    const rows = [
      ['Appetite', '', 'Q1', 'Yes', 'No', '', '', '', '', ''],
    ]
    const [section] = parseQuestions(rows)
    expect(section.questions[0].followUpLabel).toBeNull()
  })

  it('uses previous section name when column A is blank (merged cell)', () => {
    const rows = [
      makeRow('Appetite', '', 'Q1'),
      ['', 'Sub', 'Q2', 'Yes', 'No', '', '', '', '', ''],
    ]
    const sections = parseQuestions(rows)
    expect(sections).toHaveLength(1)
    expect(sections[0].questions).toHaveLength(2)
  })

  it('filters empty strings from options', () => {
    const rows = [
      ['Appetite', '', 'Q1', 'Yes', 'No', '', '', '', '', ''],
    ]
    const [section] = parseQuestions(rows)
    expect(section.questions[0].options).toEqual(['Yes', 'No'])
  })
})

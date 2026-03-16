import { detectQuestionType } from '@/lib/detect-question-type'

describe('detectQuestionType', () => {
  describe('percentage', () => {
    it('detects five percentage values as percentage type', () => {
      expect(detectQuestionType(['0%', '25%', '50%', '75%', '100%'])).toBe('percentage')
    })

    it('detects percentage type with extra empty trailing options', () => {
      expect(detectQuestionType(['0%', '25%', '50%', '75%', '100%', ''])).toBe('percentage')
    })

    it('detects percentage type even with whitespace around values', () => {
      expect(detectQuestionType([' 0% ', ' 25% ', ' 50% ', ' 75% ', ' 100% '])).toBe('percentage')
    })
  })

  describe('open-answer', () => {
    it('returns open-answer when all options are empty', () => {
      expect(detectQuestionType(['', '', '', '', '', ''])).toBe('open-answer')
    })

    it('returns open-answer when first option is "Open answer"', () => {
      expect(detectQuestionType(['Open answer', '', '', '', '', ''])).toBe('open-answer')
    })

    it('returns open-answer for "open answer" (case insensitive)', () => {
      expect(detectQuestionType(['open answer', '', '', '', '', ''])).toBe('open-answer')
    })

    it('returns open-answer for "Open Answer" mixed case', () => {
      expect(detectQuestionType(['Open Answer', '', '', '', '', ''])).toBe('open-answer')
    })

    it('returns open-answer for empty array', () => {
      expect(detectQuestionType([])).toBe('open-answer')
    })
  })

  describe('text-options', () => {
    it('detects text labels as text-options', () => {
      expect(detectQuestionType(['Not at all', 'Limited impact', 'Moderate impact', 'Significant impact', 'Core driver of value', ''])).toBe('text-options')
    })

    it('detects Yes/No/Maybe as text-options', () => {
      expect(detectQuestionType(['Yes', 'No', 'Maybe', '', '', ''])).toBe('text-options')
    })

    it('detects frequency labels as text-options', () => {
      expect(detectQuestionType(['Weekly', 'Monthly', 'Quarterly', 'Annually', 'Never', ''])).toBe('text-options')
    })

    it('detects involvement labels as text-options', () => {
      expect(detectQuestionType(['High involvement', '', '', '', 'Low involvement', ''])).toBe('text-options')
    })

    it('detects mixed percentage and text as text-options (not pure percentage)', () => {
      expect(detectQuestionType(['0%', '25%', '50%', 'Most', 'All of it', ''])).toBe('text-options')
    })

    it('detects numeric strings that are not percentages as text-options', () => {
      expect(detectQuestionType(['0', '25', '50', '75', '100', ''])).toBe('text-options')
    })
  })
})

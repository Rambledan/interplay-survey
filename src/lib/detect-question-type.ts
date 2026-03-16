import type { QuestionType } from '@/types/survey'

const PERCENTAGE_VALUES = new Set(['0%', '25%', '50%', '75%', '100%'])

/**
 * Detects the question type from the option strings extracted from the spreadsheet.
 * Column D (index 0) through Column I (index 5) are the options.
 */
export function detectQuestionType(options: string[]): QuestionType {
  const nonEmpty = options.filter(o => o.trim() !== '')

  if (nonEmpty.length === 0) return 'open-answer'

  const first = nonEmpty[0].trim().toLowerCase()
  if (first === 'open answer' || first.startsWith('open answer')) {
    return 'open-answer'
  }

  // All non-empty options are percentage values → percentage scale
  if (nonEmpty.every(o => PERCENTAGE_VALUES.has(o.trim()))) {
    return 'percentage'
  }

  return 'text-options'
}

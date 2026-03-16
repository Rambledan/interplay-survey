import type { Question, SurveySection } from '@/types/survey'
import { detectQuestionType } from './detect-question-type'

/**
 * Converts a section name to a URL-safe slug.
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Parses raw Google Sheets rows into typed SurveySection[].
 *
 * Expected row layout (0-indexed):
 *   [0] Section name (Column A)
 *   [1] Sub-section / description (Column B)
 *   [2] Question text (Column C)
 *   [3] Option 1 (Column D)
 *   [4] Option 2 (Column E)
 *   [5] Option 3 (Column F)
 *   [6] Option 4 (Column G)
 *   [7] Option 5 (Column H)
 *   [8] Option 6 (Column I)
 *   [9] Open/follow-up answer label (Column J)
 */
export function parseQuestions(rows: string[][]): SurveySection[] {
  const sectionsMap = new Map<string, SurveySection>()
  const sectionOrder: string[] = []

  rows.forEach((row, rowIndex) => {
    const sectionName = (row[0] ?? '').trim()
    const description = (row[1] ?? '').trim()
    const questionText = (row[2] ?? '').trim()

    if (!questionText) return

    // Use the most recent section name if column A is blank (merged cell pattern)
    const effectiveSectionName = sectionName || sectionOrder[sectionOrder.length - 1] || 'General'
    const slug = toSlug(effectiveSectionName)

    if (!sectionsMap.has(slug)) {
      sectionsMap.set(slug, {
        name: effectiveSectionName,
        slug,
        description: description || effectiveSectionName,
        questions: [],
      })
      sectionOrder.push(slug)
    }

    const section = sectionsMap.get(slug)!

    // Update description if this row has one (handles sub-section labels)
    if (description && !section.description) {
      section.description = description
    }

    const rawOptions = [
      row[3] ?? '',
      row[4] ?? '',
      row[5] ?? '',
      row[6] ?? '',
      row[7] ?? '',
      row[8] ?? '',
    ]

    const type = detectQuestionType(rawOptions)
    // For open-answer questions, options are not meaningful
    const options = type === 'open-answer'
      ? []
      : rawOptions.filter(o => o.trim() !== '')
    const followUpLabel = (row[9] ?? '').trim() || null

    const question: Question = {
      id: `${slug}-${rowIndex}`,
      text: questionText,
      type,
      options,
      followUpLabel,
    }

    section.questions.push(question)
  })

  return sectionOrder.map(slug => sectionsMap.get(slug)!)
}

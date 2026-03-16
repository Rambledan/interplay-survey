export type QuestionType = 'percentage' | 'text-options' | 'open-answer'

export interface Question {
  id: string
  text: string
  type: QuestionType
  options: string[]
  followUpLabel: string | null
}

export interface SurveySection {
  name: string
  slug: string
  description: string
  questions: Question[]
}

// Token is null in phase 1; populated via magic link in phase 2
export interface RespondentInfo {
  name: string
  role: string
  token: string | null
}

export interface SectionAnswers {
  answers: Record<string, string>     // questionId -> selected option
  followUps: Record<string, string>   // questionId -> follow-up text
}

export interface SurveyResponse {
  respondent: RespondentInfo
  sectionSlug: string
  answers: Record<string, string>
  followUps: Record<string, string>
  submittedAt: string
}

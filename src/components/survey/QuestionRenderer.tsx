'use client'

import type { Question } from '@/types/survey'
import { PercentageScale } from './PercentageScale'
import { TextOptions } from './TextOptions'
import { OpenAnswer } from './OpenAnswer'
import { FollowUp } from './FollowUp'

interface QuestionRendererProps {
  question: Question
  answer: string
  followUp: string
  onAnswerChange: (questionId: string, value: string) => void
  onFollowUpChange: (questionId: string, value: string) => void
}

export function QuestionRenderer({
  question,
  answer,
  followUp,
  onAnswerChange,
  onFollowUpChange,
}: QuestionRendererProps) {
  const { id, text, type, options, followUpLabel } = question

  return (
    <div className="mb-10">
      <p className="text-white text-base mb-5 leading-relaxed">{text}</p>

      {type === 'percentage' && (
        <PercentageScale
          questionId={id}
          label={text}
          value={answer}
          onChange={(v) => onAnswerChange(id, v)}
        />
      )}

      {type === 'text-options' && (
        <TextOptions
          questionId={id}
          label={text}
          options={options}
          value={answer}
          onChange={(v) => onAnswerChange(id, v)}
        />
      )}

      {type === 'open-answer' && (
        <OpenAnswer
          questionId={id}
          label={text}
          value={answer}
          onChange={(v) => onAnswerChange(id, v)}
        />
      )}

      {followUpLabel && (
        <FollowUp
          questionId={id}
          label={followUpLabel}
          value={followUp}
          onChange={(v) => onFollowUpChange(id, v)}
        />
      )}
    </div>
  )
}

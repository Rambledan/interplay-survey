'use client'

import type { Question } from '@/types/survey'
import { PercentageScale } from './PercentageScale'
import { TextOptions } from './TextOptions'
import { OpenAnswer } from './OpenAnswer'
import { FollowUp } from './FollowUp'
import { RevenueInput } from './RevenueInput'
import { MultipleSelect } from './MultipleSelect'

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
      <p className="text-base mb-5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.88)', lineHeight: 1.65, letterSpacing: '0.01em' }}>{text}</p>

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

      {type === 'multiple-select' && (
        <MultipleSelect
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

      {type === 'revenue-input' && (
        <RevenueInput
          questionId={id}
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

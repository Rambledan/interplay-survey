'use client'

interface OpenAnswerProps {
  questionId: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function OpenAnswer({ questionId, label, value, onChange, placeholder }: OpenAnswerProps) {
  return (
    <div className="w-full">
      <label htmlFor={questionId} className="sr-only">{label}</label>
      <textarea
        id={questionId}
        name={questionId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Share your thoughts…'}
        rows={4}
        className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-sm resize-none focus:outline-none focus:border-brand-green/60 transition-colors"
      />
    </div>
  )
}

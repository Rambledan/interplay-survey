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
        className="w-full px-4 py-3 text-sm resize-none focus:outline-none transition-colors"
        style={{
          backgroundColor: '#fff',
          border: '1px solid rgba(47,42,42,0.25)',
          color: '#3a3a3a',
          borderRadius: '4px',
        }}
        onFocus={e => e.currentTarget.style.borderColor = '#faf000'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(47,42,42,0.25)'}
      />
    </div>
  )
}

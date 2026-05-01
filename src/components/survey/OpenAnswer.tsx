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
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.88)',
          borderRadius: '4px',
        }}
        onFocus={e => e.currentTarget.style.borderColor = 'rgba(250,240,0,0.5)'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
      />
    </div>
  )
}

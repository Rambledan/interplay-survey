'use client'

interface FollowUpProps {
  questionId: string
  label: string
  value: string
  onChange: (value: string) => void
}

export function FollowUp({ questionId, label, value, onChange }: FollowUpProps) {
  const id = `${questionId}-followup`

  return (
    <div className="mt-3 w-full">
      <label htmlFor={id} className="block text-xs uppercase tracking-widest mb-2"
        style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(47,42,42,0.4)' }}>
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Share your thoughts…"
        rows={2}
        className="w-full px-4 py-3 text-sm resize-none focus:outline-none transition-colors"
        style={{
          backgroundColor: '#fff',
          border: '1px solid rgba(47,42,42,0.15)',
          color: '#2f2a2a',
          borderRadius: '4px',
        }}
        onFocus={e => e.currentTarget.style.borderColor = '#faf000'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(47,42,42,0.15)'}
      />
    </div>
  )
}

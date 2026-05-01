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
    <div className="mt-4 w-full">
      <label htmlFor={id} className="block text-xs uppercase tracking-widest mb-2"
        style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.5)' }}>
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
          backgroundColor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.88)',
          borderRadius: '4px',
        }}
        onFocus={e => e.currentTarget.style.borderColor = 'rgba(250,240,0,0.4)'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
      />
    </div>
  )
}

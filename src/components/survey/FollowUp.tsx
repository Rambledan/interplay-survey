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
      <label htmlFor={id} className="block text-xs text-brand-muted uppercase tracking-widest mb-2 font-mono">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Share your thoughts…"
        rows={2}
        className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-sm resize-none focus:outline-none focus:border-white/30 transition-colors"
      />
    </div>
  )
}

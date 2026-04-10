'use client'

interface MultipleSelectProps {
  questionId: string
  label: string
  options: string[]
  value: string        // comma-separated selected values
  onChange: (value: string) => void
  accentColor?: string
}

export function MultipleSelect({ questionId, options, value, onChange, accentColor = '#faf000' }: MultipleSelectProps) {
  const selected = value ? value.split(',') : []

  function toggle(option: string) {
    const next = selected.includes(option)
      ? selected.filter(o => o !== option)
      : [...selected, option]
    onChange(next.join(','))
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map(option => {
        const isSelected = selected.includes(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3"
            style={{
              border: `1px solid ${isSelected ? accentColor : 'rgba(47,42,42,0.12)'}`,
              backgroundColor: isSelected ? `rgba(250,240,0,0.12)` : '#fff',
              color: '#2f2a2a',
              borderRadius: '4px',
            }}
          >
            <span
              className="flex-shrink-0 w-4 h-4 rounded-sm flex items-center justify-center"
              style={{
                border: `1.5px solid ${isSelected ? accentColor : 'rgba(47,42,42,0.3)'}`,
                backgroundColor: isSelected ? accentColor : 'transparent',
              }}
            >
              {isSelected && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#2f2a2a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            {option}
          </button>
        )
      })}
    </div>
  )
}

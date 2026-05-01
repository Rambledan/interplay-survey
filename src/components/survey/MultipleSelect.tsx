'use client'

interface MultipleSelectProps {
  questionId: string
  label: string
  options: string[]
  value: string
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
            className="w-full text-left px-4 py-3 text-sm transition-all duration-150 flex items-center gap-3"
            style={{
              border: `1px solid ${isSelected ? 'rgba(250,240,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
              backgroundColor: isSelected ? 'rgba(250,240,0,0.1)' : 'rgba(255,255,255,0.04)',
              color: isSelected ? '#faf000' : 'rgba(255,255,255,0.65)',
              borderRadius: '4px',
            }}
          >
            <span
              className="flex-shrink-0 w-4 h-4 rounded-sm flex items-center justify-center"
              style={{
                border: `1.5px solid ${isSelected ? accentColor : 'rgba(255,255,255,0.2)'}`,
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

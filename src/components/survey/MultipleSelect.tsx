'use client'

const NONE_OPTION = 'None of the above'

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
  const noneSelected = selected.includes(NONE_OPTION)

  function toggle(option: string) {
    if (option === NONE_OPTION) {
      // Selecting "None" clears everything else; deselecting clears it too
      const next = selected.includes(NONE_OPTION) ? [] : [NONE_OPTION]
      onChange(next.join(','))
    } else {
      // Selecting any real option removes "None of the above" if present
      const without = selected.filter(o => o !== NONE_OPTION)
      const next = without.includes(option)
        ? without.filter(o => o !== option)
        : [...without, option]
      onChange(next.join(','))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map(option => {
        const isNone    = option === NONE_OPTION
        const isSelected = selected.includes(option)
        const isDisabled = !isNone && noneSelected

        return (
          <button
            key={option}
            type="button"
            onClick={() => !isDisabled && toggle(option)}
            disabled={isDisabled}
            className="w-full text-left px-4 py-3 text-sm transition-all duration-150 flex items-center gap-3"
            style={{
              border: `1px solid ${
                isDisabled  ? 'rgba(255,255,255,0.05)' :
                isSelected  ? 'rgba(250,240,0,0.5)'    :
                              'rgba(255,255,255,0.1)'
              }`,
              backgroundColor: isDisabled ? 'rgba(255,255,255,0.01)' :
                               isSelected ? 'rgba(250,240,0,0.1)'    :
                                            'rgba(255,255,255,0.04)',
              color: isDisabled ? 'rgba(255,255,255,0.2)'  :
                     isSelected ? '#faf000'                 :
                                  'rgba(255,255,255,0.65)',
              borderRadius: '4px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            <span
              className="flex-shrink-0 w-4 h-4 rounded-sm flex items-center justify-center"
              style={{
                border: `1.5px solid ${
                  isDisabled ? 'rgba(255,255,255,0.08)'  :
                  isSelected ? accentColor               :
                               'rgba(255,255,255,0.2)'
                }`,
                backgroundColor: isSelected && !isDisabled ? accentColor : 'transparent',
              }}
            >
              {isSelected && !isDisabled && (
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

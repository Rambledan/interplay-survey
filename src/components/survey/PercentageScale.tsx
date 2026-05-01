'use client'

interface PercentageScaleProps {
  questionId: string
  label: string
  value: string
  onChange: (value: string) => void
}

const OPTIONS = ['0%', '25%', '50%', '75%', '100%']

export function PercentageScale({ questionId, label, value, onChange }: PercentageScaleProps) {
  return (
    <fieldset className="w-full">
      <legend className="sr-only">{label}</legend>
      <div className="flex gap-0 w-full">
        {OPTIONS.map((option, i) => {
          const id = `${questionId}-${option}`
          const selected = value === option
          const isFirst = i === 0
          const isLast = i === OPTIONS.length - 1

          return (
            <label
              key={option}
              htmlFor={id}
              className="flex-1 cursor-pointer text-center py-3 text-sm transition-all duration-150"
              style={{
                fontFamily: 'Almarai, sans-serif',
                backgroundColor: selected ? '#faf000' : 'rgba(255,255,255,0.05)',
                color: selected ? '#2f2a2a' : 'rgba(255,255,255,0.45)',
                border: `1px solid ${selected ? '#faf000' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: isFirst ? '4px 0 0 4px' : isLast ? '0 4px 4px 0' : '0',
                marginLeft: i > 0 ? '-1px' : '0',
                fontWeight: selected ? '700' : '400',
                position: 'relative',
                zIndex: selected ? 1 : 0,
              }}
            >
              <input
                type="radio"
                id={id}
                name={questionId}
                value={option}
                checked={selected}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {option}
            </label>
          )
        })}
      </div>
      <div className="flex justify-between text-xs mt-1.5 px-0.5"
        style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(255,255,255,0.25)' }}>
        <span>None</span>
        <span>All</span>
      </div>
    </fieldset>
  )
}

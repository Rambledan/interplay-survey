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
        {OPTIONS.map((option) => {
          const id = `${questionId}-${option}`
          const selected = value === option

          return (
            <label
              key={option}
              htmlFor={id}
              className="flex-1 cursor-pointer text-center py-3 text-sm border transition-all duration-150"
              style={{
                fontFamily: 'Almarai, sans-serif',
                backgroundColor: selected ? '#faf000' : '#fff',
                color: selected ? '#2f2a2a' : 'rgba(47,42,42,0.55)',
                borderColor: selected ? '#faf000' : 'rgba(47,42,42,0.12)',
                fontWeight: selected ? '700' : '400',
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
      <div className="flex justify-between text-xs mt-1 px-0.5" style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(47,42,42,0.35)' }}>
        <span>None</span>
        <span>All</span>
      </div>
    </fieldset>
  )
}

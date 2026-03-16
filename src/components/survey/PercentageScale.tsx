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
              className={`
                flex-1 cursor-pointer text-center py-3 text-sm font-mono border transition-all duration-150
                ${selected
                  ? 'bg-brand-green text-brand-bg border-brand-green font-bold'
                  : 'bg-transparent text-white/70 border-white/10 hover:border-white/40 hover:text-white'
                }
              `}
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
      <div className="flex justify-between text-xs text-brand-muted mt-1 px-0.5 font-mono">
        <span>None</span>
        <span>All</span>
      </div>
    </fieldset>
  )
}

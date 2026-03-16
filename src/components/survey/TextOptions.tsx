'use client'

interface TextOptionsProps {
  questionId: string
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function TextOptions({ questionId, label, options, value, onChange }: TextOptionsProps) {
  return (
    <fieldset className="w-full">
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const id = `${questionId}-${option.replace(/\s+/g, '-').toLowerCase()}`
          const selected = value === option

          return (
            <label
              key={option}
              htmlFor={id}
              className={`
                flex items-center gap-3 cursor-pointer px-5 py-3.5 border transition-all duration-150
                ${selected
                  ? 'border-brand-green bg-brand-green/10 text-white'
                  : 'border-white/10 bg-transparent text-white/70 hover:border-white/40 hover:text-white'
                }
              `}
            >
              <span
                className={`
                  flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center
                  ${selected ? 'border-brand-green' : 'border-white/30'}
                `}
                aria-hidden
              >
                {selected && <span className="w-2 h-2 rounded-full bg-brand-green" />}
              </span>
              <input
                type="radio"
                id={id}
                name={questionId}
                value={option}
                checked={selected}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              <span className="text-sm">{option}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

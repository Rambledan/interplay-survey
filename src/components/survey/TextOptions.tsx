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
              className="flex items-center gap-3 cursor-pointer px-5 py-3.5 transition-all duration-150"
              style={{
                border: `1px solid ${selected ? 'rgba(250,240,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                backgroundColor: selected ? 'rgba(250,240,0,0.1)' : 'rgba(255,255,255,0.04)',
                color: selected ? '#faf000' : 'rgba(255,255,255,0.65)',
                borderRadius: '4px',
              }}
            >
              <span
                className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: selected ? '#faf000' : 'rgba(255,255,255,0.2)' }}
                aria-hidden
              >
                {selected && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#faf000' }} />}
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

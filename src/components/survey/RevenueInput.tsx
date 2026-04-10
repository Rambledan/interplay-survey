'use client'

import { useState, useEffect } from 'react'

// Stored format: "{currency}|{figure}|{scale}"  e.g. "£|5|Mn"

const CURRENCIES = ['£', '$', '€']
const SCALES = ['Bn', 'Mn', 'K']

interface RevenueInputProps {
  questionId: string
  value: string   // encoded string or empty
  onChange: (value: string) => void
}

function parse(encoded: string): { currency: string; figure: string; scale: string } {
  const parts = encoded.split('|')
  if (parts.length === 3) return { currency: parts[0], figure: parts[1], scale: parts[2] }
  return { currency: '£', figure: '', scale: 'Mn' }
}

function encode(currency: string, figure: string, scale: string): string {
  return `${currency}|${figure}|${scale}`
}

export function RevenueInput({ questionId, value, onChange }: RevenueInputProps) {
  const parsed = parse(value)
  const [currency, setCurrency] = useState(parsed.currency)
  const [figure, setFigure] = useState(parsed.figure)
  const [scale, setScale] = useState(parsed.scale)
  const [focused, setFocused] = useState(false)

  // Sync inbound value (e.g. on restore)
  useEffect(() => {
    const p = parse(value)
    setCurrency(p.currency)
    setFigure(p.figure)
    setScale(p.scale)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(c: string, f: string, s: string) {
    if (f.trim()) {
      onChange(encode(c, f.trim(), s))
    } else {
      onChange('')
    }
  }

  const borderColor = focused ? '#3ecf6e' : 'rgba(13,20,16,0.12)'

  return (
    <div className="flex items-stretch gap-0 max-w-sm" id={questionId}>
      {/* Currency selector */}
      <div className="relative">
        <select
          value={currency}
          onChange={e => { setCurrency(e.target.value); update(e.target.value, figure, scale) }}
          className="appearance-none h-full pl-3 pr-7 text-sm font-medium rounded-l-lg outline-none cursor-pointer transition-colors"
          style={{
            backgroundColor: '#ffffff',
            border: `1px solid ${borderColor}`,
            borderRight: 'none',
            color: '#0d1410',
            minWidth: '3.5rem',
          }}
        >
          {CURRENCIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {/* Chevron */}
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: 'rgba(13,20,16,0.35)' }}>▾</span>
      </div>

      {/* Numeric input */}
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        placeholder="0"
        value={figure}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); update(currency, figure, scale) }}
        onChange={e => { setFigure(e.target.value); update(currency, e.target.value, scale) }}
        className="flex-1 px-3 py-3 text-sm outline-none transition-colors min-w-0"
        style={{
          backgroundColor: '#ffffff',
          border: `1px solid ${borderColor}`,
          borderLeft: 'none',
          borderRight: 'none',
          color: '#0d1410',
        }}
      />

      {/* Scale selector */}
      <div className="relative">
        <select
          value={scale}
          onChange={e => { setScale(e.target.value); update(currency, figure, e.target.value) }}
          className="appearance-none h-full pl-3 pr-7 text-sm font-medium rounded-r-lg outline-none cursor-pointer transition-colors"
          style={{
            backgroundColor: '#ffffff',
            border: `1px solid ${borderColor}`,
            borderLeft: 'none',
            color: '#0d1410',
            minWidth: '4rem',
          }}
        >
          {SCALES.map(s => (
            <option key={s} value={s}>{s === 'K' ? 'Thousands' : s === 'Mn' ? 'Millions' : 'Billions'}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: 'rgba(13,20,16,0.35)' }}>▾</span>
      </div>
    </div>
  )
}

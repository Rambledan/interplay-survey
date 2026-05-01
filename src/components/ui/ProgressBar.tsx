'use client'

interface ProgressBarProps {
  current: number  // 1-based
  total: number
  className?: string
}

export function ProgressBar({ current, total, className = '' }: ProgressBarProps) {
  const pct = Math.round((current / total) * 100)

  return (
    <div className={`w-full ${className}`} role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
      <div className="flex justify-between text-xs mb-2 uppercase tracking-widest"
        style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.5)' }}>
        <span>Section {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-0.5 w-full" style={{ backgroundColor: 'rgba(250,240,0,0.1)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: '#faf000' }}
        />
      </div>
    </div>
  )
}

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
      <div className="flex justify-between text-xs text-brand-muted mb-2 font-mono uppercase tracking-widest">
        <span>Section {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-green rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

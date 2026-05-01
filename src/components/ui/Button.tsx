'use client'

import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

export function Button({ variant = 'primary', loading = false, children, className = '', disabled, style, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center px-8 py-3.5 font-bold uppercase tracking-widest text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed'

  if (variant === 'primary') {
    return (
      <button
        className={`${base} ${className}`}
        style={{ backgroundColor: '#faf000', color: '#2f2a2a', borderRadius: '6px', ...style }}
        disabled={disabled || loading}
        onMouseEnter={e => { if (!disabled && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e8df00' }}
        onMouseLeave={e => { if (!disabled && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#faf000' }}
        {...props}
      >
        {loading ? (
          <>
            <span className="mr-2 inline-block h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
            Saving…
          </>
        ) : children}
      </button>
    )
  }

  return (
    <button
      className={`${base} bg-transparent ${className}`}
      style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', borderRadius: '6px', ...style }}
      disabled={disabled || loading}
      onMouseEnter={e => { if (!disabled && !loading) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.9)' } }}
      onMouseLeave={e => { if (!disabled && !loading) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)' } }}
      {...props}
    >
      {loading ? (
        <>
          <span className="mr-2 inline-block h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
          Saving…
        </>
      ) : children}
    </button>
  )
}

'use client'

import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

export function Button({ variant = 'primary', loading = false, children, className = '', disabled, style, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center px-8 py-4 font-bold uppercase tracking-widest text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed'

  if (variant === 'primary') {
    return (
      <button
        className={`${base} ${className}`}
        style={{ backgroundColor: '#000', color: '#fff', borderRadius: '12px', ...style }}
        disabled={disabled || loading}
        onMouseEnter={e => { if (!disabled && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2f2a2a' }}
        onMouseLeave={e => { if (!disabled && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#000' }}
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
      style={{ border: '1px solid rgba(47,42,42,0.2)', color: '#2f2a2a', borderRadius: '12px', ...style }}
      disabled={disabled || loading}
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

'use client'

import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

export function Button({ variant = 'primary', loading = false, children, className = '', disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center px-8 py-4 font-bold uppercase tracking-widest text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-brand-green text-brand-bg hover:bg-brand-green/90',
    secondary: 'border border-white/20 text-white hover:border-white/60 bg-transparent',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
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

'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function UnlockPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/')
    } else {
      setError('Incorrect password')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFE600',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Open Sans, sans-serif',
      padding: '32px',
    }}>
      <img
        src="/favicon.png"
        alt="Interplay Lab"
        style={{ width: 96, height: 96, borderRadius: '50%', marginBottom: 40 }}
      />

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{
          fontFamily: 'Anton, Impact, sans-serif',
          fontSize: 32,
          color: '#303030',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          marginBottom: 8,
          lineHeight: 1,
        }}>
          INTERPLAY LAB
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.55)', marginBottom: 32 }}>
          Enter the access password to continue.
        </p>

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          required
          autoFocus
          style={{
            width: '100%',
            padding: '14px 16px',
            fontSize: 16,
            border: '1.5px solid #303030',
            background: '#ffffff',
            color: '#303030',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: error ? 8 : 16,
          }}
        />

        {error && (
          <p style={{ fontSize: 13, color: '#c0392b', marginBottom: 12 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: '#303030',
            color: '#FFE600',
            border: '1.5px solid #303030',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Checking…' : 'Enter →'}
        </button>
      </form>
    </div>
  )
}

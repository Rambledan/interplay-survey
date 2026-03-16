'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { RespondentInfo, SurveySection } from '@/types/survey'

export default function IntroPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [firstSection, setFirstSection] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    fetch('/api/questions')
      .then(r => r.json())
      .then((data: { sections: SurveySection[] }) => {
        if (data.sections?.length > 0) {
          setFirstSection(data.sections[0].slug)
        }
      })
      .catch(() => setFetchError(true))
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !role.trim() || !firstSection) return

    setLoading(true)

    const respondent: RespondentInfo = {
      name: name.trim(),
      role: role.trim(),
      token: null,
    }

    sessionStorage.setItem('interplay-respondent', JSON.stringify(respondent))
    router.push(`/survey/${firstSection}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-muted">Interrupt</span>
          <span className="text-white/20">×</span>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-muted">Like So</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center px-6 py-16 max-w-2xl mx-auto w-full">

        {/* Tagline */}
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-brand-green mb-6">
          Interplay Method — Diagnostic
        </p>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tight text-white mb-6">
          Where do you sit in<br />
          <span className="text-brand-green">the interplay?</span>
        </h1>

        {/* Intro text */}
        <p className="text-white/60 text-base leading-relaxed mb-4 max-w-lg">
          Most organisations solve sustainability in silos. Brand teams, sustainability teams, and business teams — all expert, all disconnected.
        </p>
        <p className="text-white/60 text-base leading-relaxed mb-10 max-w-lg">
          This diagnostic reveals the gaps and opportunities between your sustainability, brand and business strategies — and where the interplay can unlock triple value.
        </p>

        {/* Triple value pillars */}
        <div className="flex gap-3 mb-12">
          {[
            { label: 'Sustainability Value', color: 'border-brand-green text-brand-green' },
            { label: 'Brand Value', color: 'border-brand-orange text-brand-orange' },
            { label: 'Business Value', color: 'border-brand-blue text-brand-blue' },
          ].map(({ label, color }) => (
            <div key={label} className={`flex-1 border px-3 py-2 text-center ${color}`}>
              <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        {fetchError ? (
          <div className="border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-400 text-sm">
            Failed to load survey. Please refresh the page.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-mono uppercase tracking-widest text-brand-muted mb-2">
                Your name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 px-4 py-3 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-xs font-mono uppercase tracking-widest text-brand-muted mb-2">
                Your role
              </label>
              <input
                id="role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Head of Sustainability"
                required
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 px-4 py-3 text-sm focus:outline-none focus:border-brand-green/50 transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!name.trim() || !role.trim() || !firstSection || loading}
                className="w-full bg-brand-green text-brand-bg font-black uppercase tracking-widest py-4 text-sm hover:bg-brand-green/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Starting…' : 'Begin the diagnostic →'}
              </button>
            </div>

            <p className="text-xs text-brand-muted text-center pt-1">
              Takes approximately 10–15 minutes. Multiple sections.
            </p>
          </form>
        )}
      </main>

      <footer className="px-6 py-4 border-t border-white/5 text-center">
        <p className="text-xs text-brand-muted font-mono">
          Interrupt × Like So — The Interplay Method®
        </p>
      </footer>
    </div>
  )
}

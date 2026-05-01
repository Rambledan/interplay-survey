'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { RespondentInfo, SurveySection } from '@/types/survey'

const inputCls = [
  'w-full px-4 py-3 text-sm',
  'focus:outline-none transition-colors',
].join(' ')

const inputStyle = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.88)',
  borderRadius: '4px',
}

export default function IntroPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [sector, setSector] = useState('')
  const [companyType, setCompanyType] = useState('')
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
      company: company.trim(),
      sector: sector.trim(),
      companyType,
      token: null,
    }

    sessionStorage.setItem('interplay-respondent', JSON.stringify(respondent))
    router.push(`/survey/${firstSection}`)
  }

  function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'rgba(250,240,0,0.5)'
  }
  function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#2f2a2a', color: 'rgba(255,255,255,0.92)' }}>

      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(250,240,0,0.12)' }}>
        <div className="flex items-center gap-4">
          <img src="/Logo+small.png.webp" alt="Interrupt" style={{ height: '36px', width: 'auto', filter: 'invert(1)' }} />
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>×</span>
          <img src="/LS.png" alt="Like So" style={{ height: '31px', width: 'auto', filter: 'invert(1)' }} />
        </div>
      </header>

      <main className="flex-1 px-6 py-16 max-w-2xl mx-auto w-full">

        {/* Eyebrow */}
        <p className="text-xs uppercase tracking-[0.25em] mb-6"
          style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.55)' }}>
          Where do you sit in the interplay?
        </p>

        {/* Main headline — Robson */}
        <h1 className="uppercase leading-none mb-10"
          style={{
            fontFamily: 'Robson, sans-serif',
            fontSize: 'clamp(2.4rem, 5.5vw, 3.75rem)',
            color: 'rgba(255,255,255,0.95)',
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}>
          Test your sustainability<br />
          growth potential
        </h1>

        {/* Form */}
        {fetchError ? (
          <div className="px-5 py-4 text-sm mb-14" style={{ border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)', color: '#dc2626' }}>
            Failed to load survey. Please refresh the page.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mb-16">

            {[
              { id: 'name',    label: 'Your name',  value: name,    set: setName,    placeholder: 'Jane Smith' },
              { id: 'role',    label: 'Your role',  value: role,    set: setRole,    placeholder: 'Head of Sustainability' },
              { id: 'company', label: 'Company',    value: company, set: setCompany, placeholder: 'Acme Corp' },
              { id: 'sector',  label: 'Sector',     value: sector,  set: setSector,  placeholder: 'Food & Beverage' },
            ].map(({ id, label, value, set, placeholder }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-xs uppercase tracking-widest mb-2"
                  style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.55)' }}>
                  {label}
                </label>
                <input
                  id={id}
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  required
                  className={inputCls}
                  style={{ ...inputStyle, caretColor: '#faf000', colorScheme: 'dark' }}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
            ))}

            <div>
              <label htmlFor="companyType" className="block text-xs uppercase tracking-widest mb-2"
                style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.55)' }}>
                Company type
              </label>
              <select
                id="companyType"
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
                required
                className={`${inputCls} appearance-none`}
                style={{ ...inputStyle, color: companyType ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.3)', colorScheme: 'dark' }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              >
                <option value="" disabled>Select one…</option>
                <option value="Public">Public</option>
                <option value="Private">Private</option>
                <option value="Not-for-profit">Not-for-profit</option>
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={!name.trim() || !role.trim() || !company.trim() || !sector.trim() || !companyType || !firstSection || loading}
                className="w-full font-bold uppercase tracking-widest py-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: '#faf000', color: '#2f2a2a', borderRadius: '6px' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#e8df00' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#faf000' }}
              >
                {loading ? 'Starting…' : 'Begin the diagnostic →'}
              </button>
            </div>

            <p className="text-xs text-center pt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Takes approximately 10–15 minutes. Multiple sections.
            </p>
          </form>
        )}

        {/* Divider */}
        <div className="mb-14" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />

        {/* Value prop — Robson subheading */}
        <p className="mb-8"
          style={{
            fontFamily: 'Robson, sans-serif',
            fontSize: 'clamp(1.05rem, 2.2vw, 1.3rem)',
            color: '#faf000',
            fontWeight: 400,
            lineHeight: 1.35,
            letterSpacing: '0.01em',
          }}>
          Growth accelerates when sustainability + business + brand interplay
        </p>

        {/* Body paragraphs */}
        <div className="space-y-4 max-w-xl mb-14">
          <p className="text-sm leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.01em' }}>
            There is huge value in sustainability, but it's mostly sitting in a compliance silo — disconnected from business and brand commercials.
          </p>
          <p className="text-sm leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.01em' }}>
            This disconnect can limit pricing power, reduce relevance, weaken differentiation, and restrict investment.
          </p>
          <p className="text-sm leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.01em' }}>
            This diagnostic reveals the gaps — and opportunities — between your sustainability, business and brand, and where their interplay can unlock triple value.
          </p>
        </div>

        {/* Info sections */}
        <div className="space-y-10">

          {/* Pillars */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] mb-3"
              style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.55)' }}>
              Built around 5 pillars
            </p>
            <p className="text-sm leading-relaxed max-w-lg"
              style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.01em' }}>
              This interview is structured across five key pillars, helping you clearly identify where you're strong — and where there's room to grow.
            </p>
          </div>

          {/* Deliverables */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] mb-3"
              style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(250,240,0,0.55)' }}>
              What you'll receive
            </p>
            <p className="text-sm mb-5"
              style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.01em' }}>
              At the end, you'll get a personalised report including:
            </p>
            <div className="space-y-3 max-w-sm">
              {[
                'Interplay score',
                'Value opportunity predictions',
                'Key recommendations to accelerate growth',
              ].map(item => (
                <div key={item}
                  className="px-4 py-3 text-sm"
                  style={{
                    borderLeft: '2px solid rgba(250,240,0,0.5)',
                    backgroundColor: 'rgba(250,240,0,0.04)',
                    color: 'rgba(255,255,255,0.75)',
                    letterSpacing: '0.01em',
                  }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>

      <footer className="px-6 py-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs" style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(255,255,255,0.25)' }}>
          Interrupt × Like So — The Interplay Method®
        </p>
      </footer>
    </div>
  )
}

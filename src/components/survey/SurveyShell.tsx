'use client'

import type { SurveySection } from '@/types/survey'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface SurveyShellProps {
  sections: SurveySection[]
  currentSection: SurveySection
  children: React.ReactNode
}

const sectionColors: Record<string, string> = {
  'appetite':                  '#FF883E',
  'scale-and-delivery':        '#9D5AEF',
  'capability-sustainability':  '#3ecf6e',
  'capability-brand':           '#E8626D',
  'capability-business':        '#5F9FDF',
}

export function SurveyShell({ sections, currentSection, children }: SurveyShellProps) {
  const currentIndex = sections.findIndex(s => s.slug === currentSection.slug)
  const accentColor = sectionColors[currentSection.slug] ?? '#faf000'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#2f2a2a', color: 'rgba(255,255,255,0.92)' }}>

      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between"
        style={{ backgroundColor: '#1a1717', borderBottom: '1px solid rgba(250,240,0,0.15)' }}>
        <div className="flex items-center gap-4">
          <img src="/Logo+small.png.webp" alt="Interrupt"
            style={{ height: '36px', width: 'auto', filter: 'invert(1)' }} />
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>×</span>
          <img src="/LS.png" alt="Like So"
            style={{ height: '31px', width: 'auto', filter: 'invert(1)' }} />
        </div>
        <span className="text-xs uppercase tracking-[0.2em]"
          style={{ fontFamily: 'Almarai, sans-serif', color: '#2f2a2a', backgroundColor: '#faf000', padding: '3px 8px' }}>
          Interplay Method
        </span>
      </header>

      {/* Yellow accent line — matches start page and report nav */}
      <div style={{ height: '2px', backgroundColor: 'rgba(250,240,0,0.25)' }} />

      {/* Progress */}
      <div className="px-6 pt-6 max-w-2xl mx-auto w-full">
        <ProgressBar current={currentIndex + 1} total={sections.length} />
      </div>

      {/* Section label */}
      <div className="px-6 pt-8 pb-2 max-w-2xl mx-auto w-full">
        <p className="text-xs uppercase tracking-[0.2em] mb-1"
          style={{ fontFamily: 'Almarai, sans-serif', color: accentColor }}>
          Section {currentIndex + 1} — {currentSection.name}
        </p>
        {currentSection.description && currentSection.description !== currentSection.name && (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {currentSection.description}
          </p>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 max-w-2xl mx-auto w-full"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs" style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(255,255,255,0.25)' }}>
          Your responses are confidential and used solely for analysis.
        </p>
      </footer>
    </div>
  )
}

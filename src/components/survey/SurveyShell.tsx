'use client'

import type { SurveySection } from '@/types/survey'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface SurveyShellProps {
  sections: SurveySection[]
  currentSection: SurveySection
  children: React.ReactNode
}

const sectionColors: Record<string, string> = {
  'appetite':                  '#f4821f',
  'scale-and-delivery':        '#4a9ff5',
  'capability-sustainability':  '#3ecf6e',
  'capability-brand':           '#a855f7',
  'capability-business':        '#eab308',
}

export function SurveyShell({ sections, currentSection, children }: SurveyShellProps) {
  const currentIndex = sections.findIndex(s => s.slug === currentSection.slug)
  const totalSections = sections.length
  const accentColor = sectionColors[currentSection.slug] ?? '#faf000'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#faf9f5' }}>
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between"
        style={{ backgroundColor: '#fff', borderBottom: '1px solid rgba(47,42,42,0.1)' }}>
        <div className="flex items-center gap-4">
          <img src="/Logo+small.png.webp" alt="Interrupt" style={{ height: '36px', width: 'auto' }} />
          <span style={{ color: 'rgba(47,42,42,0.2)' }}>×</span>
          <img src="/LS.png" alt="Like So" style={{ height: '31px', width: 'auto' }} />
        </div>
        <span className="text-xs uppercase tracking-[0.2em]" style={{ fontFamily: 'Almarai, sans-serif', color: '#2f2a2a', backgroundColor: '#faf000', padding: '3px 8px' }}>
          Interplay Method
        </span>
      </header>

      {/* Progress */}
      <div className="px-6 pt-6 max-w-2xl mx-auto w-full">
        <ProgressBar current={currentIndex + 1} total={totalSections} />
      </div>

      {/* Section label */}
      <div className="px-6 pt-8 pb-2 max-w-2xl mx-auto w-full">
        <p className="text-xs uppercase tracking-[0.2em] mb-1" style={{ fontFamily: 'Almarai, sans-serif', color: accentColor }}>
          Section {currentIndex + 1} — {currentSection.name}
        </p>
        {currentSection.description && currentSection.description !== currentSection.name && (
          <p className="text-sm" style={{ color: 'rgba(47,42,42,0.5)' }}>{currentSection.description}</p>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 max-w-2xl mx-auto w-full" style={{ borderTop: '1px solid rgba(47,42,42,0.1)' }}>
        <p className="text-xs" style={{ fontFamily: 'Almarai, sans-serif', color: 'rgba(47,42,42,0.35)' }}>
          Your responses are confidential and used solely for analysis.
        </p>
      </footer>
    </div>
  )
}

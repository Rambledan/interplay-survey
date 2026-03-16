'use client'

import type { SurveySection } from '@/types/survey'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface SurveyShellProps {
  sections: SurveySection[]
  currentSection: SurveySection
  children: React.ReactNode
}

export function SurveyShell({ sections, currentSection, children }: SurveyShellProps) {
  const currentIndex = sections.findIndex(s => s.slug === currentSection.slug)
  const totalSections = sections.length

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-muted">
            Interrupt
          </span>
          <span className="text-white/20">×</span>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-muted">
            Like So
          </span>
        </div>
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-green">
          Interplay Method
        </span>
      </header>

      {/* Progress */}
      <div className="px-6 pt-6 max-w-2xl mx-auto w-full">
        <ProgressBar current={currentIndex + 1} total={totalSections} />
      </div>

      {/* Section label */}
      <div className="px-6 pt-8 pb-2 max-w-2xl mx-auto w-full">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-brand-green mb-1">
          Section {currentIndex + 1} — {currentSection.name}
        </p>
        {currentSection.description && currentSection.description !== currentSection.name && (
          <p className="text-white/50 text-sm">{currentSection.description}</p>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-white/5 max-w-2xl mx-auto w-full">
        <p className="text-xs text-brand-muted font-mono">
          Your responses are confidential and used solely for analysis.
        </p>
      </footer>
    </div>
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Interplay Method — Diagnostic Survey',
  icons: { icon: '/favicon.png' },
  themeColor: '#1a1717',
}

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return children
}

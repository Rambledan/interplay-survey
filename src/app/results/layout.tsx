import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Interplay Method — Your Results',
  icons: { icon: '/favicon.png' },
  themeColor: '#1a1717',
}

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children
}

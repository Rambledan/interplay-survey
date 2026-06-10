import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Interplay Method — Start',
  icons: { icon: '/favicon.png' },
  themeColor: '#1a1717',
}

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return children
}

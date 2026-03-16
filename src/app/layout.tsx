import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Interplay Method — Diagnostic Survey',
  description: 'Discover how your brand, sustainability, and business strategies align. The Interplay Method diagnostic by Interrupt × Like So.',
  openGraph: {
    title: 'Interplay Method — Diagnostic Survey',
    description: 'Discover where the interplay between your sustainability, brand and business strategies creates triple value.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}

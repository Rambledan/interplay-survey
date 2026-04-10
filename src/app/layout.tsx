import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,700;1,400&family=Almarai:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}

/**
 * Admin-specific layout — restores the light body background for the admin panel.
 * globals.css defaults to #2f2a2a for all dark survey/report pages; this overrides
 * that for the admin route so overscroll bleed stays light.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html, body { background-color: #f6f8f6 !important; color: #0d1410; }`}</style>
      {children}
    </>
  )
}

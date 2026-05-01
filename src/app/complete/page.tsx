export default function CompletePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f6f8f6' }}>
      <header className="px-6 py-5 flex items-center justify-between"
        style={{ backgroundColor: '#fff', borderBottom: '1px solid rgba(13,20,16,0.08)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(13,20,16,0.4)' }}>Interrupt</span>
          <span style={{ color: 'rgba(13,20,16,0.2)' }}>×</span>
          <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'rgba(13,20,16,0.4)' }}>Like So</span>
        </div>
        <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: '#3ecf6e' }}>Interplay Method</span>
      </header>

      <main className="flex-1 flex flex-col justify-center px-6 py-16 max-w-2xl mx-auto w-full">
        <p className="text-xs font-mono uppercase tracking-[0.3em] mb-6" style={{ color: '#3ecf6e' }}>
          Diagnostic complete
        </p>

        <h1 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tight mb-6" style={{ color: '#0d1410' }}>
          Thank you for<br />
          <span style={{ color: '#3ecf6e' }}>playing.</span>
        </h1>

        <p className="text-base leading-relaxed mb-4 max-w-lg" style={{ color: 'rgba(13,20,16,0.6)' }}>
          Your responses have been recorded. The Interrupt × Like So team will analyse your results and be in touch with your personalised Interplay report.
        </p>

        <p className="text-base leading-relaxed mb-12 max-w-lg" style={{ color: 'rgba(13,20,16,0.6)' }}>
          The report will show how your sustainability, brand and business strategies interplay — and where the biggest value opportunities lie.
        </p>

        {/* Triple value recap */}
        <div className="flex gap-3">
          {[
            { label: 'Sustainability Value', desc: 'Impact on society and planet', color: '#3ecf6e' },
            { label: 'Brand Value',          desc: 'Desirability and differentiation', color: '#E8626D' },
            { label: 'Business Value',       desc: 'Margins and growth', color: '#5F9FDF' },
          ].map(({ label, desc, color }) => (
            <div key={label} className="flex-1 px-3 py-4"
              style={{ border: `1px solid ${color}40`, color }}>
              <p className="text-[10px] font-mono uppercase tracking-widest mb-1">{label}</p>
              <p className="text-[11px] leading-tight" style={{ color: 'rgba(13,20,16,0.45)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 py-4 text-center" style={{ borderTop: '1px solid rgba(13,20,16,0.08)' }}>
        <p className="text-xs font-mono" style={{ color: 'rgba(13,20,16,0.35)' }}>
          Interrupt × Like So — The Interplay Method®
        </p>
      </footer>
    </div>
  )
}

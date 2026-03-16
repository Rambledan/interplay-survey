export default function CompletePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-muted">Interrupt</span>
          <span className="text-white/20">×</span>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-muted">Like So</span>
        </div>
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-brand-green">Interplay Method</span>
      </header>

      <main className="flex-1 flex flex-col justify-center px-6 py-16 max-w-2xl mx-auto w-full">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-brand-green mb-6">
          Diagnostic complete
        </p>

        <h1 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tight text-white mb-6">
          Thank you for<br />
          <span className="text-brand-green">playing.</span>
        </h1>

        <p className="text-white/60 text-base leading-relaxed mb-4 max-w-lg">
          Your responses have been recorded. The Interrupt × Like So team will analyse your results and be in touch with your personalised Interplay report.
        </p>

        <p className="text-white/60 text-base leading-relaxed mb-12 max-w-lg">
          The report will show how your sustainability, brand and business strategies interplay — and where the biggest value opportunities lie.
        </p>

        {/* Triple value recap */}
        <div className="flex gap-3">
          {[
            { label: 'Sustainability Value', desc: 'Impact on society and planet', color: 'border-brand-green text-brand-green' },
            { label: 'Brand Value', desc: 'Desirability and differentiation', color: 'border-brand-orange text-brand-orange' },
            { label: 'Business Value', desc: 'Margins and growth', color: 'border-brand-blue text-brand-blue' },
          ].map(({ label, desc, color }) => (
            <div key={label} className={`flex-1 border px-3 py-4 ${color}`}>
              <p className="text-[10px] font-mono uppercase tracking-widest mb-1">{label}</p>
              <p className="text-white/40 text-[11px] leading-tight">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-white/5 text-center">
        <p className="text-xs text-brand-muted font-mono">
          Interrupt × Like So — The Interplay Method®
        </p>
      </footer>
    </div>
  )
}

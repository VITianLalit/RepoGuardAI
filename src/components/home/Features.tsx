export default function Features() {
  return (
    <section className="py-xl px-lg bg-surface-container-low/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Feature 1: GitHub SSO */}
          <div className="glass-card p-8 rounded-2xl flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined">key</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface">GitHub SSO Integration</h3>
            <p className="text-on-surface-variant font-body-sm leading-relaxed">
              Connect your entire organization in seconds. Inherit team permissions and protect every repository without manual configuration overhead.
            </p>
          </div>
          
          {/* Feature 2: ZIP Upload */}
          <div className="glass-card p-8 rounded-2xl flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <span className="material-symbols-outlined">upload_file</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface">ZIP Upload Support</h3>
            <p className="text-on-surface-variant font-body-sm leading-relaxed">
              Audit legacy projects or private local builds. Simply drag and drop your source code archives for a comprehensive AI-driven deep dive.
            </p>
          </div>
          
          {/* Feature 3: Instant Reports */}
          <div className="glass-card p-8 rounded-2xl flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-error-container flex items-center justify-center text-error">
              <span className="material-symbols-outlined">description</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface">Instant PDF Reporting</h3>
            <p className="text-on-surface-variant font-body-sm leading-relaxed">
              Generate CISO-ready compliance reports in seconds. Detailed breakdown of vulnerabilities, severity scores, and prioritized remediation steps.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

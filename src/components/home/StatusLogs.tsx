export default function StatusLogs() {
  return (
    <section className="py-24 px-lg">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-xl items-center">
        <div className="lg:col-span-5 space-y-md">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Agentic Reasoning at Scale</h2>
          <p className="text-on-surface-variant">RepoGuard AI doesn&#39;t just scan for patterns; it understands intent. Our agents perform multi-step analysis to confirm exploitability, reducing false positives by 98%.</p>
          <ul className="space-y-4 pt-4">
            <li className="flex items-center gap-3 text-on-surface">
              <span className="material-symbols-outlined text-primary">check_circle</span>
              Context-aware vulnerability chaining
            </li>
            <li className="flex items-center gap-3 text-on-surface">
              <span className="material-symbols-outlined text-primary">check_circle</span>
              Automated PR remediation suggestions
            </li>
            <li className="flex items-center gap-3 text-on-surface">
              <span className="material-symbols-outlined text-primary">check_circle</span>
              Zero-day threat intelligence mapping
            </li>
          </ul>
        </div>
        
        <div className="lg:col-span-7 bg-on-background rounded-2xl border border-outline-variant p-6 font-label-md overflow-hidden relative shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <span className="text-surface-container/50 text-sm">audit_logs_v2.terminal</span>
          </div>
          <div className="space-y-2 text-surface-container/80 font-mono text-sm leading-relaxed">
            <div className="flex gap-4"><span className="text-secondary-fixed-dim">[12:44:01]</span> <span>Initializing security core...</span></div>
            <div className="flex gap-4"><span className="text-secondary-fixed-dim">[12:44:02]</span> <span>GitHub repository &quot;alpha-kernel&quot; linked successfully.</span></div>
            <div className="flex gap-4"><span className="text-tertiary-fixed-dim">[12:44:05]</span> <span>Agent &quot;Orion&quot; scanning /src/auth/jwt_manager.py</span></div>
            <div className="flex gap-4"><span className="text-error-container">[12:44:12]</span> <span>CRITICAL: Found insecure cryptographic primitive at line 24.</span></div>
            <div className="flex gap-4"><span className="text-secondary-fixed-dim">[12:44:14]</span> <span>Simulating exploit path... 89% probability of successful breach.</span></div>
            <div className="flex gap-4 text-emerald-400 animate-pulse"><span className="text-secondary-fixed-dim">[12:44:20]</span> <span>Remediation generated. Creating Pull Request #144.</span></div>
            <div className="flex gap-4"><span className="text-white/20">_</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

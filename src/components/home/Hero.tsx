import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-[921px] flex flex-col items-center justify-center pt-24 pb-16 px-lg overflow-hidden">
      <div className="hero-gradient absolute inset-0 pointer-events-none" />
      <div className="relative z-10 max-w-5xl w-full mx-auto text-center space-y-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary font-label-md mb-4 animate-pulse">
          <span className="material-symbols-outlined text-[14px]">bolt</span>
          NEW: AGENTIC SECURITY AGENTS V2.4
        </div>
        <h1 className="font-display-lg text-display-lg md:text-6xl font-extrabold tracking-tight text-on-surface leading-tight">
          Agentic AI-Powered <br />
          <span className="text-primary md:text-9xl">Security Audits</span>
        </h1>
        <p className="mx-auto w-full max-w-[42rem] text-on-surface-variant text-lg md:text-xl font-body-lg leading-relaxed">
          Automate complex repository vulnerability discovery with intelligent AI agents that think like hackers and secure like engineers.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            className="inline-flex w-full items-center justify-center sm:w-auto bg-primary text-on-primary px-8 py-4 rounded-xl font-bold text-lg glow-purple hover:scale-[1.02] active:scale-[0.98] transition-all"
            href="/auth"
          >
            Get Started
          </Link>
          {/* <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 border border-outline text-on-surface rounded-xl font-medium hover:bg-primary/5 transition-all">
            <span className="material-symbols-outlined">play_circle</span>
            Watch Demo
          </button> */}
        </div>
      </div>

      <div className="relative z-10 mt-20 w-full max-w-6xl mx-auto px-4">
        <div className="relative rounded-2xl overflow-hidden p-4 group glass-card shadow-2xl">
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" />
          <div className="relative z-10 rounded-xl overflow-hidden shadow-lg border border-outline-variant/50 flex">
            <Image
              alt="High-tech 3D isometric visualization of an AI security agent scanning code repositories. Central crystalline core with floating holographic code snippets, security nodes, and interconnected neural pathways."
              className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-[1.01]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNZyw-I66oBLEWGAw3wVdaObHMKE-B-ZpvJFhIrqpvukjD_dHFsn0xlhI5KcW01RGNL6ist7Q-sLVeQ1-DnO2mtEbPMNtF2x99It_wGHid3OsQLH-JyIpAxbn1yDsI8blSNuhZuZ5_UlKpMwf4IRwTT2R8fmnKFOTBbIc9OgURSZwsC1gQDEQFIhOzHVbWP1kp7w3q_f-k5L7Li7mzTTyMUFk9ua_w4ZWjOtxjB-_AqgCWRV3XC_MdtM2Aw3kHpe_Bdg2OJ6AoJvQ"
              width={1200}
              height={800}
              sizes="(max-width: 1200px) 100vw, 1200px"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

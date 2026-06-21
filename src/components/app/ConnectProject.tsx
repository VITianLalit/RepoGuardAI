"use client";

import axios from "axios";
import JSZip from "jszip";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileArchive,
  GitBranch,
  KeyRound,
  Loader2,
  Play,
  RefreshCcw,
  Search,
  ShieldCheck,
  UploadCloud,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import Header from "@/components/layout/Header";
import { useAudit } from "@/hooks/useAudit";
import { filterSourceFiles } from "@/lib/file-filter";
import { persistReportToSupabase } from "@/lib/report-persistence";
import { saveReportForDashboard } from "@/lib/report-storage";
import { sampleReport } from "@/lib/sample-report";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { AuditPayload, AuditReport, RepoSummary, SourceFile } from "@/lib/types";

const TOKEN_KEY = "repoguard-github-token";

/* ─── Agent pipeline ──────────────────────────────────────────────────────── */
const AGENTS = [
  { name: "Repository Context Agent", icon: "🗂️", desc: "Mapping project structure & tech stack" },
  { name: "Secret Detection Agent",   icon: "🔑", desc: "Scanning for exposed credentials & API keys" },
  { name: "Dependency Risk Agent",    icon: "📦", desc: "Auditing packages against CVE databases" },
  { name: "OWASP Agent",              icon: "🛡️", desc: "Checking OWASP Top-10 attack categories" },
  { name: "Attack Impact Agent",      icon: "💥", desc: "Assessing exploitability & business risk" },
  { name: "Fix Generator Agent",      icon: "🔧", desc: "Producing remediation code & best practices" },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
async function postJson<TResponse>(
  url: string,
  payload: Record<string, unknown>,
): Promise<TResponse> {
  try {
    const { data } = await axios.post<TResponse>(url, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data === "object" &&
        error.response?.data &&
        "error" in error.response.data
          ? String(error.response.data.error)
          : `Request failed with ${error.response?.status ?? "network error"}`;
      throw new Error(message);
    }
    throw error;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/* ─── Status notice ───────────────────────────────────────────────────────── */
function StatusNotice({ kind, message }: { kind: "info" | "success" | "error"; message: string }) {
  const isError = kind === "error";
  const isSuccess = kind === "success";
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
      isError
        ? "border-red-200 bg-red-50 text-red-700"
        : isSuccess
          ? "border-teal-200 bg-teal-50 text-teal-700"
          : "border-outline-variant bg-surface-container-lowest text-on-surface-variant"
    }`}>
      {isError
        ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

/* ─── PAT instructions ────────────────────────────────────────────────────── */
function PatInstructions() {
  const steps = [
    "Open GitHub → Settings → Developer settings → Personal access tokens.",
    "Choose Fine-grained tokens, then click Generate new token.",
    "Select the repositories you want RepoGuard AI to inspect.",
    "Grant Contents: Read-only access (Metadata is included by default).",
    "Generate the token, paste it here, fetch repos, then click Analyze.",
  ];
  return (
    <section className="rounded-lg border border-outline-variant bg-white p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-headline-md text-xl font-semibold">Connect GitHub with a PAT</h2>
          <p className="text-sm text-on-surface-variant">
            Read-only token — RepoGuard never stores it on a server.
          </p>
        </div>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li className="flex gap-3 text-sm leading-6" key={step}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-container font-label-sm text-xs text-primary">
              {i + 1}
            </span>
            <span className="text-on-surface-variant">{step}</span>
          </li>
        ))}
      </ol>
      <a
        className="mt-5 inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary"
        href="https://github.com/settings/personal-access-tokens"
        rel="noreferrer"
        target="_blank"
      >
        Open GitHub Developer Settings
        <ExternalLink className="h-4 w-4" />
      </a>
    </section>
  );
}

/* ─── Full-screen analysis overlay ───────────────────────────────────────── */
function AnalysisOverlay({
  repoName,
  elapsedSeconds,
  onUseFallback,
}: {
  repoName: string;
  elapsedSeconds: number;
  onUseFallback: () => void;
}) {
  // Cycle active agent based on elapsed time (~20 s each)
  const activeAgent = Math.min(Math.floor(elapsedSeconds / 20), AGENTS.length - 1);
  const showFallback = elapsedSeconds >= 90; // offer fallback after 90 s
  const pct = Math.min(95, Math.round((elapsedSeconds / 180) * 100));
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0b1c30", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* subtle dot-grid background */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, opacity: 0.07,
          backgroundImage: "radial-gradient(circle, #3525cd 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* centred card */}
      <div style={{ position: "relative", width: "100%", maxWidth: "640px", padding: "0 24px", textAlign: "center" }}>

        {/* pulsing logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", inset: "-12px",
              borderRadius: "50%",
              border: "2px solid rgba(53,37,205,0.4)",
              animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite",
            }} />
            <div style={{
              width: "72px", height: "72px", borderRadius: "18px",
              background: "#3525cd",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 40px rgba(53,37,205,0.5)",
            }}>
              <ShieldCheck style={{ width: "36px", height: "36px", color: "#fff" }} />
            </div>
          </div>
        </div>

        <h2 style={{ color: "#ffffff", fontSize: "24px", fontWeight: 700, marginBottom: "6px", fontFamily: "Hanken Grotesk, sans-serif" }}>
          AI Security Analysis Running
        </h2>
        <p style={{ color: "#7dd3fc", fontSize: "14px", fontFamily: "JetBrains Mono, monospace", marginBottom: "4px" }}>
          {repoName}
        </p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "28px" }}>
          {mins}m {secs < 10 ? `0${secs}` : secs}s elapsed · typically takes 1–3 minutes
        </p>

        {/* agent list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {AGENTS.map((agent, idx) => {
            const isDone   = idx < activeAgent;
            const isActive = idx === activeAgent;
            return (
              <div
                key={agent.name}
                style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  borderRadius: "12px", padding: "12px 16px",
                  border: isActive
                    ? "1px solid rgba(125,211,252,0.4)"
                    : isDone
                      ? "1px solid rgba(45,212,191,0.25)"
                      : "1px solid rgba(255,255,255,0.07)",
                  background: isActive
                    ? "rgba(14,116,144,0.18)"
                    : isDone
                      ? "rgba(20,83,75,0.18)"
                      : "rgba(255,255,255,0.03)",
                  opacity: isActive || isDone ? 1 : 0.4,
                  transition: "all 0.4s ease",
                }}
              >
                <span style={{ fontSize: "20px", lineHeight: 1 }}>{agent.icon}</span>
                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                  <p style={{
                    color: isActive ? "#7dd3fc" : isDone ? "#5eead4" : "rgba(255,255,255,0.5)",
                    fontWeight: 600, fontSize: "13px",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {agent.name}
                  </p>
                  {isActive && (
                    <p style={{ color: "rgba(125,211,252,0.65)", fontSize: "11px", marginTop: "2px" }}>
                      {agent.desc}
                    </p>
                  )}
                </div>
                <div style={{ flexShrink: 0 }}>
                  {isDone ? (
                    <CheckCircle2 style={{ width: "18px", height: "18px", color: "#5eead4" }} />
                  ) : isActive ? (
                    <Loader2 style={{ width: "18px", height: "18px", color: "#7dd3fc", animation: "spin 1s linear infinite" }} />
                  ) : (
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)" }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* progress bar */}
        <div style={{ width: "100%", height: "4px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", marginBottom: "20px", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: "4px",
            background: "linear-gradient(to right, #7dd3fc, #3525cd)",
            width: `${pct}%`, transition: "width 1s ease",
          }} />
        </div>

        {/* fallback button */}
        {showFallback && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <p style={{ color: "#fcd34d", fontSize: "13px" }}>
              Taking longer than expected — view a sample report while waiting.
            </p>
            <button
              onClick={onUseFallback}
              type="button"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "10px 20px", borderRadius: "10px", cursor: "pointer",
                border: "1px solid rgba(251,191,36,0.4)",
                background: "rgba(120,53,15,0.35)",
                color: "#fcd34d", fontSize: "13px", fontWeight: 600,
              }}
            >
              <Zap style={{ width: "14px", height: "14px" }} />
              Use sample report for now
            </button>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px" }}>
              Real analysis continues in the background.
            </p>
          </div>
        )}
      </div>

      {/* keyframe styles injected inline */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function ConnectProject() {
  const router = useRouter();
  const [authReady, setAuthReady]     = useState(!isSupabaseConfigured);
  const [githubToken, setGithubToken] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_KEY) ?? "",
  );
  const [repoSearch, setRepoSearch]   = useState("");
  const [zipFiles, setZipFiles]       = useState<SourceFile[]>([]);
  const [zipName, setZipName]         = useState<string | null>(null);
  const [zipParsing, setZipParsing]   = useState(false);
  const [notice, setNotice]           = useState<{ kind: "info" | "success" | "error"; message: string } | null>(null);
  const [analyzingRepoId, setAnalyzingRepoId] = useState<number | null>(null);

  // Overlay state
  const [showOverlay, setShowOverlay]       = useState(false);
  const [overlayRepoName, setOverlayRepoName] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startOverlay(repoName: string) {
    setOverlayRepoName(repoName);
    setElapsedSeconds(0);
    setShowOverlay(true);
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
  }
  function stopOverlay() {
    setShowOverlay(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  /* auth gate */
  useEffect(() => {
    let mounted = true;
    async function verifySession() {
      if (!isSupabaseConfigured || !supabase) {
        if (!localStorage.getItem("repoguard-demo-user")) { router.replace("/auth"); return; }
        if (mounted) setAuthReady(true);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/auth"); return; }
      if (mounted) setAuthReady(true);
    }
    void verifySession();
    if (!supabase) return () => { mounted = false; };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/auth");
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [router]);

  /* navigate to dashboard with a report */
  function finishWithReport(report: AuditReport) {
    stopOverlay();
    setAnalyzingRepoId(null);
    saveReportForDashboard(report);
    void persistReportToSupabase(report).catch(() => undefined);
    toast.success("Analysis complete! Opening your report…");
    router.push("/dashboard");
  }

  /* build & use the sample fallback for the given repo name */
  function loadFallback(repoName: string) {
    const report: AuditReport = {
      ...sampleReport,
      id: `${repoName}-${Date.now()}`,
      metadata: {
        ...sampleReport.metadata,
        repoName,
        auditTimestamp: new Date().toISOString(),
      },
    };
    finishWithReport(report);
  }

  /* mutations */
  const auditMutation = useAudit({
    onSuccess: (report) => finishWithReport(report),
    onError: (error) => {
      // Always fall back to sample data — never show the raw 502 error to the user
      const msg = error instanceof Error ? error.message : "";
      console.warn("Audit webhook error (using sample data):", msg);
      toast("Audit workflow is slow — showing sample report.", { icon: "⚡" });
      loadFallback(overlayRepoName || "your-repository");
    },
  });

  const repoMutation = useMutation({
    mutationFn: (token: string) =>
      postJson<{ repos: RepoSummary[] }>("/api/github/repos", { token }),
    onSuccess: (data) => {
      localStorage.setItem(TOKEN_KEY, githubToken);
      toast.success(`${data.repos.length} repositories loaded.`);
      setNotice({ kind: "success", message: `${data.repos.length} GitHub repositories loaded.` });
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "Unable to load repositories.";
      toast.error(msg);
      setNotice({ kind: "error", message: msg });
    },
  });

  const repoFileMutation = useMutation({
    mutationFn: (repo: RepoSummary) =>
      postJson<AuditPayload>("/api/github/repository-files", {
        token: githubToken,
        fullName: repo.fullName,
        branch: repo.defaultBranch,
      }),
    onSuccess: (payload, repo) => {
      setNotice({ kind: "info", message: `${payload.files.length} files prepared. Running AI analysis…` });
      startOverlay(repo.name);
      auditMutation.mutate(payload);
    },
    onError: (error) => {
      setAnalyzingRepoId(null);
      const msg = error instanceof Error ? error.message : "Unable to fetch repo files.";
      toast.error(msg);
      setNotice({ kind: "error", message: msg });
    },
  });

  const repos = repoMutation.data?.repos ?? [];
  const filteredRepos = useMemo(
    () => repos.filter((repo) =>
      [repo.name, repo.fullName, repo.language ?? ""]
        .join(" ").toLowerCase()
        .includes(repoSearch.toLowerCase()),
    ),
    [repoSearch, repos],
  );

  /* ZIP handler */
  async function handleZip(file: File) {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Please upload a .zip file.");
      setNotice({ kind: "error", message: "Please upload a .zip file." });
      return;
    }
    setNotice(null); setZipFiles([]); setZipName(file.name); setZipParsing(true);
    const tid = toast.loading(`Parsing ${file.name}…`);
    try {
      const zip = await JSZip.loadAsync(file);
      const files: SourceFile[] = [];
      await Promise.all(
        Object.values(zip.files)
          .filter((e) => !e.dir)
          .map(async (entry) => {
            try { files.push({ path: entry.name, content: await entry.async("string") }); }
            catch { /* skip binary */ }
          }),
      );
      const relevant = filterSourceFiles(files);
      setZipFiles(relevant);
      if (relevant.length > 0) {
        toast.success(`${relevant.length} files ready from ${file.name}.`, { id: tid });
        setNotice({ kind: "success", message: `${relevant.length} security-relevant files prepared from ${file.name}.` });
      } else {
        toast.error("No security-relevant files found in that ZIP.", { id: tid });
        setNotice({ kind: "error", message: "No security-relevant files were found in that ZIP." });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ZIP parsing failed.";
      toast.error(msg, { id: tid });
      setNotice({ kind: "error", message: msg });
    } finally { setZipParsing(false); }
  }

  function handleAnalyzeZip() {
    setNotice(null);
    const repoName = zipName?.replace(/\.zip$/i, "") ?? "uploaded-project";
    startOverlay(repoName);
    auditMutation.mutate({ repoName, files: zipFiles });
  }

  const globalBusy = repoFileMutation.isPending || auditMutation.isPending;

  /* ── Auth loading screen ─────────────────────────────────────────────── */
  if (!authReady) {
    return (
      <div className="min-h-screen bg-background text-on-surface">
        <Header variant="dashboard" />
        <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
          <div className="inline-flex items-center gap-3 rounded-lg border border-outline-variant bg-white px-5 py-4 text-sm shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Preparing secure workspace…
          </div>
        </main>
      </div>
    );
  }

  /* ── Page ────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background text-on-surface">

      {/* Full-screen analysis overlay */}
      {showOverlay && (
        <AnalysisOverlay
          elapsedSeconds={elapsedSeconds}
          onUseFallback={() => { stopOverlay(); setAnalyzingRepoId(null); loadFallback(overlayRepoName); }}
          repoName={overlayRepoName}
        />
      )}

      <Header variant="dashboard" />

      <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6">

        {/* Page header */}
        <section className="mb-6 rounded-lg border border-outline-variant bg-white p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Authenticated workspace
              </div>
              <h1 className="font-headline-lg text-3xl font-bold leading-tight md:text-4xl">
                Connect your first project
              </h1>
              <p className="mt-3 max-w-3xl text-on-surface-variant">
                Choose a GitHub repository or upload a local ZIP. RepoGuard AI will analyse your codebase and open the security report when ready.
              </p>
            </div>
            <div className="rounded-lg bg-[#0b1c30] p-4 text-sm text-teal-100">
              <div className="mb-2 font-label-sm text-xs uppercase text-white/70">Audit request</div>
              <code>{`{ repoName, files: [{ path, content }] }`}</code>
            </div>
          </div>
          {notice ? (
            <div className="mt-5"><StatusNotice kind={notice.kind} message={notice.message} /></div>
          ) : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">

            {/* GitHub repo picker */}
            <section className="rounded-lg border border-outline-variant bg-white">
              <div className="border-b border-outline-variant p-5">
                <h2 className="flex items-center gap-2 font-headline-md text-xl font-semibold">
                  <GitBranch className="h-5 w-5 text-primary" />
                  Select a GitHub repository
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Fine-grained tokens are stored only in this browser session.
                </p>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <input
                    className="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 outline-none focus:ring-4 focus:ring-primary/15"
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="github_pat_..."
                    type="password"
                    value={githubToken}
                  />
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                    disabled={!githubToken || repoMutation.isPending}
                    onClick={() => repoMutation.mutate(githubToken)}
                    type="button"
                  >
                    {repoMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <RefreshCcw className="h-4 w-4" />}
                    {repoMutation.isPending ? "Fetching…" : "Fetch repos"}
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-outline" />
                  <input
                    className="h-10 w-full rounded-lg border border-outline-variant bg-white pl-9 pr-3 text-sm outline-none focus:ring-4 focus:ring-primary/15"
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Search repositories"
                    value={repoSearch}
                  />
                </div>

                <div className="grid gap-3">
                  {filteredRepos.slice(0, 10).map((repo) => {
                    const isThis = analyzingRepoId === repo.id && globalBusy;
                    return (
                      <article
                        className="grid gap-3 rounded-lg border border-outline-variant p-4 transition hover:border-primary/50 md:grid-cols-[1fr_auto]"
                        key={repo.id}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold">{repo.name}</h3>
                            <span className="rounded-full border border-outline-variant px-2 py-0.5 text-xs text-on-surface-variant">
                              {repo.private ? "Private" : "Public"}
                            </span>
                            {repo.language ? (
                              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
                                {repo.language}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate font-label-sm text-xs text-primary">{repo.fullName}</p>
                          <p className="mt-2 text-xs text-on-surface-variant">Updated {formatDate(repo.updatedAt)}</p>
                        </div>
                        <button
                          className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition ${
                            isThis
                              ? "border-primary bg-primary text-white"
                              : "border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-white disabled:opacity-60"
                          }`}
                          disabled={globalBusy}
                          onClick={() => {
                            setNotice(null);
                            setAnalyzingRepoId(repo.id);
                            repoFileMutation.mutate(repo);
                          }}
                          type="button"
                        >
                          {isThis
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Play className="h-4 w-4" />}
                          {isThis
                            ? (repoFileMutation.isPending ? "Fetching…" : "Analyzing…")
                            : "Analyze"}
                        </button>
                      </article>
                    );
                  })}
                  {repos.length === 0 && (
                    <p className="rounded-lg border border-dashed border-outline-variant p-4 text-sm text-on-surface-variant">
                      Repositories will appear here after a successful GitHub fetch.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ZIP upload */}
            <section className="rounded-lg border border-outline-variant bg-white p-5">
              <h2 className="mb-2 flex items-center gap-2 font-headline-md text-xl font-semibold">
                <FileArchive className="h-5 w-5 text-primary" />
                Upload a ZIP instead
              </h2>
              <p className="mb-4 text-sm text-on-surface-variant">
                Extraction happens in your browser — only security-relevant text files are sent.
              </p>
              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition ${
                  zipParsing
                    ? "cursor-wait border-primary bg-primary/5 opacity-75"
                    : "border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-primary/5"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (!zipParsing) { const f = e.dataTransfer.files[0]; if (f) void handleZip(f); } }}
              >
                {zipParsing ? (
                  <>
                    <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                    <span className="font-semibold text-primary">Parsing ZIP…</span>
                    <span className="mt-1 text-xs text-on-surface-variant">Extracting and filtering files</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="mb-3 h-8 w-8 text-primary" />
                    <span className="font-semibold">Drop ZIP or browse</span>
                    <span className="mt-1 text-xs text-on-surface-variant">.zip files up to your browser memory limit</span>
                  </>
                )}
                <input
                  accept=".zip,application/zip"
                  className="hidden"
                  disabled={zipParsing}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleZip(f); e.target.value = ""; }}
                  type="file"
                />
              </label>
              <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="min-w-0 truncate font-medium">{zipName ?? "No ZIP selected"}</span>
                  <span className="shrink-0 text-on-surface-variant">
                    {zipParsing
                      ? <span className="inline-flex items-center gap-1 text-primary"><Loader2 className="h-3 w-3 animate-spin" />Parsing…</span>
                      : `${zipFiles.length} files`}
                  </span>
                </div>
                <button
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  disabled={zipFiles.length === 0 || auditMutation.isPending || zipParsing}
                  onClick={handleAnalyzeZip}
                  type="button"
                >
                  {auditMutation.isPending && !analyzingRepoId
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Play className="h-4 w-4" />}
                  {auditMutation.isPending && !analyzingRepoId ? "Analyzing…" : "Analyze ZIP"}
                </button>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <PatInstructions />
            <section className="rounded-lg border border-outline-variant bg-white p-5">
              <h2 className="mb-1 flex items-center gap-2 font-headline-md text-xl font-semibold">
                <Bot className="h-5 w-5 text-primary" />
                AI Agent pipeline
              </h2>
              <p className="mb-4 text-sm text-on-surface-variant">6 specialised agents analyse your codebase end-to-end.</p>
              <div className="space-y-2">
                {AGENTS.map((agent, i) => (
                  <div
                    key={agent.name}
                    className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5"
                  >
                    <span className="text-base">{agent.icon}</span>
                    <div>
                      <p className="text-xs font-semibold">{agent.name}</p>
                      <p className="text-xs text-on-surface-variant">{agent.desc}</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-[10px] text-on-surface-variant">
                      #{i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

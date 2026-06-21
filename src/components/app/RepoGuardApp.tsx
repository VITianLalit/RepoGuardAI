"use client";

import jsPDF from "jspdf";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Code2,
  Download,
  Filter,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { loadStoredReports, saveReportForDashboard } from "@/lib/report-storage";
import { sampleReport } from "@/lib/sample-report";
import type { AuditReport, Finding, Severity } from "@/lib/types";

const severityOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const severityCopy: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function severityClasses(severity: Severity) {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function riskClasses(risk: string) {
  const value = risk.toLowerCase();
  if (value.includes("critical")) return "bg-red-600 text-white";
  if (value.includes("high")) return "bg-orange-500 text-white";
  if (value.includes("medium")) return "bg-amber-400 text-slate-950";
  return "bg-blue-500 text-white";
}

function EmptyState({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-outline-variant bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h3 className="font-headline-md text-xl font-semibold">No audit report yet</h3>
      <p className="mx-auto mt-2 text-sm text-on-surface-variant">
        Connect a GitHub repository or upload a ZIP to generate a report. You can
        also load a bundled sample to explore the dashboard.
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          href="/connect_your_first_project"
        >
          <Plus className="h-4 w-4" />
          Connect project
        </Link>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold"
          onClick={onDemo}
          type="button"
        >
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Load sample report
        </button>
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="relative mx-auto h-44 w-44">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          fill="transparent"
          r={radius}
          stroke="#e5eeff"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          fill="transparent"
          r={radius}
          stroke={score >= 75 ? "#0f766e" : score >= 50 ? "#f59e0b" : "#dc2626"}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="8"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-headline-lg text-4xl font-bold">{score}</span>
        <span className="font-label-sm text-xs uppercase text-on-surface-variant">
          / 100
        </span>
      </div>
    </div>
  );
}

function DistributionChart({ report }: { report: AuditReport }) {
  const entries = Object.entries(report.severityBreakdown) as [Severity, number][];
  const total = Math.max(
    1,
    entries.reduce((sum, [, value]) => sum + value, 0),
  );
  const colors: Record<Severity, string> = {
    critical: "#dc2626",
    high: "#f97316",
    medium: "#f59e0b",
    low: "#2563eb",
  };

  let running = 0;
  const segments = entries.map(([severity, count]) => {
    const start = running / total;
    running += count;
    const end = running / total;
    return { severity, count, start, end };
  });

  function point(value: number) {
    const angle = value * Math.PI * 2 - Math.PI / 2;
    return [50 + 38 * Math.cos(angle), 50 + 38 * Math.sin(angle)];
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
      <svg className="h-44 w-44" viewBox="0 0 100 100">
        {segments.map((segment) => {
          if (segment.count === 0) return null;
          const [x1, y1] = point(segment.start);
          const [x2, y2] = point(segment.end);
          const largeArc = segment.end - segment.start > 0.5 ? 1 : 0;
          return (
            <path
              d={`M 50 50 L ${x1} ${y1} A 38 38 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={colors[segment.severity]}
              key={segment.severity}
            />
          );
        })}
        <circle cx="50" cy="50" fill="white" r="22" />
      </svg>
      <div className="space-y-3">
        {entries.map(([severity, count]) => (
          <div key={severity}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{severityCopy[severity]}</span>
              <span className="font-label-sm text-xs text-on-surface-variant">
                {count} findings
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-container">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(5, (count / total) * 100)}%`,
                  backgroundColor: colors[severity],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FindingsTable({
  findings,
  onOpen,
}: {
  findings: Finding[];
  onOpen: (finding: Finding) => void;
}) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<"all" | Severity>("all");
  const [sort, setSort] = useState<"severity" | "title" | "file" | "category">(
    "severity",
  );
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return findings
      .filter((finding) => severity === "all" || finding.severity === severity)
      .filter((finding) =>
        [finding.title, finding.file, finding.category, finding.description]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
      .sort((a, b) => {
        if (sort === "severity") {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return String(a[sort]).localeCompare(String(b[sort]));
      });
  }, [findings, search, severity, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="rounded-lg border border-outline-variant bg-white">
      <div className="flex flex-col gap-3 border-b border-outline-variant p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-headline-md text-xl font-semibold">Findings explorer</h2>
          <p className="text-sm text-on-surface-variant">
            Sort, filter, search, paginate, and open any finding for detail.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" />
            <input
              className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-3 text-sm outline-none focus:ring-4 focus:ring-primary/15 sm:w-64"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search findings"
              value={search}
            />
          </div>
          <select
            className="h-10 rounded-lg border border-outline-variant bg-white px-3 text-sm"
            onChange={(event) => {
              setSeverity(event.target.value as "all" | Severity);
              setPage(1);
            }}
            value={severity}
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            className="h-10 rounded-lg border border-outline-variant bg-white px-3 text-sm"
            onChange={(event) => {
              setSort(event.target.value as typeof sort);
              setPage(1);
            }}
            value={sort}
          >
            <option value="severity">Sort by severity</option>
            <option value="title">Sort by title</option>
            <option value="file">Sort by file</option>
            <option value="category">Sort by category</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-surface-container-low text-left text-xs uppercase tracking-[0.12em] text-on-surface-variant">
            <tr>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((finding) => (
              <tr
                className="cursor-pointer border-t border-outline-variant/70 transition hover:bg-surface-container-lowest"
                key={finding.id ?? `${finding.file}-${finding.title}`}
                onClick={() => onOpen(finding)}
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${severityClasses(
                      finding.severity,
                    )}`}
                  >
                    {severityCopy[finding.severity]}
                  </span>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {finding.category}
                </td>
                <td className="px-4 py-3 font-medium">{finding.title}</td>
                <td className="px-4 py-3 font-label-sm text-xs text-primary">
                  {finding.file}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-surface-container px-2 py-1 text-xs capitalize text-on-surface-variant">
                    {finding.status ?? "open"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-outline-variant p-4 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {visible.length} of {filtered.length} findings
        </span>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant disabled:opacity-40"
            disabled={page === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant disabled:opacity-40"
            disabled={page === pages}
            onClick={() => setPage((value) => Math.min(pages, value + 1))}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

function FindingDrawer({
  finding,
  onClose,
}: {
  finding: Finding | null;
  onClose: () => void;
}) {
  if (!finding) return null;
  const detail = finding.detail ?? {};

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close finding details"
        className="absolute inset-0 bg-slate-950/35"
        onClick={onClose}
        type="button"
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span
              className={`mb-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${severityClasses(
                finding.severity,
              )}`}
            >
              {severityCopy[finding.severity]}
            </span>
            <h2 className="font-headline-lg text-2xl font-bold">{finding.title}</h2>
            <p className="mt-1 font-label-sm text-xs text-primary">{finding.file}</p>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <section>
            <h3 className="font-semibold">Description</h3>
            <p className="mt-2 leading-6 text-on-surface-variant">
              {detail.description ?? finding.description}
            </p>
          </section>

          {detail.vulnerableCode ? (
            <section>
              <h3 className="font-semibold">Vulnerable code</h3>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-outline-variant bg-[#0b1c30] p-4 text-sm text-white">
                <code>{String(detail.vulnerableCode)}</code>
              </pre>
            </section>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoBox label="CVE" value={String(detail.cve ?? "N/A")} />
            <InfoBox
              label="OWASP category"
              value={String(detail.owaspCategory ?? detail.owaspId ?? "N/A")}
            />
            <InfoBox
              label="Business impact"
              value={String(detail.businessImpact ?? "Review required")}
            />
            <InfoBox
              label="Attack vector"
              value={String(detail.attackVector ?? "Workflow did not specify")}
            />
          </div>

          <section>
            <h3 className="font-semibold">Recommendation</h3>
            <p className="mt-2 leading-6 text-on-surface-variant">
              {String(
                detail.recommendation ??
                  detail.fixGuidance ??
                  "Review and remediate.",
              )}
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
      <div className="font-label-sm text-xs uppercase tracking-[0.14em] text-on-surface-variant">
        {label}
      </div>
      <div className="mt-2 leading-6">{value}</div>
    </div>
  );
}

function exportPdf(report: AuditReport) {
  const doc = new jsPDF();
  const margin = 16;
  let y = 18;

  doc.setFontSize(18);
  doc.text("RepoGuard AI Security Report", margin, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(`Repository: ${report.metadata.repoName}`, margin, y);
  y += 7;
  doc.text(`Generated: ${new Date(report.metadata.auditTimestamp).toUTCString()}`, margin, y);
  y += 7;
  doc.text(`Security score: ${report.securityScore}/100`, margin, y);
  y += 7;
  doc.text(`Risk level: ${report.riskLevel}`, margin, y);
  y += 10;
  doc.setFontSize(13);
  doc.text("Executive Summary", margin, y);
  y += 7;
  doc.setFontSize(10);
  const summary = doc.splitTextToSize(report.summary, 178);
  doc.text(summary, margin, y);
  y += summary.length * 5 + 8;

  doc.setFontSize(13);
  doc.text("Findings", margin, y);
  y += 7;
  doc.setFontSize(9);
  report.findings.slice(0, 18).forEach((finding, index) => {
    if (y > 270) {
      doc.addPage();
      y = 18;
    }
    doc.text(
      `${index + 1}. [${finding.severity.toUpperCase()}] ${finding.title} - ${finding.file}`,
      margin,
      y,
    );
    y += 5;
  });

  y += 5;
  doc.setFontSize(13);
  doc.text("Recommendations", margin, y);
  y += 7;
  doc.setFontSize(9);
  report.fixes.slice(0, 8).forEach((fix, index) => {
    if (y > 270) {
      doc.addPage();
      y = 18;
    }
    const text = doc.splitTextToSize(
      `${index + 1}. ${fix.vulnerability}: ${fix.secureFix}`,
      178,
    );
    doc.text(text, margin, y);
    y += text.length * 5 + 3;
  });

  doc.save(`${report.metadata.repoName}-security-report.pdf`);
}

export default function RepoGuardApp() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [activeReport, setActiveReport] = useState<AuditReport | null>(() => {
    const stored = loadStoredReports();
    return stored[0] ?? null;
  });
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  useEffect(() => {
    let mounted = true;

    async function verifySession() {
      if (!isSupabaseConfigured || !supabase) {
        if (!localStorage.getItem("repoguard-demo-user")) {
          router.replace("/auth");
          return;
        }
        if (mounted) setAuthReady(true);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth");
        return;
      }

      if (mounted) setAuthReady(true);
    }

    void verifySession();

    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/auth");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  function loadSample() {
    const report = {
      ...sampleReport,
      id: `sample-${Date.now()}`,
      metadata: {
        ...sampleReport.metadata,
        auditTimestamp: new Date().toISOString(),
      },
    };
    saveReportForDashboard(report);
    setActiveReport(report);
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-background text-on-surface">
        <Header variant="dashboard" />
        <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
          <div className="inline-flex items-center gap-3 rounded-lg border border-outline-variant bg-white px-5 py-4 text-sm shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Preparing secure dashboard...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Header variant="dashboard" />

      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 lg:px-6">
        <section className="rounded-lg border border-outline-variant bg-white p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                Report dashboard
              </div>
              <h1 className="font-headline-lg text-3xl font-bold leading-tight md:text-4xl">
                Security audit report
              </h1>
              <p className="mt-3 max-w-3xl text-on-surface-variant">
                Review the latest RepoGuard AI analysis with severity metrics,
                finding details, remediation guidance, and export-ready reporting.
              </p>
            </div>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white"
              href="/connect_your_first_project"
            >
              <Plus className="h-4 w-4" />
              Analyze another project
            </Link>
          </div>
        </section>

        {activeReport ? (
          <>
            <section className="grid gap-6 xl:grid-cols-[320px_1fr]" id="reports">
              <div className="rounded-lg border border-outline-variant bg-white p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-headline-md text-xl font-semibold">
                      Security score
                    </h2>
                    <p className="text-sm text-on-surface-variant">
                      {activeReport.metadata.repoName}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {formatDate(activeReport.metadata.auditTimestamp)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${riskClasses(
                      activeReport.riskLevel,
                    )}`}
                  >
                    {activeReport.riskLevel}
                  </span>
                </div>
                <ScoreGauge score={activeReport.securityScore} />
                <p className="mt-4 text-sm leading-6 text-on-surface-variant">
                  {activeReport.summary}
                </p>
                <button
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold hover:bg-surface-container-lowest"
                  onClick={() => exportPdf(activeReport)}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid gap-3 md:grid-cols-4">
                  {(Object.keys(activeReport.severityBreakdown) as Severity[]).map(
                    (severity) => (
                      <div
                        className="rounded-lg border border-outline-variant bg-white p-4"
                        key={severity}
                      >
                        <div
                          className={`mb-3 inline-flex rounded-full border px-2 py-1 text-xs font-bold ${severityClasses(
                            severity,
                          )}`}
                        >
                          {severityCopy[severity]}
                        </div>
                        <div className="font-headline-lg text-3xl font-bold">
                          {activeReport.severityBreakdown[severity]}
                        </div>
                        <div className="text-xs text-on-surface-variant">
                          Findings
                        </div>
                      </div>
                    ),
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-lg border border-outline-variant bg-white p-5">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Vulnerability distribution
                    </h3>
                    <DistributionChart report={activeReport} />
                  </div>
                  <div className="rounded-lg border border-outline-variant bg-white p-5">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold">
                      <Filter className="h-4 w-4 text-primary" />
                      Severity profile
                    </h3>
                    <div className="flex h-48 items-end gap-4">
                      {(Object.keys(activeReport.severityBreakdown) as Severity[]).map(
                        (severity) => {
                          const count = activeReport.severityBreakdown[severity];
                          const height = Math.max(16, count * 14);
                          return (
                            <div
                              className="flex flex-1 flex-col items-center gap-2"
                              key={severity}
                            >
                              <div
                                className={`w-full rounded-t-lg border ${severityClasses(
                                  severity,
                                )}`}
                                style={{ height }}
                              />
                              <span className="text-xs font-medium">
                                {severityCopy[severity]}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <FindingsTable
              findings={activeReport.findings}
              onOpen={setSelectedFinding}
            />

            <section
              className="rounded-lg border border-outline-variant bg-white"
              id="recommendations"
            >
              <div className="border-b border-outline-variant p-4">
                <h2 className="flex items-center gap-2 font-headline-md text-xl font-semibold">
                  <Code2 className="h-5 w-5 text-primary" />
                  Fix recommendation center
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  AI-generated remediation plans with copy-ready code changes.
                </p>
              </div>
              <div className="grid gap-4 p-4 lg:grid-cols-2">
                {activeReport.fixes.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    No fix recommendations were returned for this scan.
                  </p>
                ) : null}
                {activeReport.fixes.map((fix, index) => (
                  <article
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
                    key={`${fix.vulnerability}-${index}`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{fix.vulnerability}</h3>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          <span className="rounded bg-white px-2 py-1 text-on-surface-variant">
                            Priority: {fix.priority}
                          </span>
                          <span className="rounded bg-white px-2 py-1 text-on-surface-variant">
                            Effort: {fix.effort}
                          </span>
                        </div>
                      </div>
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-white"
                        onClick={() => navigator.clipboard.writeText(fix.codeChange)}
                        title="Copy code change"
                        type="button"
                      >
                        <Clipboard className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm leading-6 text-on-surface-variant">
                      <strong className="text-on-surface">Root cause:</strong>{" "}
                      {fix.rootCause}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      <strong className="text-on-surface">Secure fix:</strong>{" "}
                      {fix.secureFix}
                    </p>
                    {fix.codeChange ? (
                      <pre className="mt-3 overflow-x-auto rounded-lg bg-[#0b1c30] p-3 text-xs text-teal-100">
                        <code>{fix.codeChange}</code>
                      </pre>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <EmptyState onDemo={loadSample} />
        )}
      </main>

      <FindingDrawer finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
    </div>
  );
}

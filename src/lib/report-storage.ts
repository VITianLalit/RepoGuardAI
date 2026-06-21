import type { AuditReport } from "@/lib/types";

export const REPORT_HISTORY_KEY = "repoguard-audit-history";

export function normalizeStoredReport(report: AuditReport): AuditReport {
  return {
    ...report,
    findings: report.findings.map((finding, index) => ({
      ...finding,
      id: finding.id ?? `stored-${index}`,
      status: finding.status ?? "open",
    })),
  };
}

export function loadStoredReports() {
  if (typeof window === "undefined") return [];

  try {
    const reports = JSON.parse(
      localStorage.getItem(REPORT_HISTORY_KEY) ?? "[]",
    ) as AuditReport[];
    return reports.map(normalizeStoredReport);
  } catch {
    return [];
  }
}

export function saveStoredReports(reports: AuditReport[]) {
  localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(reports.slice(0, 12)));
}

export function saveReportForDashboard(report: AuditReport) {
  const stored = loadStoredReports();
  const next = [report, ...stored.filter((item) => item.id !== report.id)];
  saveStoredReports(next);
  return next;
}

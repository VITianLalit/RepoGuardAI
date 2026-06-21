import type { AuditReport, Finding, Severity, SeverityBreakdown } from "@/lib/types";

const severities: Severity[] = ["critical", "high", "medium", "low"];
const responseWrappers = ["output", "response", "body", "data", "report", "result"];

function normalizeSeverity(value: unknown): Severity {
  const text = String(value ?? "low").toLowerCase();
  if (severities.includes(text as Severity)) return text as Severity;
  return "low";
}

function fallbackBreakdown(findings: Finding[]): SeverityBreakdown {
  return findings.reduce(
    (acc, finding) => {
      acc[finding.severity] += 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
}

export function normalizeAuditReport(raw: unknown, repoName: string): AuditReport {
  const source = unwrapAuditResponse(raw);
  const record = (source && typeof source === "object" ? source : {}) as Record<
    string,
    unknown
  >;

  const rawFindings = Array.isArray(record.findings) ? record.findings : [];
  const findings = rawFindings.map((item, index) => {
    const finding = (item && typeof item === "object" ? item : {}) as Record<
      string,
      unknown
    >;

    return {
      id: String(finding.id ?? `finding-${index + 1}`),
      category: String(finding.category ?? "Security Finding"),
      severity: normalizeSeverity(finding.severity),
      file: String(finding.file ?? "Unknown file"),
      title: String(finding.title ?? "Untitled finding"),
      description: String(finding.description ?? "No description was returned."),
      status: "open" as const,
      detail:
        finding.detail && typeof finding.detail === "object"
          ? (finding.detail as Finding["detail"])
          : undefined,
    };
  });

  const breakdownRecord =
    record.severityBreakdown && typeof record.severityBreakdown === "object"
      ? (record.severityBreakdown as Partial<Record<Severity, number>>)
      : fallbackBreakdown(findings);

  const severityBreakdown = {
    critical: Number(breakdownRecord.critical ?? 0),
    high: Number(breakdownRecord.high ?? 0),
    medium: Number(breakdownRecord.medium ?? 0),
    low: Number(breakdownRecord.low ?? 0),
  };

  const rawFixes = Array.isArray(record.fixes) ? record.fixes : [];

  return {
    id: `${repoName}-${Date.now()}`,
    metadata: {
      repoName: String(
        (record.metadata as { repoName?: unknown } | undefined)?.repoName ?? repoName,
      ),
      auditTimestamp: String(
        (record.metadata as { auditTimestamp?: unknown } | undefined)
          ?.auditTimestamp ?? new Date().toISOString(),
      ),
      agentsUsed: Array.isArray(
        (record.metadata as { agentsUsed?: unknown } | undefined)?.agentsUsed,
      )
        ? ((record.metadata as { agentsUsed?: string[] }).agentsUsed ?? [])
        : [],
      model: String(
        (record.metadata as { model?: unknown } | undefined)?.model ??
          "RepoGuard AI workflow",
      ),
    },
    projectContext:
      record.projectContext && typeof record.projectContext === "object"
        ? (record.projectContext as Record<string, unknown>)
        : {},
    securityScore: Number(record.securityScore ?? 0),
    riskLevel: String(record.riskLevel ?? "High"),
    severityBreakdown,
    summary: String(
      record.summary ??
        `${findings.length} security findings detected by the audit workflow.`,
    ),
    findings,
    fixes: rawFixes.map((item, index) => {
      const fix = (item && typeof item === "object" ? item : {}) as Record<
        string,
        unknown
      >;
      return {
        vulnerability: String(fix.vulnerability ?? `Recommendation ${index + 1}`),
        rootCause: String(fix.rootCause ?? "Root cause was not specified."),
        secureFix: String(fix.secureFix ?? fix.recommendation ?? "Review and remediate."),
        codeChange: String(fix.codeChange ?? ""),
        priority: String(fix.priority ?? "medium"),
        effort: String(fix.effort ?? "medium"),
        bestPractices: Array.isArray(fix.bestPractices)
          ? fix.bestPractices.map(String)
          : [],
      };
    }),
  };
}

export function unwrapAuditResponse(raw: unknown): unknown {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    try {
      return unwrapAuditResponse(JSON.parse(trimmed));
    } catch {
      return raw;
    }
  }

  if (Array.isArray(raw)) {
    return raw.length > 0 ? unwrapAuditResponse(raw[0]) : null;
  }

  if (!raw || typeof raw !== "object") return raw;

  const record = raw as Record<string, unknown>;

  for (const key of responseWrappers) {
    if (key in record) {
      const value = record[key];
      if (value !== undefined && value !== null && value !== "") {
        return unwrapAuditResponse(value);
      }
    }
  }

  return raw;
}

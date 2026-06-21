export type Severity = "critical" | "high" | "medium" | "low";

export type SourceFile = {
  path: string;
  content: string;
};

export type RepoSummary = {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  language: string | null;
  updatedAt: string;
  defaultBranch: string;
  htmlUrl: string;
};

export type SeverityBreakdown = Record<Severity, number>;

export type FindingDetail = {
  package?: string;
  installedVersion?: string;
  vulnerability?: string;
  cve?: string;
  severity?: Severity | string;
  recommendation?: string;
  upgradeVersion?: string;
  owaspId?: string;
  owaspCategory?: string;
  file?: string;
  description?: string;
  vulnerableCode?: string;
  businessImpact?: string;
  attackVector?: string;
  fixGuidance?: string;
  [key: string]: unknown;
};

export type Finding = {
  id?: string;
  category: string;
  severity: Severity;
  file: string;
  title: string;
  description: string;
  status?: "open" | "triaged" | "fixed" | "accepted";
  detail?: FindingDetail;
};

export type FixRecommendation = {
  vulnerability: string;
  rootCause: string;
  secureFix: string;
  codeChange: string;
  priority: Severity | string;
  effort: string;
  bestPractices?: string[];
};

export type AuditReport = {
  id: string;
  metadata: {
    repoName: string;
    auditTimestamp: string;
    agentsUsed?: string[];
    model?: string;
  };
  projectContext?: Record<string, unknown>;
  securityScore: number;
  riskLevel: "Critical" | "High" | "Medium" | "Low" | string;
  severityBreakdown: SeverityBreakdown;
  summary: string;
  findings: Finding[];
  fixes: FixRecommendation[];
};

export type AuditPayload = {
  repoName: string;
  files: SourceFile[];
};

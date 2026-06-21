import { supabase } from "@/lib/supabase";
import { normalizeStoredReport } from "@/lib/report-storage";
import type { AuditReport } from "@/lib/types";

export async function persistReportToSupabase(report: AuditReport) {
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase.from("audit_reports").insert({
    user_id: user.id,
    repo_name: report.metadata.repoName,
    security_score: report.securityScore,
    risk_level: report.riskLevel,
    report,
  });

  if (error) throw error;
}

export async function loadReportsFromSupabase() {
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("audit_reports")
    .select("report")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) throw error;
  return (data ?? []).map((row) =>
    normalizeStoredReport(row.report as AuditReport),
  );
}

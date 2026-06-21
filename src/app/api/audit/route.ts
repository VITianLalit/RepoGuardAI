import axios from "axios";
import {
  normalizeAuditReport,
  unwrapAuditResponse,
} from "@/lib/report-normalizer";
import type { AuditPayload } from "@/lib/types";

// Allow this route up to 3 minutes on Vercel (Pro/Edge) and Next.js serverless.
// Must be set at the module level as a named export.
export const maxDuration = 180;

const WEBHOOK_URL =
  process.env.REPOGUARD_AUDIT_WEBHOOK_URL ??
  "https://lucky930.app.n8n.cloud/webhook/repoguard-audit";

// Hard cap: send at most 15 files, each at most 8 000 chars — keeps payload < ~130 KB
const MAX_FILES = 15;
const MAX_CHARS_PER_FILE = 8_000;

// Total budget for the webhook call: 170 s — stays well under the 180 s route limit.
// n8n workflows typically finish in 1–3 minutes.
const WEBHOOK_TIMEOUT_MS = 170 * 1_000;

function trimPayload(payload: AuditPayload): AuditPayload {
  const trimmedFiles = payload.files.slice(0, MAX_FILES).map((f) => ({
    path: f.path,
    content:
      f.content.length > MAX_CHARS_PER_FILE
        ? f.content.slice(0, MAX_CHARS_PER_FILE) + "\n/* truncated */"
        : f.content,
  }));
  return { repoName: payload.repoName, files: trimmedFiles };
}

async function postWithTimeout(payload: AuditPayload): Promise<unknown> {
  try {
    const { data } = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      maxBodyLength: Infinity,
      timeout: WEBHOOK_TIMEOUT_MS,
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(
        `Audit workflow returned ${error.response.status}: ${JSON.stringify(
          error.response.data,
        )}`,
      );
    }
    if (axios.isAxiosError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const rawPayload = (await request.json()) as AuditPayload;

    if (!rawPayload.repoName || !Array.isArray(rawPayload.files)) {
      return Response.json(
        { error: "repoName and files are required." },
        { status: 400 },
      );
    }

    if (rawPayload.files.length === 0) {
      return Response.json(
        { error: "No security-relevant files were found for analysis." },
        { status: 422 },
      );
    }

    const payload = trimPayload(rawPayload);

    // ── 1. Try n8n webhook first ───────────────────────────────────────────
    try {
      const rawReport = await postWithTimeout(payload);

      const unwrappedReport = unwrapAuditResponse(rawReport);
      if (!unwrappedReport || typeof unwrappedReport !== "object") {
        throw new Error("Webhook returned non-object response — falling back.");
      }

      return Response.json(normalizeAuditReport(rawReport, payload.repoName));
    } catch (webhookError) {
      // Log server-side but do NOT expose the raw error to the browser client.
      const msg =
        webhookError instanceof Error
          ? webhookError.message
          : "Webhook request failed.";
      console.warn(
        `[RepoGuard] n8n webhook unavailable (${msg}). Falling back to local analysis engine.`,
      );
    }

    // ── 2. Local static analysis engine (zero external calls) ─────────────
    const { runLocalAnalysis } = await import("@/lib/local-analyzer");
    const localReport = runLocalAnalysis(payload);

    // Return 200 with the local report — client gets a real result, not an error
    return Response.json(localReport);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Audit workflow request failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}

import axios from "axios";
import {
  normalizeAuditReport,
  unwrapAuditResponse,
} from "@/lib/report-normalizer";
import type { AuditPayload } from "@/lib/types";

const WEBHOOK_URL =
  process.env.REPOGUARD_AUDIT_WEBHOOK_URL ??
  "https://lucky930.app.n8n.cloud/webhook/repoguard-audit";

// Hard cap: send at most 15 files, each at most 8 000 chars — keeps payload < ~130 KB
const MAX_FILES = 15;
const MAX_CHARS_PER_FILE = 8_000;

// Total budget for the request: 4 minutes. n8n workflows can take 2-3 min.
const WEBHOOK_TIMEOUT_MS = 4 * 60 * 1_000;

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

    let rawReport: unknown;
    try {
      rawReport = await postWithTimeout(payload);
    } catch (webhookError) {
      const message =
        webhookError instanceof Error
          ? webhookError.message
          : "Audit webhook request failed.";
      return Response.json({ error: message }, { status: 502 });
    }

    const unwrappedReport = unwrapAuditResponse(rawReport);

    if (!unwrappedReport || typeof unwrappedReport !== "object") {
      return Response.json(
        {
          error:
            "Audit workflow did not return valid JSON. Check the n8n Respond-to-Webhook node output.",
        },
        { status: 502 },
      );
    }

    return Response.json(normalizeAuditReport(rawReport, payload.repoName));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Audit workflow request failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}

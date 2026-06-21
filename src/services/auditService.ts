import axios from "axios";
import type { AuditPayload, AuditReport } from "@/lib/types";

// 5 minutes — must exceed the server-side 4-minute webhook timeout
const CLIENT_TIMEOUT_MS = 5 * 60 * 1_000;

export async function requestAudit(payload: AuditPayload): Promise<AuditReport> {
  try {
    const { data } = await axios.post<AuditReport>("/api/audit", payload, {
      headers: { "Content-Type": "application/json" },
      timeout: CLIENT_TIMEOUT_MS,
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const serverMessage =
        typeof error.response?.data === "object" &&
        error.response?.data &&
        "error" in error.response.data
          ? String(error.response.data.error)
          : `Request failed: ${error.response?.status ?? "network error"}`;
      throw new Error(serverMessage);
    }
    throw error;
  }
}

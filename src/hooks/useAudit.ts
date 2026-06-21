"use client";

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { requestAudit } from "@/services/auditService";
import type { AuditPayload, AuditReport } from "@/lib/types";

export function useAudit(
  options?: UseMutationOptions<AuditReport, Error, AuditPayload>,
) {
  return useMutation<AuditReport, Error, AuditPayload>({
    mutationFn: requestAudit,
    ...options,
  });
}

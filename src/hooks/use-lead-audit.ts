"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  LEAD_AUDIT_PAGE_SIZE,
  createLeadAuditLead,
  deleteLeadAuditLead,
  getLeadAudit,
  getLeadAuditFieldOptions,
  importLeadAuditSpreadsheet,
  patchLeadAuditLead,
  validateAllLeadAudit,
  type CreateLeadAuditPayload,
  type PatchLeadAuditPayload,
} from "@/lib/lead-audit/api";

import { qk } from "./query-keys";

const LEAD_AUDIT_KEY = ["lead-audit"];

export function useLeadAudit(empreendimentoId: number | null, page: number) {
  return useQuery({
    queryKey: qk.leadAudit(empreendimentoId ?? -1, page),
    queryFn: () => getLeadAudit(empreendimentoId as number, page, LEAD_AUDIT_PAGE_SIZE),
    enabled: empreendimentoId != null,
  });
}

export function useLeadAuditFieldOptions() {
  return useQuery({
    queryKey: ["lead-audit-field-options"],
    queryFn: () => getLeadAuditFieldOptions(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useImportLeadAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { file: File; empreendimento_id: number }) =>
      importLeadAuditSpreadsheet(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEAD_AUDIT_KEY }),
  });
}

export function usePatchLeadAuditLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PatchLeadAuditPayload }) =>
      patchLeadAuditLead(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEAD_AUDIT_KEY }),
  });
}

export function useCreateLeadAuditLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeadAuditPayload) => createLeadAuditLead(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEAD_AUDIT_KEY }),
  });
}

export function useDeleteLeadAuditLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLeadAuditLead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEAD_AUDIT_KEY }),
  });
}

export function useValidateAllLeadAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (empreendimentoId: number) => validateAllLeadAudit(empreendimentoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEAD_AUDIT_KEY }),
  });
}

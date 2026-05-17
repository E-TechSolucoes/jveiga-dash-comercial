"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createLead,
  deleteLead,
  getOutboundWeek,
  importLeadsSpreadsheet,
  patchLead,
  upsertCost,
  validateAllLeads,
  validateCost,
  type CreateLeadPayload,
  type PatchLeadPayload,
  type UpsertCostPayload,
} from "@/lib/outbound/api";

import { qk } from "./query-keys";

const OUTBOUND_WEEK_KEY = ["outbound-week"];

export function useOutboundWeek(weekStart: string, empreendimentoId: number | null) {
  return useQuery({
    queryKey: qk.outboundWeek(weekStart, empreendimentoId ?? -1),
    queryFn: () => getOutboundWeek(weekStart, empreendimentoId as number),
    enabled: weekStart.length > 0 && empreendimentoId != null,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeadPayload) => createLead(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: OUTBOUND_WEEK_KEY }),
  });
}

export function useImportLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      file: File;
      action_id: string;
      week_start: string;
      empreendimento_id: number;
      weekday?: number;
      local?: string;
    }) => importLeadsSpreadsheet(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: OUTBOUND_WEEK_KEY }),
  });
}

export function usePatchLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PatchLeadPayload }) =>
      patchLead(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: OUTBOUND_WEEK_KEY }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: OUTBOUND_WEEK_KEY }),
  });
}

export function useValidateAllLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      weekStart,
      empreendimentoId,
    }: {
      weekStart: string;
      empreendimentoId: number;
    }) => validateAllLeads(weekStart, empreendimentoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: OUTBOUND_WEEK_KEY }),
  });
}

export function useUpsertCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertCostPayload) => upsertCost(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: OUTBOUND_WEEK_KEY }),
  });
}

export function useValidateCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => validateCost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: OUTBOUND_WEEK_KEY }),
  });
}

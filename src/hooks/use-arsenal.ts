"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createFieldBroker,
  deleteFieldBroker,
  getArsenalWeek,
  patchFieldBroker,
  putBrokerStats,
  unvalidateExecution,
  upsertExecution,
  validateExecution,
  type BrokerStatsPayload,
  type CreateBrokerPayload,
  type PatchBrokerPayload,
  type UpsertExecutionPayload,
} from "@/lib/arsenal/api";

import { qk } from "./query-keys";

const ARSENAL_WEEK_KEY = ["arsenal-week"];

export function useArsenalWeek(weekStart: string, empreendimentoId: number | null) {
  return useQuery({
    queryKey: qk.arsenalWeek(weekStart, empreendimentoId ?? -1),
    queryFn: () => getArsenalWeek(weekStart, empreendimentoId as number),
    enabled: weekStart.length > 0 && empreendimentoId != null,
  });
}

export function useCreateFieldBroker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBrokerPayload) => createFieldBroker(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ARSENAL_WEEK_KEY }),
  });
}

export function usePatchFieldBroker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PatchBrokerPayload }) =>
      patchFieldBroker(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ARSENAL_WEEK_KEY }),
  });
}

export function useDeleteFieldBroker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFieldBroker(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ARSENAL_WEEK_KEY }),
  });
}

export function usePutBrokerStats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ brokerId, payload }: { brokerId: string; payload: BrokerStatsPayload }) =>
      putBrokerStats(brokerId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ARSENAL_WEEK_KEY }),
  });
}

export function useUpsertExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      actionId: string;
      weekStart: string;
      weekday: number;
      empreendimentoId: number;
      payload: UpsertExecutionPayload;
    }) =>
      upsertExecution(
        args.actionId,
        args.weekStart,
        args.weekday,
        args.empreendimentoId,
        args.payload,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ARSENAL_WEEK_KEY }),
  });
}

export function useValidateExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (executionId: string) => validateExecution(executionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ARSENAL_WEEK_KEY }),
  });
}

export function useUnvalidateExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (executionId: string) => unvalidateExecution(executionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ARSENAL_WEEK_KEY }),
  });
}

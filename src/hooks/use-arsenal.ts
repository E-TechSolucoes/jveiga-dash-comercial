"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addBrokerToWeek,
  createFieldBroker,
  getArsenalWeek,
  listGlobalBrokers,
  patchFieldBroker,
  putBrokerStats,
  removeBrokerFromWeek,
  unvalidateExecution,
  upsertExecution,
  validateExecution,
  type AddBrokerToWeekPayload,
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

/** Criar/editar um corretor global muda o broker_count derivado das
 * imobiliárias e o cadastro global — revalida essas queries também. */
function invalidateBrokerDependents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ARSENAL_WEEK_KEY });
  qc.invalidateQueries({ queryKey: qk.agencies() });
  qc.invalidateQueries({ queryKey: ["agency-field-brokers"] });
  qc.invalidateQueries({ queryKey: ["global-brokers"] });
}

export function useCreateFieldBroker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBrokerPayload) => createFieldBroker(payload),
    onSuccess: () => invalidateBrokerDependents(qc),
  });
}

export function usePatchFieldBroker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PatchBrokerPayload }) =>
      patchFieldBroker(id, payload),
    onSuccess: () => invalidateBrokerDependents(qc),
  });
}

/** Lista o cadastro global de corretores para o seletor de adição à semana. */
export function useGlobalBrokers(q: string) {
  return useQuery({
    queryKey: qk.globalBrokers(q),
    queryFn: () => listGlobalBrokers(q),
  });
}

export function useAddBrokerToWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddBrokerToWeekPayload) => addBrokerToWeek(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ARSENAL_WEEK_KEY }),
  });
}

export function useRemoveBrokerFromWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (weeklyId: string) => removeBrokerFromWeek(weeklyId),
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

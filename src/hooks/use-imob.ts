"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAgency,
  deleteAgency,
  getAgencyFieldBrokers,
  listAgencies,
  patchAgency,
  validateAllAgencies,
  type CreateAgencyPayload,
  type PatchAgencyPayload,
} from "@/lib/imob/api";

import { qk } from "./query-keys";

const AGENCIES_KEY = qk.agencies();

export function useAgencies() {
  return useQuery({
    queryKey: AGENCIES_KEY,
    queryFn: () => listAgencies(),
  });
}

/** Busca os field brokers de uma imobiliária — lazy, só quando `enabled`. */
export function useAgencyFieldBrokers(agencyId: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.agencyFieldBrokers(agencyId),
    queryFn: () => getAgencyFieldBrokers(agencyId),
    enabled,
  });
}

export function useCreateAgency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAgencyPayload) => createAgency(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENCIES_KEY }),
  });
}

export function usePatchAgency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PatchAgencyPayload }) =>
      patchAgency(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENCIES_KEY }),
  });
}

export function useDeleteAgency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAgency(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENCIES_KEY }),
  });
}

export function useValidateAllAgencies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => validateAllAgencies(),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENCIES_KEY }),
  });
}

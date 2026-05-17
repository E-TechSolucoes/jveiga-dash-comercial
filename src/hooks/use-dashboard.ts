"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  getConversaoHistorica,
  getFunil,
  getPastasKpis,
  getPastasList,
  getRecep,
  getSalesPlanByMonth,
  getTaxas,
} from "@/lib/dashboard/api";

import { qk } from "./query-keys";

type PeriodBounds = { from: string; to: string } | null;

export function useSalesPlan(year: number, month: number) {
  return useQuery({
    queryKey: qk.salesPlan(year, month),
    queryFn: ({ signal }) => getSalesPlanByMonth(year, month, signal),
  });
}

export function useTaxas(codigos: string[], nomes: string[]) {
  return useQuery({
    queryKey: qk.taxas(codigos.join(","), nomes.join("||")),
    queryFn: ({ signal }) => getTaxas(codigos, nomes, signal),
    enabled: nomes.length > 0,
  });
}

export function useFunil(codigos: string[], nomes: string[], periodBounds: PeriodBounds) {
  return useQuery({
    queryKey: qk.funil(
      codigos.join(","),
      nomes.join("||"),
      periodBounds?.from ?? "",
      periodBounds?.to ?? "",
    ),
    queryFn: ({ signal }) => getFunil(codigos, nomes, periodBounds!.from, periodBounds!.to, signal),
    enabled: nomes.length > 0 && periodBounds != null,
  });
}

export function usePastasKpis(nomes: string[], codigos: string[], periodBounds: PeriodBounds) {
  return useQuery({
    queryKey: qk.pastasKpis(
      codigos.join(","),
      nomes.join("||"),
      periodBounds?.from ?? "",
      periodBounds?.to ?? "",
    ),
    queryFn: ({ signal }) =>
      getPastasKpis(nomes, codigos, periodBounds!.from, periodBounds!.to, signal),
    enabled: nomes.length > 0 && periodBounds != null,
  });
}

export function usePastasList(
  nomes: string[],
  codigos: string[],
  periodBounds: PeriodBounds,
  page: number,
) {
  return useQuery({
    queryKey: qk.pastasList(
      codigos.join(","),
      nomes.join("||"),
      periodBounds?.from ?? "",
      periodBounds?.to ?? "",
      page,
    ),
    queryFn: ({ signal }) =>
      getPastasList(nomes, codigos, periodBounds!.from, periodBounds!.to, page, signal),
    enabled: nomes.length > 0 && periodBounds != null,
    placeholderData: keepPreviousData,
  });
}

export function useRecep(nomes: string[]) {
  return useQuery({
    queryKey: qk.recep(nomes.join("||")),
    queryFn: ({ signal }) => getRecep(nomes, signal),
    enabled: nomes.length > 0,
  });
}

export function useConversaoHistorica(codigo: string, nome: string) {
  return useQuery({
    queryKey: qk.conversaoHistorica(codigo, nome),
    queryFn: ({ signal }) => getConversaoHistorica(codigo, nome, signal),
    enabled: nome.trim().length > 0,
  });
}

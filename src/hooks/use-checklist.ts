"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchAwardCheckItemsToday,
  replaceAwardCheckActivity,
  type ReplaceAwardCheckActivityBody,
} from "@/app/(dashboard)/dashboard/checklist/_components/check-items-award-activity";
import {
  fetchDailyCheckItemsToday,
  replaceDailyCheckActivity,
  type ReplaceDailyCheckActivityBody,
} from "@/app/(dashboard)/dashboard/checklist/_components/check-items-daily-activity";
import { fetchPremiacoesCategories } from "@/app/(dashboard)/dashboard/checklist/_components/premiacoes-categories";
import {
  fetchStandCheckItemsToday,
  replaceStandCheckActivity,
  type ReplaceStandCheckActivityBody,
} from "@/app/(dashboard)/dashboard/checklist/_components/stand-check-activity";

import { qk } from "./query-keys";

const STAND_KEY = ["stand-check-items"];
const DAILY_KEY = ["daily-check-items"];
const AWARD_KEY = ["award-check-items"];

export function useStandCheckItems(empreendimentoIds: number[], enabled: boolean) {
  return useQuery({
    queryKey: qk.standCheckItems(empreendimentoIds.join(",")),
    queryFn: ({ signal }) =>
      fetchStandCheckItemsToday(empreendimentoIds.length > 0 ? empreendimentoIds : null, signal),
    enabled,
  });
}

export function useDailyCheckItems(empreendimentoIds: number[], enabled: boolean) {
  return useQuery({
    queryKey: qk.dailyCheckItems(empreendimentoIds.join(",")),
    queryFn: ({ signal }) =>
      fetchDailyCheckItemsToday(empreendimentoIds.length > 0 ? empreendimentoIds : null, signal),
    enabled,
  });
}

export function useAwardCheckItems(empreendimentoIds: number[], enabled: boolean) {
  return useQuery({
    queryKey: qk.awardCheckItems(empreendimentoIds.join(",")),
    queryFn: ({ signal }) =>
      fetchAwardCheckItemsToday(empreendimentoIds.length > 0 ? empreendimentoIds : null, signal),
    enabled,
  });
}

export function usePremiacoesCategories(empreendimentoId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: qk.premiacoesCategories(empreendimentoId ?? -1),
    queryFn: ({ signal }) => fetchPremiacoesCategories(empreendimentoId as number, signal),
    enabled: enabled && empreendimentoId != null,
  });
}

export function useReplaceStandCheckActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReplaceStandCheckActivityBody) => replaceStandCheckActivity(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: STAND_KEY }),
  });
}

export function useReplaceDailyCheckActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReplaceDailyCheckActivityBody) => replaceDailyCheckActivity(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: DAILY_KEY }),
  });
}

export function useReplaceAwardCheckActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReplaceAwardCheckActivityBody) => replaceAwardCheckActivity(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: AWARD_KEY }),
  });
}

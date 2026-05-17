import { apiFetch } from "@/lib/auth";

export type StandCheckItemWithCheck = {
  // catálogo
  id: string;
  code: string;
  label: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // estado mesclado (server-side, regra ALL-must-agree entre os
  // empreendimentos selecionados) + flag de divergência.
  is_checked: boolean;
  checked_at: string | null;
  note: string | null;
  divergent: boolean;
};

export type ReplaceStandCheckActivityBody = {
  // user_id NÃO entra no body — o backend resolve pelo JWT.
  // empreendimento_ids: array obrigatório (≥ 1, todos > 0). O backend grava
  // uma linha por estande com o mesmo `items` (fan-out) e devolve a visão
  // já mesclada pra UI atualizar checked + divergent sem novo round-trip.
  empreendimento_ids: number[];
  day?: string;
  items: Array<{
    item_id: string;
    is_checked: boolean;
    note?: string;
  }>;
};

export type StandCheckActivityDayItem = {
  item: {
    id: string;
    code: string;
    label: string;
    icon_name: string;
    display_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  is_checked: boolean;
  checked_at: string | null;
  note: string | null;
  divergent: boolean;
};

export type StandCheckActivityDayView = {
  empreendimento_ids: number[];
  day: string;
  total_items: number;
  checked_count: number;
  items: StandCheckActivityDayItem[];
};

function appendEmpreendimentoIDs(qs: URLSearchParams, ids: number[] | null): void {
  if (!ids || ids.length === 0) return;
  qs.set("empreendimento_ids", ids.join(","));
}

export async function fetchStandCheckItemsToday(
  empreendimentoIds: number[] | null,
  signal?: AbortSignal,
): Promise<StandCheckItemWithCheck[]> {
  // Catálogo é GLOBAL. empreendimento_ids (opcional, CSV) dispara o merge
  // com as linhas de stand_check_activity das (empreendimento, hoje),
  // aplica ALL-must-agree e popula is_checked/checked_at/note + divergent.
  const qs = new URLSearchParams();
  appendEmpreendimentoIDs(qs, empreendimentoIds);
  const path = qs.toString()
    ? `/api/v1/stand-check-items?${qs.toString()}`
    : "/api/v1/stand-check-items";
  return apiFetch<StandCheckItemWithCheck[]>(path, { signal });
}

export async function replaceStandCheckActivity(
  body: ReplaceStandCheckActivityBody,
): Promise<StandCheckActivityDayView> {
  return apiFetch<StandCheckActivityDayView>("/api/v1/stand-check-activity", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function formatDayLabel(dayIso: string): string {
  const d = new Date(dayIso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

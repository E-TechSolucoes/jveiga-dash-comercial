import { apiFetch } from "@/lib/auth";

export type DailyCheckItemWithCheck = {
  id: string;
  code: string;
  label: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // estado mesclado entre os empreendimentos selecionados (ALL-must-agree)
  // + flag de divergência.
  is_checked: boolean;
  checked_at: string | null;
  note: string | null;
  divergent: boolean;
};

export type ReplaceDailyCheckActivityBody = {
  // Array obrigatório (≥ 1, todos > 0). Backend grava uma linha por estande
  // e devolve a visão mesclada pra UI atualizar sem novo round-trip.
  empreendimento_ids: number[];
  day?: string;
  items: Array<{
    item_id: string;
    is_checked: boolean;
    note?: string;
  }>;
};

export type DailyCheckActivityDayItem = {
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

export type DailyCheckActivityDayView = {
  empreendimento_ids: number[];
  day: string;
  total_items: number;
  checked_count: number;
  items: DailyCheckActivityDayItem[];
};

function appendEmpreendimentoIDs(qs: URLSearchParams, ids: number[] | null): void {
  if (!ids || ids.length === 0) return;
  qs.set("empreendimento_ids", ids.join(","));
}

export async function fetchDailyCheckItemsToday(
  empreendimentoIds: number[] | null,
  signal?: AbortSignal,
): Promise<DailyCheckItemWithCheck[]> {
  // Catálogo é GLOBAL; empreendimento_ids (opcional, CSV) dispara o merge
  // com as linhas de check_items_daily_activity dos estandes selecionados.
  const qs = new URLSearchParams();
  appendEmpreendimentoIDs(qs, empreendimentoIds);
  const path = qs.toString()
    ? `/api/v1/check-items-daily?${qs.toString()}`
    : "/api/v1/check-items-daily";
  return apiFetch<DailyCheckItemWithCheck[]>(path, { signal });
}

export async function replaceDailyCheckActivity(
  body: ReplaceDailyCheckActivityBody,
): Promise<DailyCheckActivityDayView> {
  return apiFetch<DailyCheckActivityDayView>("/api/v1/check-items-daily-activity", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

import { apiFetch } from "@/lib/auth";

export type AwardCheckItemWithCheck = {
  id: string;
  code: string;
  label: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Estado mesclado entre os empreendimentos selecionados (ALL-must-agree)
  // + flag de divergência. Após o refactor de 2026-05-12, a premiação é
  // compartilhada por estande (não mais ritual pessoal).
  is_checked: boolean;
  checked_at: string | null;
  note: string | null;
  divergent: boolean;
};

export type ReplaceAwardCheckActivityBody = {
  // Array obrigatório (≥ 1, todos > 0). Backend grava uma linha por estande
  // e devolve a visão mesclada — UI atualiza checked + divergent sem novo GET.
  empreendimento_ids: number[];
  day?: string;
  items: Array<{
    item_id: string;
    is_checked: boolean;
    note?: string;
  }>;
};

export type AwardCheckActivityDayItem = {
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

export type AwardCheckActivityDayView = {
  empreendimento_ids: number[];
  day: string;
  total_items: number;
  checked_count: number;
  items: AwardCheckActivityDayItem[];
};

function appendEmpreendimentoIDs(qs: URLSearchParams, ids: number[] | null): void {
  if (!ids || ids.length === 0) return;
  qs.set("empreendimento_ids", ids.join(","));
}

export async function fetchAwardCheckItemsToday(
  empreendimentoIds: number[] | null,
  signal?: AbortSignal,
): Promise<AwardCheckItemWithCheck[]> {
  // Catálogo GLOBAL; empreendimento_ids (opcional, CSV) dispara o merge
  // com as linhas de check_items_award_activity dos estandes selecionados.
  const qs = new URLSearchParams();
  appendEmpreendimentoIDs(qs, empreendimentoIds);
  const path = qs.toString()
    ? `/api/v1/check-items-award?${qs.toString()}`
    : "/api/v1/check-items-award";
  return apiFetch<AwardCheckItemWithCheck[]>(path, { signal });
}

export async function replaceAwardCheckActivity(
  body: ReplaceAwardCheckActivityBody,
): Promise<AwardCheckActivityDayView> {
  return apiFetch<AwardCheckActivityDayView>("/api/v1/check-items-award-activity", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

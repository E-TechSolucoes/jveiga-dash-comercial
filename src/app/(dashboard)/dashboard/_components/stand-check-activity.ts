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

  // estado de hoje (server-side)
  is_checked: boolean;
  checked_at: string | null;
  note: string | null;
};

export type ReplaceStandCheckActivityBody = {
  // user_id NÃO entra no body — o backend resolve pelo JWT.
  // empreendimento_id é OBRIGATÓRIO no stand: a chave passa de
  // (user_id, day) para (user_id, empreendimento_id, day), permitindo
  // que o mesmo usuário tenha checklists independentes por empreendimento
  // no mesmo dia.
  empreendimento_id: number;
  day?: string;
  items: Array<{
    item_id: string;
    is_checked: boolean;
    note?: string;
  }>;
};

export type StandCheckActivityEntry = {
  item_id: string;
  is_checked: boolean;
  checked_at: string | null;
  note: string | null;
};

export type StandCheckActivity = {
  id: string;
  user_id: string;
  day: string;
  items: StandCheckActivityEntry[];
  created_at: string;
  updated_at: string;
};

export async function fetchStandCheckItemsToday(
  empreendimentoId: number,
  signal?: AbortSignal,
): Promise<StandCheckItemWithCheck[]> {
  // empreendimento_id é obrigatório; o backend já filtra is_active=true
  // e usa hoje (BR) automaticamente.
  const qs = new URLSearchParams({ empreendimento_id: String(empreendimentoId) });
  return apiFetch<StandCheckItemWithCheck[]>(`/api/v1/stand-check-items?${qs.toString()}`, {
    signal,
  });
}

export async function replaceStandCheckActivity(
  body: ReplaceStandCheckActivityBody,
): Promise<StandCheckActivity> {
  return apiFetch<StandCheckActivity>("/api/v1/stand-check-activity", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function formatDayLabel(dayIso: string): string {
  const d = new Date(dayIso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

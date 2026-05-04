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

  is_checked: boolean;
  checked_at: string | null;
  note: string | null;
};

export type ReplaceAwardCheckActivityBody = {
  day?: string;
  items: Array<{
    item_id: string;
    is_checked: boolean;
    note?: string;
  }>;
};

export type AwardCheckActivityEntry = {
  item_id: string;
  is_checked: boolean;
  checked_at: string | null;
  note: string | null;
};

export type AwardCheckActivity = {
  id: string;
  user_id: string;
  day: string;
  items: AwardCheckActivityEntry[];
  created_at: string;
  updated_at: string;
};

export async function fetchAwardCheckItemsToday(
  empreendimentoId: number,
  signal?: AbortSignal,
): Promise<AwardCheckItemWithCheck[]> {
  const qs = new URLSearchParams({ empreendimento_id: String(empreendimentoId) });
  return apiFetch<AwardCheckItemWithCheck[]>(`/api/v1/check-items-award?${qs.toString()}`, {
    signal,
  });
}

export async function replaceAwardCheckActivity(
  body: ReplaceAwardCheckActivityBody,
): Promise<AwardCheckActivity> {
  return apiFetch<AwardCheckActivity>("/api/v1/check-items-award-activity", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

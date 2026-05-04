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

  is_checked: boolean;
  checked_at: string | null;
  note: string | null;
};

export type ReplaceDailyCheckActivityBody = {
  empreendimento_id: number;
  day?: string;
  items: Array<{
    item_id: string;
    is_checked: boolean;
    note?: string;
  }>;
};

export type DailyCheckActivityEntry = {
  item_id: string;
  is_checked: boolean;
  checked_at: string | null;
  note: string | null;
};

export type DailyCheckActivity = {
  id: string;
  user_id: string;
  day: string;
  items: DailyCheckActivityEntry[];
  created_at: string;
  updated_at: string;
};

export async function fetchDailyCheckItemsToday(
  empreendimentoId: number | null,
  signal?: AbortSignal,
): Promise<DailyCheckItemWithCheck[]> {
  // Catálogo é GLOBAL; empreendimento_id (opcional) só dispara o merge com
  // a linha de check_items_daily_activity de (empreendimento, hoje).
  const path =
    empreendimentoId == null
      ? "/api/v1/check-items-daily"
      : `/api/v1/check-items-daily?empreendimento_id=${empreendimentoId}`;
  return apiFetch<DailyCheckItemWithCheck[]>(path, { signal });
}

export async function replaceDailyCheckActivity(
  body: ReplaceDailyCheckActivityBody,
): Promise<DailyCheckActivity> {
  return apiFetch<DailyCheckActivity>("/api/v1/check-items-daily-activity", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

import { apiFetch } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const TOKEN_KEY = "auth.token";

function readBearer(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

async function authedRequest<T>(path: string, init: RequestInit): Promise<T> {
  const token = readBearer();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const r = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!r.ok) {
    const body = await r.json().catch(() => null);
    const msg =
      (body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : null) ?? `HTTP ${r.status} ${r.statusText}`.trim();
    throw new Error(msg);
  }
  if (r.status === 204) return null as T;
  return (await r.json()) as T;
}

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
  signal?: AbortSignal,
): Promise<DailyCheckItemWithCheck[]> {
  return apiFetch<DailyCheckItemWithCheck[]>("/api/v1/check-items-daily", {
    signal,
  });
}

export async function replaceDailyCheckActivity(
  body: ReplaceDailyCheckActivityBody,
): Promise<DailyCheckActivity> {
  return authedRequest<DailyCheckActivity>("/api/v1/check-items-daily-activity", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

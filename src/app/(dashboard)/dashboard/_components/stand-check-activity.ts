import { apiFetch } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const TOKEN_KEY = "auth.token";

function readBearer(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

// Fetch authed que NÃO redireciona em 401 — usado em ações onde queremos
// surfacing o erro (toast) em vez de empurrar o usuário pro /login.
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
  // Usa authedRequest em vez de apiFetch para NÃO redirecionar em 401 —
  // o erro precisa virar toast pro usuário ver o que aconteceu.
  return authedRequest<StandCheckActivity>("/api/v1/stand-check-activity", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function formatDayLabel(dayIso: string): string {
  const d = new Date(dayIso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

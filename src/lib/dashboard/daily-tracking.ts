import { apiFetch } from "@/lib/auth";

export const DAILY_TRACKING_INDICATORS = [
  "leads",
  "visitas",
  "pastas",
  "vendas",
  "jv",
  "parc",
] as const;

export type DailyTrackingIndicator = (typeof DAILY_TRACKING_INDICATORS)[number];

export type DailyTrackingStatus = "pending" | "editing" | "validated";

// Janela de 9 dias: Seg da semana (day_index 0) → Ter da semana seguinte
// (day_index 8). Grid completo = 6 indicadores × 9 dias = 54 células.
export type DailyTrackingDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type DailyTrackingDTO = {
  id: string;
  user_id: string;
  week_start: string;
  week_of_year: number;
  enterprise_code: string;
  enterprise_name: string | null;
  indicator: DailyTrackingIndicator;
  day_index: DailyTrackingDayIndex;
  day_date: string;
  value: number;
  status: DailyTrackingStatus;
  validated_at: string | null;
  validated_by: string | null;
  updated_at: string;
};

export type DailyTrackingWeekResponse = {
  week_start: string;
  week_of_year: number;
  enterprise_code: string;
  items: DailyTrackingDTO[];
};

export type UpsertDailyTrackingRequest = {
  week_start: string;
  enterprise_code: string;
  enterprise_name?: string | null;
  indicator: DailyTrackingIndicator;
  day_index: DailyTrackingDayIndex;
  value: number;
  status?: DailyTrackingStatus;
};

export type BulkUpsertDailyTrackingRequest = {
  items: UpsertDailyTrackingRequest[];
};

export type BulkUpsertDailyTrackingResponse = {
  upserted: number;
  items: DailyTrackingDTO[];
};

export type DailyTrackingApiError = {
  error: string;
  code?:
    | "BAD_REQUEST"
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INTERNAL_ERROR"
    | string;
  fields?: Record<string, string[]>;
};

export function isDailyTrackingApiError(value: unknown): value is DailyTrackingApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as DailyTrackingApiError).error === "string"
  );
}

const BULK_LIMIT = 1000;

/**
 * IMPORTANTE: o status final (`validated` vs `pending`) é decidido pelo
 * backend por **request**, contando se chegaram as 54 células distintas
 * (6 indicadores × 9 dias, Seg → Ter da semana seguinte) de uma
 * `(week_start, enterprise_code)`. Não fragmente um grid completo em
 * múltiplas chamadas — todas voltariam como `pending`.
 */

export function getDailyTrackingWeek(
  enterpriseCode: string,
  weekStart: string,
  signal?: AbortSignal,
): Promise<DailyTrackingWeekResponse> {
  const qs = new URLSearchParams({
    enterprise_code: enterpriseCode,
    week_start: weekStart,
  }).toString();
  return apiFetch<DailyTrackingWeekResponse>(`/api/v1/daily-tracking/week?${qs}`, { signal });
}

export function upsertDailyTrackingCell(
  req: UpsertDailyTrackingRequest,
): Promise<DailyTrackingDTO> {
  return apiFetch<DailyTrackingDTO>(`/api/v1/daily-tracking`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

export function bulkUpsertDailyTracking(
  items: UpsertDailyTrackingRequest[],
): Promise<BulkUpsertDailyTrackingResponse> {
  if (items.length > BULK_LIMIT) {
    return Promise.reject({
      error: `bulk upsert excede o limite de ${BULK_LIMIT} itens`,
      code: "BAD_REQUEST",
    } satisfies DailyTrackingApiError);
  }
  return apiFetch<BulkUpsertDailyTrackingResponse>(`/api/v1/daily-tracking/bulk`, {
    method: "PUT",
    body: JSON.stringify({ items } satisfies BulkUpsertDailyTrackingRequest),
  });
}

/**
 * Fallback (3.4 do doc) — usar `bulkUpsertDailyTracking` com 42 células
 * para o caminho normal de validação. Mantido aqui para overrides
 * cirúrgicos.
 */
export function validateDailyTrackingCell(id: string): Promise<DailyTrackingDTO> {
  return apiFetch<DailyTrackingDTO>(`/api/v1/daily-tracking/${encodeURIComponent(id)}/validate`, {
    method: "POST",
  });
}

/**
 * Fallback (3.5 do doc) — bulk reverte para `pending` automaticamente
 * quando o grid deixa de ter as 42 células.
 */
export function unvalidateDailyTrackingCell(id: string): Promise<DailyTrackingDTO> {
  return apiFetch<DailyTrackingDTO>(`/api/v1/daily-tracking/${encodeURIComponent(id)}/unvalidate`, {
    method: "POST",
  });
}

export function deleteDailyTrackingCell(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/daily-tracking/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ---- Helpers de data (ISO week / Monday) ----

export function isoMondayUtc(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = out.getUTCDay(); // 0=Dom..6=Sáb
  const delta = dow === 0 ? -6 : 1 - dow;
  out.setUTCDate(out.getUTCDate() + delta);
  return out;
}

export function formatYmdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Segunda-feira ISO da semana corrente em horário de São Paulo, formatada
 * como `YYYY-MM-DD`.
 */
export function currentWeekStartIsoMonday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const local = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  const monday = isoMondayUtc(local);
  return formatYmdUtc(monday);
}

export function describeApiError(err: unknown): string {
  if (isDailyTrackingApiError(err)) {
    if (err.fields) {
      const first = Object.entries(err.fields)[0];
      if (first) {
        const [field, msgs] = first;
        return `${field}: ${msgs?.[0] ?? err.error}`;
      }
    }
    return err.error;
  }
  if (err instanceof Error) return err.message;
  return "Erro inesperado ao comunicar com o servidor.";
}
